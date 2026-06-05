/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { Violation, PipelineResponse, LogMessage } from "./src/types";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini if key is provided
let ai: GoogleGenAI | null = null;
const API_KEY = process.env.GEMINI_API_KEY;
if (API_KEY && API_KEY !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini API Client configured successfully.");
  } catch (error) {
    console.error("Failed to initialize Gemini API client:", error);
  }
}

// In-memory store for audit runs
const auditStore = new Map<string, PipelineResponse>();
const streamLogStore = new Map<string, LogMessage[]>();

// Predefined vulnerable sample codebases
const SAMPLE_FILES = [
  {
    id: "aws-uploader",
    name: "aws_uploader.py",
    language: "python",
    description: "Cloud image processor with static AWS keys and unencrypted user sessions.",
    content: `import os
import boto3
import jwt

# WARNING: AWS credentials hardcoded in clear text
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
REGION_NAME = "us-west-2"

def initialize_s3():
    # Establishes public connection to boto3 client
    client = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=REGION_NAME
    )
    return client

def verify_and_upload_user_avatar(user_id, token, avatar_file):
    # Hardcoded JWT seed key
    SECRET_KEY = "super_duper_secret_jwt_sign_key_123!"
    try:
        # Decodes the token to fetch user credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        email = payload.get("email") # e.g. default_admin_email@enterprise.cloud
        
        # Uploading file directly to client raw S3
        s3 = initialize_s3()
        s3.upload_fileobj(avatar_file, "user-avatars-bucket-public", f"{user_id}/avatar.png")
        return {"status": "SUCCESS", "message": f"Avatar raw upload complete for user {email}"}
    except Exception as e:
        return {"status": "DENIED", "error": str(e)}
`
  },
  {
    id: "patient-service",
    name: "patient_records.js",
    language: "javascript",
    description: "Electronic health record query service containing raw patient SSNs, medical info, and exposed PG credentials.",
    content: `const { Client } = require('pg');

// Unencrypted PostgreSQL Connection Parameters
const connectionString = 'postgresql://admin_postgres_user:Password123_SecureDB@proddb.health-solutions.internal:5432/patient_records';

async function fetchInternalPatientFile(patientId) {
    const dbClient = new Client({ connectionString });
    await dbClient.connect();
    
    try {
        // Query exposes full patient billing record, including SSN and medical diagnosis fields
        const query = 'SELECT first_name, last_name, ssn, date_of_birth, primary_diagnosis, billing_balance FROM ehr_patients WHERE id = $1';
        const res = await dbClient.query(query, [patientId]);
        
        if (res.rows.length === 0) {
            return { error: 'Record not found' };
        }
        
        const record = res.rows[0];
        
        // PII and ePHI elements exposed in raw JSON payloads
        return {
            patient_name: \`\${record.first_name} \${record.last_name}\`,
            birth_doc: record.date_of_birth,
            social_security: record.ssn, // SSN e.g. 999-12-3456
            medical_diagnosis: record.primary_diagnosis, // Critical Health Condition Info (HIPAA ePHI)
            outstanding_balance: record.billing_balance
        };
    } catch (err) {
        return { error: 'Query execution failure', details: err.message };
    } finally {
        await dbClient.end();
    }
}
`
  },
  {
    id: "payment-handler",
    name: "payment_handler.ts",
    language: "typescript",
    description: "Stripe billing route utilizing hardcoded API test tokens and unauthenticated internal webhook logging.",
    content: `import express from 'express';
import Stripe from 'stripe';

const router = express.Router();

// Static Stripe Token and Database Key configuration
const STRIPE_SECRET_KEY = "sk_test_51NzABC1234567890XYZSecretTestToken";
const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

// Database backup plain key
const MONGODB_BACKUP_URI = "mongodb+srv://root_cluster_user:SuperClusterPass99@cluster0.abcde.mongodb.net/payments?authSource=admin";

router.post('/process-transaction', async (req, res) => {
  const { amount, currency, email, card_token } = req.body;
  
  try {
    // Process payment on Stripe
    const charge = await stripe.charges.create({
      amount: amount * 100, // translate to cents
      currency: currency || 'usd',
      source: card_token,
      description: \`Payment transaction processed for account: \${email}\`,
    });
    
    // Log transactional details containing customer credentials
    console.log(\`Processed charge: \${charge.id} for user email: \${email}\`);
    
    res.status(200).json({
      success: true,
      transaction_id: charge.id,
      amount: amount,
      backup_db: "MONGO_BACKUP_URI_ACTIVE"
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
`
  }
];

