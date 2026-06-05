/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Shield, HardDrive, Cpu, FileText, CheckCircle2 } from "lucide-react";

interface McpConduitGraphProps {
  activeAgent: "GUARDIAN" | "ARCHITECT" | "SCRIBE" | "SYSTEM" | "IDLE" | "COMPLETED";
}

export default function McpConduitGraph({ activeAgent }: McpConduitGraphProps) {
  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-5 relative overflow-hidden backdrop-blur-md">
      {/* Dynamic scan laser bar across the background when active */}
      {activeAgent !== "IDLE" && activeAgent !== "COMPLETED" && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent h-12 w-full animate-pulse pointer-events-none" />
      )}

      {/* Header Info */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-emerald-400 animate-pulse" />
          <h3 className="font-display font-semibold text-sm text-zinc-100 tracking-wide uppercase">
            Model Context Protocol & Multi-Agent Data Pipeline
          </h3>
        </div>
        <div className="flex items-center space-x-2 font-mono text-2xs">
          <span className="text-zinc-500">Conduit Protocol:</span>
          <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded tracking-widest font-bold">
            REST / SSE v2.1
          </span>
        </div>
      </div>

      {/* Network Schema */}
      <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6 p-4 border border-zinc-900 bg-zinc-900/10 rounded-lg">
        {/* Connection conduit connectors */}
        <div className="hidden md:block absolute top-[45%] left-0 w-full h-[2px] bg-gradient-to-r from-teal-500/20 via-emerald-500/20 to-indigo-500/20 z-0" />

        {/* Node 1: Raw Code Stream / MCP Repo */}
        <div className="relative z-10 flex flex-col items-center bg-zinc-950 p-4 border border-zinc-800/80 rounded-lg text-center shadow-lg transition-all hover:border-zinc-700">
          <div className="w-10 h-10 rounded-lg bg-zinc-900/80 border border-zinc-700 flex items-center justify-center mb-3">
            <HardDrive className="w-5 h-5 text-zinc-400" />
          </div>
          <span className="font-display font-semibold text-xs text-zinc-200">1. MCP Server Node</span>
          <span className="text-zinc-500 text-[10px] font-mono mt-1">Exposes file streams</span>
          <div className="mt-2 text-3xs font-mono bg-zinc-900 p-1.5 rounded text-zinc-400 leading-tight text-left w-full h-8 overflow-hidden select-none">
            {activeAgent !== "IDLE" ? "READ: aws_uploader.py [200]" : "mcp_client ready"}
          </div>
        </div>

        {/* Node 2: Agent 1: The Guardian */}
        <div className={`relative z-10 flex flex-col items-center bg-zinc-950 p-4 border rounded-lg text-center shadow-lg transition-all ${
          activeAgent === "GUARDIAN" 
            ? "border-emerald-500 ring-2 ring-emerald-950 bg-emerald-950/10 scale-105" 
            : "border-zinc-800/80"
        }`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 border transition-colors ${
            activeAgent === "GUARDIAN" 
              ? "bg-emerald-900/30 border-emerald-500 text-emerald-400 animate-pulse" 
              : "bg-zinc-900/80 border-zinc-700 text-zinc-400"
          }`}>
            <Shield className="w-5 h-5" />
          </div>
          <span className="font-display font-semibold text-xs text-zinc-100 flex items-center space-x-1">
            <span>2. The Guardian</span>
            {activeAgent === "GUARDIAN" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>}
          </span>
          <span className="text-zinc-500 text-[10px] font-mono mt-1">Security & PII Firewall</span>
          <div className="mt-2 text-2xs font-mono font-semibold px-2 py-0.5 rounded text-zinc-300">
            {activeAgent === "GUARDIAN" ? (
              <span className="text-emerald-400 animate-pulse text-3xs uppercase">SCANNIN REPO...</span>
            ) : activeAgent === "IDLE" ? (
              <span className="text-zinc-600 text-3xs">Standby</span>
            ) : (
              <span className="text-emerald-500/80 text-3xs">Completed</span>
            )}
          </div>
        </div>

        {/* Node 3: Agent 2: The Architect */}
        <div className={`relative z-10 flex flex-col items-center bg-zinc-950 p-4 border rounded-lg text-center shadow-lg transition-all ${
          activeAgent === "ARCHITECT" 
            ? "border-cyan-500 ring-2 ring-cyan-950 bg-cyan-950/10 scale-105" 
            : "border-zinc-800/80"
        }`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 border transition-colors ${
            activeAgent === "ARCHITECT" 
              ? "bg-cyan-900/30 border-cyan-500 text-cyan-400 animate-pulse" 
              : "bg-zinc-900/80 border-zinc-700 text-zinc-400"
          }`}>
            <Cpu className="w-5 h-5" />
          </div>
          <span className="font-display font-semibold text-xs text-zinc-100 flex items-center space-x-1">
            <span>3. The Architect</span>
            {activeAgent === "ARCHITECT" && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>}
          </span>
          <span className="text-zinc-500 text-[10px] font-mono mt-1">Dependency Mapper</span>
          <div className="mt-2 text-2xs font-mono font-semibold px-2 py-0.5 rounded text-zinc-300">
            {activeAgent === "ARCHITECT" ? (
              <span className="text-cyan-400 animate-pulse text-3xs">COMPILING MERMAID...</span>
            ) : activeAgent === "GUARDIAN" || activeAgent === "IDLE" ? (
              <span className="text-zinc-600 text-3xs">Standby</span>
            ) : (
              <span className="text-cyan-500/80 text-3xs">Completed</span>
            )}
          </div>
        </div>

        {/* Node 4: Agent 3: The Scribe */}
        <div className={`relative z-10 flex flex-col items-center bg-zinc-950 p-4 border rounded-lg text-center shadow-lg transition-all ${
          activeAgent === "SCRIBE" 
            ? "border-violet-500 ring-2 ring-violet-950 bg-violet-950/10 scale-105" 
            : "border-zinc-800/80"
        }`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 border transition-colors ${
            activeAgent === "SCRIBE" 
              ? "bg-violet-900/30 border-violet-500 text-violet-400 animate-pulse" 
              : "bg-zinc-900/80 border-zinc-700 text-zinc-400"
          }`}>
            <FileText className="w-5 h-5" />
          </div>
          <span className="font-display font-semibold text-xs text-zinc-100 flex items-center space-x-1">
            <span>4. The Scribe</span>
            {activeAgent === "SCRIBE" && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping"></span>}
          </span>
          <span className="text-zinc-500 text-[10px] font-mono mt-1">Regulatory Assurer</span>
          <div className="mt-2 text-2xs font-mono font-semibold px-2 py-0.5 rounded text-zinc-300">
            {activeAgent === "SCRIBE" ? (
              <span className="text-violet-400 animate-pulse text-3xs">GENERATING MD REPORT...</span>
            ) : activeAgent === "COMPLETED" ? (
              <span className="text-violet-500/90 text-3xs">Completed</span>
            ) : (
              <span className="text-zinc-600 text-3xs">Standby</span>
            )}
          </div>
        </div>
      </div>

      {/* Floating conduit animation state indicator */}
      <div className="mt-4 flex items-center justify-between text-3xs font-mono text-zinc-500 bg-zinc-950 p-2.5 rounded-lg border border-zinc-900">
        <div className="flex items-center space-x-2">
          <span>Active Pipeline Operations:</span>
          {activeAgent === "IDLE" && <span className="text-zinc-500">Idle (Awaiting Scan Signal...)</span>}
          {activeAgent === "GUARDIAN" && <span className="text-emerald-400 animate-pulse">Running Lexical Key-redaction Filter</span>}
          {activeAgent === "ARCHITECT" && <span className="text-cyan-400 animate-pulse">Generating topological Mermaid string</span>}
          {activeAgent === "SCRIBE" && <span className="text-violet-400 animate-pulse">Translating GDPR / HIPAA Safeguards</span>}
          {activeAgent === "COMPLETED" && (
            <span className="text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full compliance payload generated successfully. Ready in workspace</span>
            </span>
          )}
        </div>
        <div className="text-zinc-600">
          Time: <span className="text-zinc-400">{new Date().toISOString().substring(11, 19)} UTC</span>
        </div>
      </div>
    </div>
  );
}
