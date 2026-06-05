/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Sparkles, ArrowRightLeft, ShieldAlert, ShieldCheck } from "lucide-react";
import { Violation } from "../types";

interface CodeDiffViewerProps {
  originalCode: string;
  cleanCode: string;
  violations: Violation[];
}

export default function CodeDiffViewer({ originalCode, cleanCode, violations }: CodeDiffViewerProps) {
  const [viewMode, setViewMode] = useState<"split" | "original" | "sanitized">("split");

  const originalLines = originalCode.split("\n");
  const cleanLines = cleanCode.split("\n");

  const checkLineViolation = (lineNum: number): Violation | undefined => {
    return violations.find(v => v.line === lineNum);
  };

  const renderSplitView = () => {
    const totalLines = Math.max(originalLines.length, cleanLines.length);
    const lineEntries = [];

    for (let i = 0; i < totalLines; i++) {
      const lineNum = i + 1;
      const originalText = originalLines[i] !== undefined ? originalLines[i] : "";
      const cleanText = cleanLines[i] !== undefined ? cleanLines[i] : "";
      const isRedactedLine = originalText !== cleanText;
      const violation = checkLineViolation(lineNum);

      lineEntries.push({
        lineNum,
        originalText,
        cleanText,
        isRedactedLine,
        violation
      });
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs overflow-x-auto">
        {/* Original Repo Payload */}
        <div className="border border-red-900/30 bg-red-950/5 rounded-lg overflow-hidden flex flex-col">
          <div className="bg-red-950/20 px-4 py-2 border-b border-red-900/20 flex items-center justify-between text-red-400">
            <span className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4" />
              <span className="font-semibold tracking-wide">RAW INPUT REPOSITORY SOURCE</span>
            </span>
            <span className="text-2xs text-red-500/80 bg-red-950/50 px-2 py-0.5 rounded border border-red-900/30">
              VULNERABILITY ALIVE
            </span>
          </div>
          <div className="p-4 overflow-auto max-h-[500px] bg-zinc-950 flex-1">
            <table className="w-full border-collapse">
              <tbody>
                {lineEntries.map((entry) => (
                  <tr 
                    key={`orig-${entry.lineNum}`} 
                    className={`group ${
                      entry.violation 
                        ? "bg-red-950/40 border-l-2 border-red-500" 
                        : entry.isRedactedLine 
                          ? "bg-red-950/20 border-l border-red-900/50" 
                          : "hover:bg-zinc-900/40"
                    }`}
                  >
                    <td className="w-10 text-right pr-4 text-zinc-600 select-none border-r border-zinc-900 text-2xs font-sans">
                      {entry.lineNum}
                    </td>
                    <td className="pl-4 whitespace-pre text-red-200/90 [word-break:break-all]">
                      {entry.originalText || " "}
                      {entry.violation && (
                        <div className="mt-1 text-2xs font-sans text-red-400 bg-red-950/80 border border-red-900/40 p-2 rounded max-w-lg whitespace-normal leading-relaxed">
                          <span className="font-semibold uppercase text-red-300">[{entry.violation.severity}] {entry.violation.violation_type}:</span> {entry.violation.description}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sanitized MCP Filtered Payload */}
        <div className="border border-emerald-950/40 bg-emerald-950/5 rounded-lg overflow-hidden flex flex-col">
          <div className="bg-emerald-950/20 px-4 py-2 border-b border-emerald-900/20 flex items-center justify-between text-emerald-400">
            <span className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="font-semibold tracking-wide">THE GUARDIAN SHIELD SANITIZED</span>
            </span>
            <span className="text-2xs text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900/40 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 animate-spin text-emerald-300" />
              <span>STERILIZED</span>
            </span>
          </div>
          <div className="p-4 overflow-auto max-h-[500px] bg-zinc-950 flex-1">
            <table className="w-full border-collapse">
              <tbody>
                {lineEntries.map((entry) => (
                  <tr 
                    key={`clean-${entry.lineNum}`} 
                    className={`group ${
                      entry.isRedactedLine 
                        ? "bg-emerald-950/30 border-l-2 border-emerald-500" 
                        : "hover:bg-zinc-900/40"
                    }`}
                  >
                    <td className="w-10 text-right pr-4 text-zinc-600 select-none border-r border-zinc-900 text-2xs font-sans">
                      {entry.lineNum}
                    </td>
                    <td className="pl-4 whitespace-pre text-zinc-300 [word-break:break-all]">
                      {entry.cleanText || " "}
                      {entry.isRedactedLine && (
                        <span className="ml-2 font-sans inline-flex items-center px-1.5 py-0.2 rounded text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-300 select-none mt-1 animate-pulse">
                          Auto Scrubbed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Control Pane */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <ArrowRightLeft className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-mono text-zinc-300 font-semibold uppercase">Security Diff Visualizer</span>
        </div>
        
        <div className="flex bg-zinc-900 p-1 border border-zinc-800/60 rounded-lg space-x-1">
          <button
            onClick={() => setViewMode("split")}
            className={`px-3 py-1 text-xs rounded transition-all font-mono font-medium ${
              viewMode === "split" 
                ? "bg-zinc-800 border border-zinc-700/80 text-emerald-450 font-semibold shadow" 
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            SIDE-BY-SIDE DIFF
          </button>
          <button
            onClick={() => setViewMode("original")}
            className={`px-3 py-1 text-xs rounded transition-all font-mono ${
              viewMode === "original" 
                ? "bg-zinc-800 border border-zinc-700/80 text-red-400 font-semibold shadow" 
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            RAW SOURCE
          </button>
          <button
            onClick={() => setViewMode("sanitized")}
            className={`px-3 py-1 text-xs rounded transition-all font-mono ${
              viewMode === "sanitized" 
                ? "bg-zinc-800 border border-zinc-700/80 text-emerald-450 font-semibold shadow" 
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            SAFE SWELL TEXT
          </button>
        </div>
      </div>

      {viewMode === "split" && renderSplitView()}

      {viewMode === "original" && (
        <div className="border border-red-950 bg-zinc-950 rounded-lg p-4 font-mono text-xs overflow-auto max-h-[500px]">
          {originalLines.map((lineText, idx) => (
            <div key={`orig-only-${idx + 1}`} className="flex hover:bg-red-950/10">
              <span className="w-12 text-zinc-600 text-right pr-4 select-none">{idx + 1}</span>
              <span className="text-red-300 whitespace-pre">{lineText || " "}</span>
            </div>
          ))}
        </div>
      )}

      {viewMode === "sanitized" && (
        <div className="border border-emerald-950 bg-zinc-950 rounded-lg p-4 font-mono text-xs overflow-auto max-h-[500px]">
          {cleanLines.map((lineText, idx) => (
            <div key={`clean-only-${idx + 1}`} className="flex hover:bg-emerald-950/15">
              <span className="w-12 text-zinc-600 text-right pr-4 select-none">{idx + 1}</span>
              <span className="text-emerald-50/90 whitespace-pre">{lineText || " "}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
