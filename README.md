# 🛡️ Sentinel Compliance

Sentinel Compliance is a high-performance, full-stack, multi-agent automated compliance auditing engine. Designed for security operators and sovereign enterprise layers, it leverages an interactive multi-agent workspace to capture, analyze, and neutralize static code vulnerabilities, credential leaks, and system misconfigurations in real time.

Structured on a reactive full-stack architecture running behind a reverse-proxy gateway, Sentinel coordinates three distinct, collaborative agents—**The Guardian**, **The Architect**, and **The Scribe**—to enforce SOC2, GDPR Art. 32, and HIPAA regulatory frameworks.
live demo: https://ai.studio/apps/1c9b0187-a4d0-4f8a-8c0f-cfc23d739d2c?fullscreenApplet=true

---

## 🌌 Core Agents & Workspace Architecture

Sovereign security is run asynchronously. Sentinel employs specialized agent roles to handle distinct auditing phases, piped directly to the user interface via highly responsive **Server-Sent Events (SSE)**.

### 🛡️ 1. The Guardian (The Diff Mitigation Agent)
- **Role**: Detects vulnerable patterns, API credentials, PII, and exposed connection blocks.
- **Execution**: Automatically parses incoming scripts and generates localized diff outputs indicating removals and safe replacements.
- **Output**: Full Side-by-Side and Unified Diff visualizers showing safe replacements.

### 📐 2. The Architect (The Topology Agent)
- **Role**: Inspects structure, dependencies, and flow layout topology.
- **Execution**: Map imports, endpoints, and external connections to construct interactive dependency blueprints.
- **Output**: Auto-rendered Mermaid.js pipeline architecture charts.

### ✍️ 3. The Scribe (The Compliance Readout Agent)
- **Role**: Resolves violations to legislative articles and translates compliance attestation blocks.
- **Execution**: Curates official reports mapped directly to regulatory guidelines in multiple languages.
- **Output**: Multilingual security audits (EN - GDPR, DE - DSGVO, ES - SOC2) and formal cryptographic corporate attestation certificates.

---

## 🎨 Design System & Elegant Theme

Sentinel is completely outfitted with an **Elegant Dark** theme—a high-density, high-contrast, professional control desk engineered with a slate canvas and pure structural alignment:

- **Typography**: Paired display typography styled for heavy scan-readability, accented by monospaced typography (`JetBrains Mono`) for system statistics, port metrics, and live log telemetry.
- **Visual Grid**: A modern bento-style workspace featuring containerized terminals, live action loggers, and fluid interactive tabs.
- **Micro-interactions**: Clean hover transitions, animated layout shifts, and active badge pulses indicating network availability.

---

## ⚙️ Stack & Infrastructure Constraints

The application respects strict enterprise container sandboxing policies:

- **Front-End**: React 18 with Vite, Tailwind CSS utility layers, and Lucide icons.
- **Back-End**: Node.js + Express with native CJS compile targets to bypass ES Module checks.
- **Networking**: Bound strictly to standard ingress **Port 3000** on host interface `0.0.0.0`.
- **Environment**: Secure lazy-initialization rules to prevent crash loops on undefined secrets.

---

## 🚀 Getting Started

Follow these instructions to run Sentinel Compliance locally or within Docker/Cloud containers.

### 1. Installation
Install project dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the template configuration and supply any necessary keys:
```bash
cp .env.example .env
```

### 3. Execution Commands

- **Development Server**: Starts both front-end Vite and the Express server concurrently via TypeScript:
  ```bash
  npm run dev
  ```
- **Build Target**: Compiles the front-end to standard static bundles and packs back-end modules cleanly:
  ```bash
  npm run build
  ```
- **Production Server**: Launches the bundled application:
  ```bash
  npm run start
  ```
- **Code Linter**: Validates code syntax and type constraints:
  ```bash
  npm run lint
  ```

---

## 📄 Licensing & Security SLA

Sentinel is designed with absolute local sovereignty. Workspace pipelines process files within closed sandbox environments, keeping vulnerable source scripts from ever being exposed to outer public analytics layers.