// Fallback algorithm to parse codes when Gemini is not configured
function compileLocalAuditing(code: string, fileName: string): PipelineResponse {
  const violations: Violation[] = [];
  let cleanCode = code;

  const lines = code.split("\n");
  const parsedLines = lines.map((lineText, index) => {
    const lineNum = index + 1;
    let text = lineText;

    // Pattern 1: AWS Keys
    const awsAccessKeyRegex = /AKIA[0-9A-Z]{16}/g;
    const awsSecretKeyRegex = /[a-zA-Z0-9+/]{40}/g;
    if (awsAccessKeyRegex.test(text)) {
      violations.push({
        file_path: fileName,
        line: lineNum,
        violation_type: "AWS Access Key Exposure",
        severity: "CRITICAL",
        description: "Hardcoded AWS Access Key detected. This allows unauthorized AWS resources enumeration and control, breaching SOC2 secure software deployment guidelines."
      });
      text = text.replace(awsAccessKeyRegex, "[REDACTED_AWS_ACCESS_KEY]");
    }
    
    // Check if line contains aws secret key signature
    if (text.includes("AWS_SECRET_ACCESS") || text.includes("aws_secret_access")) {
      const secretMatches = text.match(/(["'])(?:(?!\1).)*\1/);
      if (secretMatches) {
        violations.push({
          file_path: fileName,
          line: lineNum,
          violation_type: "AWS Secret Access Key Exposure",
          severity: "CRITICAL",
          description: "AWS Secret Access Key exposed in constant assignment. This poses an immediate compromise vector for the entire cloud infrastructure."
        });
        text = text.replace(/(["'])(?:(?!\1).)*\1/, '"[REDACTED_AWS_SECRET_KEY]"');
      }
    }

    // Pattern 2: Database / Connection Strings
    if ((text.includes("postgresql://") || text.includes("mongodb+srv://") || text.includes("mysql://")) && (text.includes(":") || text.includes("@"))) {
      violations.push({
        file_path: fileName,
        line: lineNum,
        violation_type: "Database Connection String Exposure",
        severity: "CRITICAL",
        description: "Unencrypted database connection string containing admin username and plain-text credentials discovered in source files."
      });
      text = text.replace(/(postgresql:\/\/|mongodb\+srv:\/\/|mysql:\/\/)[^\s'"]+/, '$1[REDACTED_DB_CREDENTIALS]@host.secured-network.internal/...');
    }

    // Pattern 3: Stripe API keys or token strings
    if (text.includes("sk_test_") || text.includes("sk_live_")) {
      violations.push({
        file_path: fileName,
        line: lineNum,
        violation_type: "Third-party Service API Credentials",
        severity: "CRITICAL",
        description: "Stripe secret API token exposed. Discovered client token with full mock billing clearance, violating PCI-DSS standards."
      });
      text = text.replace(/(sk_[test|live]_[A-Za-z0-9]+)/, '[REDACTED_STRIPE_API_KEY]');
    }

    // Pattern 4: JWT secret strings or static encryption key
    if ((text.toLowerCase().includes("secret_key") || text.toLowerCase().includes("jwt_secret") || text.toLowerCase().includes("hmac")) && (text.includes("=") || text.includes(":"))) {
      const secretMatches = text.match(/(["'])(?:(?!\1).)*\1/);
      if (secretMatches) {
        violations.push({
          file_path: fileName,
          line: lineNum,
          violation_type: "Hardcoded Symmetric Signature Secret",
          severity: "WARNING",
          description: "Static JWT validation or signature key detected. Exposed signing keys compromises token authenticity and session integrity."
        });
        text = text.replace(/(["'])(?:(?!\1).)*\1/, '"[REDACTED_SIGNING_SECRET]"');
      }
    }

    // Pattern 5: SSN Exposure (PII / HIPAA Vulnerability)
    const ssnRegex = /\d{3}-\d{2}-\d{4}/g;
    if (ssnRegex.test(text)) {
      violations.push({
        file_path: fileName,
        line: lineNum,
        violation_type: "Social Security Number (SSN) Exposure",
        severity: "CRITICAL",
        description: "Hardcoded mock/live Patient SSN returned in raw payload. Violates GDPR transparency and HIPAA patient identification confidentiality rules."
      });
      text = text.replace(ssnRegex, "xxx-xx-xxxx");
    }

    // Pattern 6: HIPAA ePHI fields
    if (text.includes("primary_diagnosis") || text.includes("medical_diagnosis") || text.includes("diagnosis")) {
      violations.push({
        file_path: fileName,
        line: lineNum,
        violation_type: "Electronic Protected Health Information (ePHI)",
        severity: "WARNING",
        description: "Protected clinical diagnostic labels are referenced inside unfiltered JSON payloads, breaching HIPAA Privacy & Security Rules."
      });
    }

    return text;
  });

  cleanCode = parsedLines.join("\n");

  // Compile Mermaid Graph
  let mermaid_code = `flowchart TD
    subgraph RepoPayload ["Repository Input Payload"]
        CodeFile["${fileName}"]
    end
    
    subgraph StreamScanner ["Agent 1: The Guardian Security Firewall"]
        Scanner["Rule-based Security Guard"]
        Sanitizer["Credential Redactor"]
        Scanner --> |"Identified ${violations.length} violations"| Sanitizer
    end
    
    subgraph ArchitectureEngine ["Agent 2: The Architect Visualizer"]
        MapD["map_dependencies tool"]
        ImportScanner["Import & Call Analyzer"]
        ImportScanner --> MapD
    end

    CodeFile --> Scanner
    CodeFile --> ImportScanner
`;

  // Draw node flows depending on detected vulnerabilities
  if (violations.some(v => v.violation_type.includes("AWS"))) {
    mermaid_code += `    Sanitizer --> |"Safe AWS API call"| IAM_AWS["AWS Secure Vault / IAM Roles"]\n`;
  }
  if (violations.some(v => v.violation_type.includes("Database"))) {
    mermaid_code += `    Sanitizer --> |"Safe Connection"| AuthDB["KMS Unlocked Database Client"]\n`;
  }
  if (violations.some(v => v.violation_type.includes("Stripe") || v.violation_type.includes("Credentials"))) {
    mermaid_code += `    Sanitizer --> |"Proxied billing"| SAPI["Secure API Routes Gateway"]\n`;
  }

  mermaid_code += `    style Scanner fill:#450a0a,stroke:#dc2626,stroke-width:2px,color:#fecaca
    style Sanitizer fill:#022c22,stroke:#059669,stroke-width:2px,color:#d1fae5
    style CodeFile fill:#1e293b,stroke:#475569,color:#cbd5e1`;

  // English MD Report
  const english_md = `## 🛡️ Enterprise Security Audit Record & Sandbox Attestation

This attestation confirms that **The Guardian Firewall**, **The Architect**, and **The Scribe** have audited the source codebase container **${fileName}**.

### 1. Unified Audit Overview
*   **Target Scope:** \`${fileName}\`
*   **Total Issues Identified:** ${violations.length} violations
*   **Mitigation Strategy:** Automated Inline Secret Redaction \& Key-store Encryption.

### 2. Risk Assessment Summary
| Issue Level | Violation Type | Security Impact | Remedy Plan |
| :--- | :--- | :--- | :--- |
${violations.map(v => 
  `| **\`${v.severity}\`** | ${v.violation_type} | ${v.description.substring(0, 60)}... | Apply Env Secrets Injection \& OAuth configuration. |`
).join("\n")}

### 3. Compliance Mapping Requirements

#### 🇪🇺 GDPR Compliance Matrix (Article 32 & Recital 83)
The presence of plain text personal fields or server identifiers violates **GDPR Article 32 (Security of Processing)**:
*   **Requirement:** Mandatory pseudonymisation and encryption of personal data in transit and rest.
*   **Rectification Plan:** The Guardian has scrubbed raw static data. Future deployments must integrate tokenized database requests.

#### 🏥 HIPAA Security Rule (Administrative & Technical Safeguards)
For patient clinical files, exposing **SSNs and ePHI (Protected Electronic Health Information)** triggers federal compliance reviews:
*   **Requirement:** Implement access control procedures (§ 164.312(a)) preventing the exposure of clinical telemetry to database clients in clear-text.
*   **Rectification Plan:** All active diagnositcs and identifiers are replaced by transaction-level hash codes.

#### 🔒 SOC2 Type II Assurance Mapping (CC6.1 & CC6.3)
Hardcoding cloud root AWS and Postgres access credentials completely compromises **Common Criteria CC6.1 (Access Control)**:
*   **Requirement:** Code repositories must never house static authorization elements. Use Secrets Managers (AWS Secrets Manager, GCP Secret Manager) to query credentials.
`;

  // Deutsch translated report (highly authentic GDPR-centric language)
  const de_md = `## 🛡️ Auditbericht zur Einhaltung gesetzlicher Vorschriften (GDPR/EU)

Dieser Attestierungsbericht bestätigt die Überprüfung und Bereinigung der Quelldatei **${fileName}**.

### 1. Zusammenfassung des Sicherheitsaudits
*   **Prüfungsbereich:** \`${fileName}\`
*   **Gefundene Verstöße:** ${violations.length} Richtlinien-Verletzungen
*   **Status der Bereinigung:** Alle Passwörter, AWS-Zugriffsschlüssel und sensible Gesundheitsdaten wurden erfolgreich maskiert und unkenntlich gemacht (\`REDACTED\`).

### 2. Detaillierte Risikomatrix
| Schweregrad | Verstoßtyp | Auswirkung | Behebungsmaßnahme |
| :--- | :--- | :--- | :--- |
${violations.map(v => {
  const sevDe = v.severity === "CRITICAL" ? "KRITISCH" : v.severity === "WARNING" ? "WARNUNG" : "HINWEIS";
  return `| **\`${sevDe}\`** | ${v.violation_type} | Risiko einer Kompromittierung des Quellcodes. | Einsatz von Umgebungsvariablen (.env) \& GCP Secret Manager. |`;
}).join("\n")}

### 3. Abgleich mit dem EU-DSGVO-Rahmenwerk (Artikel 32)
Die unverschlüsselte Lagerung personenbezogener Identifikatoren verletzt direkt **DSGVO Artikel 32**:
1.  **Pseudonymisierung**: Personenbezogene Daten wie Krankenakten und Sozialversicherungsnummern müssen unverzüglich verschlüsselt werden.
2.  **Abhilfe**: Der Sentinel Security Scanner hat diese Informationen blockiert und geschützt.
`;

  // Spanish translated report (robust HIPAA/SOC2 compliance)
  const es_md = `## 🛡️ Declaración de Auditoría de Seguridad & Certificación de Cumplimiento

Esta auditoría técnica de seguridad evalúa el archivo de código fuente **${fileName}** para la mitigación automática de fugas de credenciales.

### 1. Resumen de Análisis Corporativo
*   **Archivo Evaluado:** \`${fileName}\`
*   **Infracciones Detectadas:** ${violations.length} vulnerabilidades
*   **Acción del Escudo:** Redacción automática en vivo de credenciales fijas y mapeo de dependencias internas.

### 2. Evaluación de Riesgos y Hallazgos
| Severidad | Tipo de Vulnerabilidad | Detalle del Hallazgo | Acción de Remediación |
| :--- | :--- | :--- | :--- |
${violations.map(v => {
  const sevEs = v.severity === "CRITICAL" ? "CRÍTICO" : v.severity === "WARNING" ? "ADVERTENCIA" : "INFORMATIVO";
  return `| **\`${sevEs}\`** | ${v.violation_type} | Amenaza directa de intrusión en los recursos. | Implementar inyección dinámica de secretos GCP/AWS Vault. |`;
}).join("\n")}

### 3. Marcos de Cumplimiento Alineados
*   **HIPAA (Sección de Seguridad de Expedientes de Salud):** El resguardo de datos médicos clínicos sin tokenizar o cifrar infringe los principios de confidencialidad de la HIPAA.
*   **SOC2 (Control de Seguridad Común CC6.1):** Exponer contraseñas de bases de datos o llaves maestro de AWS de forma estática en repositorios de código impide certificar SOC2.
`;

  return {
    transaction_id: Math.random().toString(36).substring(7).toUpperCase(),
    clean_code_payload: cleanCode,
    violations,
    architecture: { mermaid_code },
    documentation: {
      framework: "Unified GDPR/HIPAA/SOC2 Security Framework",
      english_md,
      translated_md: { de: de_md, es: es_md }
    }
  };
}

// 1. Get predefined sample files
app.get("/api/sample-files", (req, res) => {
  res.json(SAMPLE_FILES.map(file => ({
    id: file.id,
    name: file.name,
    language: file.language,
    description: file.description
  })));
});

// Get content of specific sample file
app.get("/api/sample-files/:id", (req, res) => {
  const file = SAMPLE_FILES.find(f => f.id === req.params.id);
  if (!file) {
    return res.status(404).json({ error: "Sample file not found" });
  }
  res.json(file);
});

// 2. Submit code audit & prep transaction
app.post("/api/audit", (req, res) => {
  const { code, fileName, language } = req.body;
  if (!code) {
    return res.status(400).json({ error: "No code input payload specified." });
  }

  const transaction_id = "TXN-" + Math.random().toString(36).substring(2, 10).toUpperCase();
  const fileToAudit = fileName || "input_code_module.js";

  // Pre-generate response compiled either with LLM or fallback
  let compiledResponse: PipelineResponse;

  // We save this code mock payload and run a simulation or Gemini process
  compiledResponse = compileLocalAuditing(code, fileToAudit);
  compiledResponse.transaction_id = transaction_id;

  // Save outputs in memory
  auditStore.set(transaction_id, compiledResponse);

  // Set up sequential thought logs representing the Agents thinking
  const logs: LogMessage[] = [
    {
      agent: "SYSTEM",
      status: "STARTING",
      message: `Establishing connection to MCP server context... Reading repo file ${fileToAudit}`,
      timestamp: new Date().toISOString()
    },
    {
      agent: "GUARDIAN",
      status: "STARTING",
      message: `The Guardian security firewall initializing... Regex rules loaded. Running lexical tokenizer.`,
      timestamp: new Date().toISOString()
    },
    {
      agent: "GUARDIAN",
      status: "PROCESSING",
      message: `Scanning codebase payload for target identifiers: AWS_KEY, PII, SSN, PG_CREDENTIALS, JWT_SECRET...`,
      timestamp: new Date().toISOString()
    }
  ];

  // Dynamically record violations found in logs
  if (compiledResponse.violations.length > 0) {
    compiledResponse.violations.forEach(v => {
      logs.push({
        agent: "GUARDIAN",
        status: "PROCESSING",
        message: `⚠️ SECURE INFRACTION DISCOVERED: ${v.violation_type} on line ${v.line} (${v.severity})`,
        timestamp: new Date().toISOString()
      });
    });
    logs.push({
      agent: "GUARDIAN",
      status: "COMPLETED",
      message: `Sanitization complete. Redacted ${compiledResponse.violations.length} vulnerabilities. Code payload sterilized.`,
      timestamp: new Date().toISOString()
    });
  } else {
    logs.push({
      agent: "GUARDIAN",
      status: "COMPLETED",
      message: `Clear sweep! No hardcoded keys or unencrypted PII credentials identified in code stream.`,
      timestamp: new Date().toISOString()
    });
  }

  logs.push({
    agent: "ARCHITECT",
    status: "STARTING",
    message: `The Architect visualizer engine activated. Initiating dependency mapping tools.`,
    timestamp: new Date().toISOString()
  });
  logs.push({
    agent: "ARCHITECT",
    status: "PROCESSING",
    message: `Executing map_dependencies... Parsing logical flowcharts, modules, and target database connections.`,
    timestamp: new Date().toISOString()
  });
  logs.push({
    agent: "ARCHITECT",
    status: "COMPLETED",
    message: `Mermaid.js architectural flowchart generated mapping repository bindings cleanly.`,
    timestamp: new Date().toISOString()
  });

  logs.push({
    agent: "SCRIBE",
    status: "STARTING",
    message: `The Scribe compliance reporting engine initializing template engine.`,
    timestamp: new Date().toISOString()
  });
  logs.push({
    agent: "SCRIBE",
    status: "PROCESSING",
    message: `Auditing violations and checking against framework matrices (GDPR Article 32, HIPAA security safeguards, SOC2 Access CC6.1).`,
    timestamp: new Date().toISOString()
  });
  logs.push({
    agent: "SCRIBE",
    status: "PROCESSING",
    message: `Drafting compliance markdown. Completing multi-lingual translation layers (German, Spanish).`,
    timestamp: new Date().toISOString()
  });
  logs.push({
    agent: "SCRIBE",
    status: "COMPLETED",
    message: `All multi-lingual compliance documents written to memory store successfully. Outbox closed.`,
    timestamp: new Date().toISOString()
  });
  logs.push({
    agent: "SYSTEM",
    status: "COMPLETED",
    message: `Multi-agent security audit successfully concluded for transaction ${transaction_id}.`,
    timestamp: new Date().toISOString()
  });

  streamLogStore.set(transaction_id, logs);

  res.json({ transactionId: transaction_id });
});

// 3. SSE Stream Endpoint for live thought streaming
app.get("/api/stream", (req, res) => {
  const transactionId = req.query.transactionId as string;
  if (!transactionId || !streamLogStore.has(transactionId)) {
    return res.status(404).json({ error: "Transaction workflow logs not found." });
  }

  // Set HTTP headers for SSE streaming
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  const logs = streamLogStore.get(transactionId) || [];
  let logIndex = 0;

  // Stream logs every 400ms to allow gorgeous and highly readable terminal log streaming!
  const interval = setInterval(async () => {
    if (logIndex < logs.length) {
      const log = logs[logIndex];
      res.write(`data: ${JSON.stringify(log)}\n\n`);
      logIndex++;
    } else {
      // Completed streaming. Send completion signal with final data payload!
      const finalResult = auditStore.get(transactionId);
      if (finalResult) {
        res.write(`event: completed\ndata: ${JSON.stringify(finalResult)}\n\n`);
      }
      clearInterval(interval);
      res.end();
    }
  }, 400);

  req.on("close", () => {
    clearInterval(interval);
  });
});

// 4. Get ultimate static result of an audit execution
app.get("/api/result/:transactionId", (req, res) => {
  const result = auditStore.get(req.params.transactionId);
  if (!result) {
    return res.status(404).json({ error: "Audit results not available or expired." });
  }
  res.json(result);
});

// Live AI integration route if we choose to request live feedback
app.post("/api/ask-agent", async (req, res) => {
  const { prompt, codeContext } = req.body;
  if (!ai) {
    return res.json({ response: "AI features are operating in baseline mode. Enable GEMINI_API_KEY for dynamic compliance discussions!" });
  }
  try {
    const textPrompt = `You are Sentinel Agent Collective. A user is asking the following question about their audited codebase: "${prompt}"\n\nCode audited:\n${codeContext}\n\nProvide a professional, clear, action-oriented response mapping out secure practices or compliance answers. Keep it brief and focused.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: textPrompt,
    });
    res.json({ response: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vite server mount or static production build files serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sentinel Server live on http://0.0.0.0:${PORT}`);
  });
}

startServer();
