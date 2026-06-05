/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Violation {
  file_path: string;
  line: number;
  violation_type: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  description: string;
}

export interface ArchitectureMap {
  mermaid_code: string;
}

export interface ComplianceReport {
  framework: string;
  english_md: string;
  translated_md: {
    de: string;
    es: string;
  };
}

export interface PipelineResponse {
  transaction_id: string;
  clean_code_payload: string;
  violations: Violation[];
  architecture: ArchitectureMap;
  documentation: ComplianceReport;
}

export interface LogMessage {
  agent: "GUARDIAN" | "ARCHITECT" | "SCRIBE" | "SYSTEM";
  status: "STARTING" | "PROCESSING" | "COMPLETED" | "ERROR";
  message: string;
  timestamp: string;
}
