/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

// Initialize mermaid with dark-mode styles fitting our technical dashboard aesthetic
try {
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
    themeVariables: {
      background: "#09090b",
      primaryColor: "#065f46",
      primaryTextColor: "#d1fae5",
      lineColor: "#27272a",
      fontSize: "12px",
      fontFamily: "JetBrains Mono"
    }
  });
} catch (e) {
  console.error("Failed to initialize mermaid:", e);
}

interface MermaidViewerProps {
  chart: string;
}

export default function MermaidViewer({ chart }: MermaidViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!chart) {
      setError("No architecture configuration mapped.");
      return;
    }
    setError("");
    setSvg("");

    // Create a unique identifier to prevent conflict in multiple rendering cycles
    const renderId = `mermaid-canvas-${Math.random().toString(36).substring(2, 9)}`;

    try {
      mermaid.render(renderId, chart)
        .then(({ svg }) => {
          setSvg(svg);
        })
        .catch((err) => {
          console.error("Mermaid parsing exception:", err);
          setError("Failed to compile dependency flowchart. Check code syntax.");
        });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred compiling the chart.");
    }
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-lg text-red-400 font-mono text-sm">
        <p className="font-semibold mb-1">Architecture Visualization Suspended</p>
        <p className="text-xs text-red-500/90">{error}</p>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-400 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <p className="font-mono text-xs tracking-wider animate-pulse">
          MAPPING SOURCE CODE TREE TopoGraph...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-400">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Interactive Dependency Topology Graph</span>
        </div>
        <span>Format: Mermaid.js Flowchart TD</span>
      </div>

      <div className="relative border border-zinc-800/80 bg-zinc-950/80 rounded-lg p-6 overflow-auto max-h-[550px] flex items-center justify-center glow-line">
        <div 
          ref={containerRef}
          className="w-full h-full text-center flex justify-center [&_svg]:scale-105 [&_svg]:transition-transform [&_svg]:max-w-full [&_svg]:h-auto text-emerald-100"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
