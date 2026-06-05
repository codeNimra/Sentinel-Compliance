/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { 
  ShieldAlert, 
  Terminal, 
  Play, 
  RefreshCw, 
  FileCode, 
  Layers, 
  Gauge, 
  Globe2, 
  CheckCircle2, 
  FileText, 
  Download,
  Award,
  AlertTriangle,
  Flame,
  Info,
  Clock,
  ExternalLink,
  ChevronRight,
  Upload
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";

import McpConduitGraph from "./components/McpConduitGraph";
import CodeDiffViewer from "./components/CodeDiffViewer";
import MermaidViewer from "./components/MermaidViewer";
import AskScribeAI from "./components/AskScribeAI";

import { LogMessage, PipelineResponse } from "./types";

export default function App() {
  const [repoFiles, setRepoFiles] = useState<Array<{ id: string; name: string; language: string; description: string }>>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [fileName, setFileName] = useState<string>("express_server.ts");
  const [language, setLanguage] = useState<string>("typescript");
  const [targetFramework, setTargetFramework] = useState<string>("unified");
  
  // Pipeline streaming states
  const [transactionId, setTransactionId] = useState<string>("");
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [activeStepAgent, setActiveStepAgent] = useState<"GUARDIAN" | "ARCHITECT" | "SCRIBE" | "SYSTEM" | "IDLE" | "COMPLETED">("IDLE");
  
  // Completed result states
  const [auditResult, setAuditResult] = useState<PipelineResponse | null>(null);
  
  // Interactive UI Tabs
  const [activeTab, setActiveTab] = useState<"violations" | "diff" | "architecture" | "scribe" | "ask">("violations");
  const [complianceLang, setComplianceLang] = useState<"en" | "de" | "es">("en");
  const [showCertificate, setShowCertificate] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Load sample files metadata list from Backend on mount
  useEffect(() => {
    fetch("/api/sample-files")
      .then(res => res.json())
      .then(data => {
        setRepoFiles(data);
        if (data.length > 0) {
          handleSelectFile(data[0].id);
        }
      })
      .catch(err => console.error("Error connecting to Express backend:", err));
  }, []);

  // Automatic scroll for live terminal thought logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleSelectFile = (fileId: string) => {
    setSelectedFileId(fileId);
    fetch(`/api/sample-files/${fileId}`)
      .then(res => res.json())
      .then(file => {
        setCode(file.content);
        setFileName(file.name);
        setLanguage(file.language);
      })
      .catch(err => console.error("Error retrieving asset content:", err));
  };

  // Implement handle file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === "string") {
        setCode(event.target.result);
        setFileName(file.name);
        const ext = file.name.split(".").pop() || "";
        setLanguage(ext === "py" ? "python" : ext === "json" ? "json" : "typescript");
      }
    };
    reader.readAsText(file);
  };

  // Trigger our active Multi-agent MCP Stream pipeline!
  const triggerComplianceAudit = async () => {
    if (!code.trim() || isAuditing) return;

    setIsAuditing(true);
    setAuditResult(null);
    setLogs([]);
    setActiveStepAgent("SYSTEM");
    setActiveTab("violations");
    setTransactionId("");

    try {
      const initRes = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, fileName, language })
      });
      const { transactionId: txId } = await initRes.json();
      setTransactionId(txId);

      // Connect EventSource back to listen to Server-Sent Event (SSE) thought streams
      const eventSource = new EventSource(`/api/stream?transactionId=${txId}`);

      eventSource.onmessage = (event) => {
        const logData: LogMessage = JSON.parse(event.data);
        setLogs(prev => [...prev, logData]);
        setActiveStepAgent(logData.agent);
      };

      eventSource.addEventListener("completed", (event: MessageEvent) => {
        const finalResult: PipelineResponse = JSON.parse(event.data);
        setAuditResult(finalResult);
        setActiveStepAgent("COMPLETED");
        setIsAuditing(false);
        setActiveTab("diff"); // Automatically focus on Code Diff once processed!
        eventSource.close();
      });

      eventSource.onerror = (err) => {
        console.error("SSE stream error:", err);
        eventSource.close();
        setIsAuditing(false);
        setActiveStepAgent("IDLE");
      };

    } catch (err) {
      console.error("Failed executing compliance audit pipeline:", err);
      setIsAuditing(false);
      setActiveStepAgent("IDLE");
    }
  };

  const downloadCompiledCode = () => {
    if (!auditResult) return;
    const blob = new Blob([auditResult.clean_code_payload], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sanitized_${fileName}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none antialiased">
      {/* Top Navigation Bar Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/85 backdrop-blur-md px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Layers className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-display font-bold text-base tracking-wide text-zinc-100 uppercase">
                Sentinel Compliance
              </h1>
              <span className="text-[10px] bg-zinc-950 border border-zinc-800 text-zinc-500 font-mono px-2 py-0.5 rounded uppercase">
                v1.2 Agentic-MCP
              </span>
            </div>
            <p className="text-3xs font-mono text-zinc-500 tracking-wider">
              Orchestrating Security, Dependency mapping & Multi-Lingual Attestations
            </p>
          </div>
        </div>

        {/* Global Statistics */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-zinc-950 p-2 border border-zinc-800 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span className="font-mono text-3xs text-zinc-400 uppercase tracking-wider">
              Time: {new Date().toISOString().substring(0, 10)} @ {new Date().toISOString().substring(11, 16)} UTC
            </span>
          </div>
          <div className="flex items-center space-x-2 bg-emerald-950/20 p-2 border border-emerald-800/40 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-3xs text-emerald-400 uppercase tracking-widest font-semibold">
              MCP-Host Connected
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid Dash Dashboard */}
      <main className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 p-6 overflow-hidden">
        
        {/* Left column sidebar (Vulnerable Code Loader & Editor Pane) */}
        <section className="col-span-1 xl:col-span-4 flex flex-col space-y-4">
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-semibold tracking-wider text-zinc-300 uppercase flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>Enterprise Source Material</span>
              </span>
              <span className="text-3xs font-mono text-zinc-500">Repository Files</span>
            </div>

            {/* Select Predefined Files */}
            <div className="space-y-2">
              <label className="text-4xs font-mono text-zinc-500 uppercase tracking-widest block">
                Select Vulnerable Script Target
              </label>
              <div className="grid grid-cols-1 gap-2">
                {repoFiles.map(file => (
                  <button
                    key={file.id}
                    onClick={() => handleSelectFile(file.id)}
                    className={`text-left p-3 rounded-lg border text-xs transition-all duration-150 flex items-start space-x-3 leading-tight ${
                      selectedFileId === file.id
                        ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-200 animate-pulse-subtle"
                        : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-950/80"
                    }`}
                  >
                    <div className="pt-0.5">
                      <span className="font-mono uppercase font-bold text-[10px] px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-500">
                        {file.language}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-medium text-xs tracking-wide text-zinc-200">{file.name}</div>
                      <div className="text-[10px] text-zinc-500 max-w-full truncate mt-1">{file.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom File Upload Option */}
            <div className="flex items-center justify-between border-t border-zinc-850 pt-3">
              <label 
                htmlFor="file-upload" 
                className="w-full flex items-center justify-center space-x-2 p-2 bg-zinc-950 hover:bg-zinc-950/80 hover:text-zinc-100 border border-zinc-800 rounded-lg text-xs font-mono font-medium text-zinc-400 cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-500" />
                <span>UPLOAD CUSTOM SOURCE FILE</span>
                <input 
                  id="file-upload" 
                  type="file" 
                  accept=".py,.ts,.js,.json,.txt" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* Integrated Custom Text Area Editor */}
            <div className="flex flex-col space-y-1.5">
              <div className="flex justify-between items-center text-3xs font-mono">
                <span className="text-zinc-500 uppercase tracking-widest">Active Workspace Buffer:</span>
                <span className="text-emerald-500">{fileName} ({language})</span>
              </div>
              <div className="relative border border-zinc-800 bg-zinc-950 rounded-lg overflow-hidden flex flex-col h-[280px]">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 w-full p-4 font-mono text-zinc-300 text-xs bg-transparent border-0 outline-none resize-none focus:ring-0 leading-relaxed font-medium"
                  placeholder="# Write or paste code containing secrets..."
                />
              </div>
            </div>

            {/* Choose Target Framework Safeguards */}
            <div className="space-y-1.5">
              <label className="text-4xs font-mono text-zinc-500 uppercase tracking-widest block">
                Target Compliance Framework
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: "all", label: "Unified GDPR/HIPAA/SOC2" },
                  { id: "gdpr", label: "GDPR Article 32" },
                  { id: "hipaa", label: "HIPAA Security Guard" },
                  { id: "soc2", label: "SOC2 Trust CC6.1" }
                ].map(fw => (
                  <button
                    key={fw.id}
                    onClick={() => setTargetFramework(fw.id)}
                    className={`px-2 py-1.5 rounded-lg border text-3xs font-mono uppercase tracking-wide text-center transition-all ${
                      targetFramework === fw.id
                        ? "bg-zinc-800 border-zinc-700 text-emerald-400 font-bold"
                        : "bg-zinc-950/40 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950/60"
                    }`}
                  >
                    {fw.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Trigger Controls */}
            <button
              onClick={triggerComplianceAudit}
              disabled={isAuditing || !code.trim()}
              className={`w-full p-3 rounded-lg font-sans font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all ${
                isAuditing 
                  ? "bg-zinc-950 border border-zinc-800 text-zinc-500 cursor-not-allowed" 
                  : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 hover:shadow-emerald-500/10 cursor-pointer"
              }`}
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="tracking-widest uppercase">CONSTRUCTING COMPLIANCE MATRIX...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-zinc-950 text-zinc-950" />
                  <span className="tracking-widest uppercase">TRIGGER MULTI-AGENT COMPLIANCE AUDIT</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Center Panel (MCP Diagram + Workspace Tabs) */}
        <section className="col-span-1 xl:col-span-5 flex flex-col space-y-4">
          
          {/* Active Model Context Protocol Graph Display */}
          <McpConduitGraph activeAgent={activeStepAgent} />

          {/* Core Operations Deck Tabs */}
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col space-y-4 min-h-[480px]">
            {/* Tabs List Navigation */}
            <div className="flex border-b border-zinc-800 overflow-x-auto gap-2">
              {[
                { id: "violations", label: "VIOLATIONS MATRIX" },
                { id: "diff", label: "CODE COMPARISON" },
                { id: "architecture", label: "ARCHITECTURE" },
                { id: "scribe", label: "REGULATORY REPORT" },
                { id: "ask", label: "CONSULT AGENTS" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-3 text-xs font-mono transition-all border-b-2 px-1 focus:outline-none uppercase shrink-0 ${
                    activeTab === tab.id
                      ? "border-emerald-500 text-zinc-50 font-bold"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Active Tab Deck Display */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "violations" && (
                <div className="space-y-4">
                  {/* Stats Overview */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                      <div className="text-3xs font-mono text-red-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-center space-x-1">
                        <Flame className="w-3.5 h-3.5" />
                        <span>Critical Blockers</span>
                      </div>
                      <span className="text-xl font-display font-bold text-red-400">
                        {auditResult ? auditResult.violations.filter(v => v.severity === "CRITICAL").length : "0"}
                      </span>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                      <div className="text-3xs font-mono text-amber-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Warning Alerts</span>
                      </div>
                      <span className="text-xl font-display font-bold text-amber-400">
                        {auditResult ? auditResult.violations.filter(v => v.severity === "WARNING").length : "0"}
                      </span>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                      <div className="text-3xs font-mono text-blue-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-center space-x-1">
                        <Info className="w-3.5 h-3.5" />
                        <span>Reference Notes</span>
                      </div>
                      <span className="text-xl font-display font-bold text-blue-300">
                        {auditResult ? auditResult.violations.filter(v => v.severity === "INFO").length : "0"}
                      </span>
                    </div>
                  </div>

                  {/* Violations List */}
                  {auditResult ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-3xs font-mono text-zinc-500 uppercase px-1">
                        <span>Exposed Assets Identified</span>
                        <span>Security Audit Standard Verified</span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2.5">
                        {auditResult.violations.map((violation, index) => (
                          <div 
                            key={index} 
                            className={`p-3.5 rounded-lg border transition-all text-xs ${
                              violation.severity === "CRITICAL"
                                ? "bg-red-500/10 border-red-500/30 text-red-200 shadow-sm"
                                : violation.severity === "WARNING"
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-200 shadow-sm"
                                  : "bg-blue-500/10 border-blue-500/30 text-blue-200 shadow-sm"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-2xs font-bold uppercase tracking-wider flex items-center space-x-1">
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                <span>{violation.violation_type}</span>
                              </span>
                              <span className={`px-2 py-0.5 rounded text-3xs font-mono font-bold tracking-widest ${
                                violation.severity === "CRITICAL"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/45"
                                  : violation.severity === "WARNING"
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/45"
                                    : "bg-blue-500/20 text-blue-400 border border-blue-500/45"
                              }`}>
                                {violation.severity}
                              </span>
                            </div>
                            <p className="text-zinc-400 leading-relaxed text-2xs">{violation.description}</p>
                            <div className="mt-2.5 flex items-center justify-between border-t border-zinc-800/80 pt-2 text-[10px] font-mono text-zinc-500 uppercase">
                              <span>Path: <span className="text-zinc-300">{violation.file_path}</span></span>
                              <span>Afflicted Line: <span className="text-zinc-300">#{violation.line}</span></span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Print Compliance Certificate Option */}
                      <button
                        onClick={() => setShowCertificate(true)}
                        className="w-full mt-4 p-3.5 bg-zinc-950 hover:bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs font-mono tracking-wider font-semibold text-emerald-400 hover:text-emerald-300 flex items-center justify-center space-x-2 uppercase transition-all duration-150 cursor-pointer"
                      >
                        <Award className="w-4.5 h-4.5" />
                        <span>GENERATE CORPORATE ATTESTATION SLIP</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                      <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-2">
                        <Gauge className="w-6 h-6 animate-pulse" />
                      </div>
                      <h4 className="font-display font-semibold text-xs text-zinc-400 tracking-wide">
                        COMPLIANCE ENGINE IDLE
                      </h4>
                      <p className="text-2xs text-zinc-500 max-w-xs leading-relaxed">
                        To run the lexical scanning and translation matrix, select or upload a database script/source and trigger audit.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "diff" && (
                <div>
                  {auditResult ? (
                    <div className="space-y-4">
                      <CodeDiffViewer 
                        originalCode={code} 
                        cleanCode={auditResult.clean_code_payload} 
                        violations={auditResult.violations} 
                      />
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={downloadCompiledCode}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-semibold text-zinc-950 transition-colors flex items-center space-x-1.5 cursor-pointer shadow-lg hover:shadow-emerald-600/10 uppercase font-display"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Sterilized Source</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                      <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-2">
                        <Terminal className="w-6 h-6 animate-pulse" />
                      </div>
                      <h4 className="font-display font-semibold text-xs text-zinc-400 tracking-wide">
                        CODE COMPARISON DECK STANDBY
                      </h4>
                      <p className="text-2xs text-zinc-500 max-w-xs leading-relaxed">
                        Redacted diff visualizations populate dynamically once the compliance stream ends.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "architecture" && (
                <div>
                  {auditResult ? (
                    <MermaidViewer chart={auditResult.architecture.mermaid_code} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                      <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-2">
                        <Layers className="w-6 h-6 animate-pulse" />
                      </div>
                      <h4 className="font-display font-semibold text-xs text-zinc-400 tracking-wide">
                        ARCHITECT TOPO GRAPH STANDBY
                      </h4>
                      <p className="text-2xs text-zinc-500 max-w-xs leading-relaxed">
                        Runs complete dependency scans mapping external targets (IAM vaults, database clusters) interactively.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "scribe" && (
                <div className="space-y-4">
                  {auditResult ? (
                    <div>
                      {/* Sub Language Selection tabs with global icons */}
                      <div className="flex justify-between items-center bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 mb-4 text-xs font-mono">
                        <span className="flex items-center space-x-1.5 text-zinc-400 uppercase">
                          <Globe2 className="w-4 h-4 text-emerald-400" />
                          <span>REGULATORY TRANSLATION Matrix</span>
                        </span>
                        
                        <div className="flex space-x-1.5 bg-zinc-900 p-1 rounded-md border border-zinc-800">
                          {[
                            { code: "en", label: "English" },
                            { code: "de", label: "Deutsch / DE" },
                            { code: "es", label: "Español / ES" }
                          ].map(lang => (
                            <button
                              key={lang.code}
                              onClick={() => setComplianceLang(lang.code as any)}
                              className={`px-2.5 py-1 rounded-sm text-3xs tracking-wider transition-colors uppercase font-medium ${
                                complianceLang === lang.code
                                  ? "bg-zinc-850 text-emerald-400 font-bold border border-zinc-700 shadow"
                                  : "text-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              {lang.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Markdown Renders */}
                      <div className="prose prose-invert prose-xs max-w-none bg-zinc-950 rounded-lg p-5 border border-zinc-800 overflow-y-auto max-h-[500px] leading-relaxed text-zinc-300 prose-headings:font-display prose-headings:font-semibold prose-headings:text-zinc-100 prose-a:text-emerald-400 prose-code:text-emerald-300 prose-code:font-mono prose-code:text-3xs prose-table:w-full prose-table:text-3xs prose-th:bg-zinc-900 prose-th:p-2 prose-td:p-2 border-l-2 border-l-violet-500">
                        <ReactMarkdown>
                          {complianceLang === "en" 
                            ? auditResult.documentation.english_md
                            : complianceLang === "de"
                              ? auditResult.documentation.translated_md.de
                              : auditResult.documentation.translated_md.es
                          }
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                      <div className="w-12 h-12 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 mb-2">
                        <FileText className="w-6 h-6 animate-pulse" />
                      </div>
                      <h4 className="font-display font-semibold text-xs text-zinc-400 tracking-wide">
                        THE SCRIBE REGULATORY LEDGER IDLE
                      </h4>
                      <p className="text-2xs text-zinc-500 max-w-xs leading-relaxed">
                        Compliance documentation mapping GDPR, HIPAA privacy matrices translates dynamically post-audit.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "ask" && (
                <AskScribeAI currentCode={code} />
              )}
            </div>
          </div>
        </section>

        {/* Right column sidebar (SSE Pipeline Stream logs terminal) */}
        <section className="col-span-1 xl:col-span-3 flex flex-col space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col h-[580px] shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <span className="font-display text-xs font-semibold tracking-wider text-zinc-300 uppercase flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Live Action Ledger Monologue</span>
              </span>
              <span className="text-[10px] bg-red-950/20 text-red-400 border border-red-900/40 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                SSE FEED
              </span>
            </div>

            {/* Scrolling Logs Panel */}
            <div className="flex-1 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-lg p-3.5 space-y-2.5 font-mono text-[10px] leading-relaxed max-h-[500px]">
              {logs.length > 0 ? (
                logs.map((log, index) => {
                  let agentBadgeColor = "text-zinc-500 bg-zinc-900 border-zinc-800";
                  if (log.agent === "GUARDIAN") agentBadgeColor = "text-amber-400 bg-amber-950/30 border-amber-900/40";
                  if (log.agent === "ARCHITECT") agentBadgeColor = "text-cyan-400 bg-cyan-950/30 border-cyan-900/40";
                  if (log.agent === "SCRIBE") agentBadgeColor = "text-violet-450 bg-violet-950/30 border-violet-900/40";
                  if (log.agent === "SYSTEM") agentBadgeColor = "text-emerald-400 bg-emerald-950/20 border-emerald-900/30";

                  return (
                    <div 
                      key={index} 
                      className={`pb-1.5 border-b border-zinc-800/40 transition-opacity duration-150 ${
                        log.status === "ERROR" ? "text-red-400" : "text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 text-zinc-500">
                        <span className={`px-1.5 py-0.2 rounded uppercase border font-bold text-[9px] ${agentBadgeColor}`}>
                          {log.agent}
                        </span>
                        <span>{log.timestamp.substring(11, 19)}</span>
                      </div>
                      <p className="font-medium">{log.message}</p>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 text-zinc-600">
                  <Terminal className="w-5 h-5 opacity-40" />
                  <p className="text-[10px] font-mono">Stream Log Closed</p>
                  <p className="text-[9px] font-sans text-zinc-500 uppercase">Wait for scan initiation</p>
                </div>
              )}
              <div ref={logsEndRef} />
            </div>

            {/* Network diagnostic bar */}
            <div className="mt-3 p-2 border border-zinc-800 bg-zinc-950 rounded-lg text-3xs font-mono text-zinc-500 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                <span>Port Gateway: 3000 :: Active</span>
              </span>
              <span>Encrypted SSL Secure</span>
            </div>
          </div>
        </section>
      </main>

      {/* Corporate Compliance attestation certificate pop-up modal */}
      <AnimatePresence>
        {showCertificate && auditResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/90 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 max-w-xl w-full text-center relative overflow-hidden shadow-2xl flex flex-col justify-between glow-line"
            >
              {/* Certificate badge designs */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-xl transform translate-x-8 -translate-y-8" />
              
              <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-1 shadow-lg shadow-emerald-500/5">
                  <Award className="w-7 h-7" />
                </div>
                
                <h3 className="font-display font-bold text-lg tracking-wide text-zinc-100 uppercase">
                  Compliance Attestation Certificate
                </h3>
                <p className="text-3xs font-mono text-zinc-500 uppercase tracking-widest leading-none">
                  Federal Regulatory Verification Registry
                </p>
                
                <div className="w-full border-t border-zinc-800 my-2" />
                
                <p className="text-2xs text-zinc-400 leading-relaxed font-sans px-4">
                  This attestation voucher guarantees that source codebase script **{fileName}** was fully scanned by the Sentinel Security Guardian multi-agent firewall. Highly vulnerable static credentials representing database strings, SSH/AWS Access logs, and personal SSN fields were parsed and safely redacted.
                </p>

                <div className="w-full bg-zinc-950 p-4 border border-zinc-800 rounded-xl space-y-2 text-left text-xs font-mono leading-none">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 uppercase text-3xs">Certificate Registry:</span>
                    <span className="text-zinc-200">CRT-{auditResult.transaction_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 uppercase text-3xs">Target Code Scope:</span>
                    <span className="text-zinc-200">{fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 uppercase text-3xs">Exposed Keys Cleared:</span>
                    <span className="text-zinc-200">{auditResult.violations.length} vulnerabilities rectified</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 uppercase text-3xs">Attestation Standard:</span>
                    <span className="text-emerald-400 uppercase font-semibold">GDPR A32 / HIPAA / SOC2 Compliant</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-[10px] font-mono text-zinc-500 text-center justify-center p-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Verified MCP Security Host Certification - Standalone Sandbox OK</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowCertificate(false)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 px-5 py-2 rounded-lg font-sans text-xs font-bold transition-all duration-150 uppercase tracking-wider cursor-pointer"
                >
                  Close attestation
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
