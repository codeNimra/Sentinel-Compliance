/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { MessageSquareCode, HelpCircle, Send, ShieldAlert, BadgeInfo } from "lucide-react";

interface AskScribeAIProps {
  currentCode: string;
}

export default function AskScribeAI({ currentCode }: AskScribeAIProps) {
  const [messages, setMessages] = useState<Array<{ sender: "user" | "agent"; text: string }>>([
    {
      sender: "agent",
      text: "Greetings. I am Sentinel Scribe, your enterprise compliance counsel. Ask me complex questions about security safeguards under HIPAA, GDPR Article 32 processing standards, or SOC2 common criteria."
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userText = inputValue;
    setMessages(prev => [...prev, { sender: "user", text: userText }]);
    setInputValue("");
    setLoading(true);

    try {
      const res = await fetch("/api/ask-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userText, codeContext: currentCode })
      });
      const data = await res.json();
      
      const responseText = data.response || "I am connected to your local server workspace. To enable dynamic conversational auditing, make sure process.env.GEMINI_API_KEY is active in Settings.";
      setMessages(prev => [...prev, { sender: "agent", text: responseText }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        sender: "agent", 
        text: "I was unable to establish a secure query response with the API. Please ensure your Express dev server has completed compilation." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const PRESET_QUESTIONS = [
    "How does storing passwords in plain text conflict with SOC2 Access CC6.1?",
    "Which GDPR Article 32 requirements apply to Patient ePHI fields?",
    "Why does hardcoding AWS credentials invalidate HIPAA Security Rules?"
  ];

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col space-y-4 h-[440px] shadow-2xl relative overflow-hidden">
      <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800">
        <MessageSquareCode className="w-4 h-4 text-emerald-400" />
        <span className="font-display font-semibold text-xs text-zinc-200 tracking-wide uppercase">
          Dynamic Scribe AI Guidance Terminal
        </span>
      </div>

      {/* Messages Output */}
      <div className="flex-1 overflow-y-auto space-y-3 p-1 text-xs">
        {messages.map((m, i) => (
          <div 
            key={i} 
            className={`flex items-start gap-2 max-w-[85%] ${
              m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-3xs font-mono font-bold ${
              m.sender === "user" 
                ? "bg-zinc-900 border border-zinc-800 text-zinc-300"
                : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
            }`}>
              {m.sender === "user" ? "USR" : "AGENT"}
            </div>
            <div className={`p-3 rounded-lg leading-relaxed ${
              m.sender === "user"
                ? "bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono"
                : "bg-zinc-900/40 border border-zinc-950 text-zinc-300"
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center space-x-2 text-zinc-500 font-mono text-2xs animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Sentinel Scribe is scanning legal frameworks...</span>
          </div>
        )}
      </div>

      {/* Suggest questions */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center space-x-1">
          <HelpCircle className="w-3 h-3" />
          <span>Preset Regulatory Queries</span>
        </span>
        <div className="grid grid-cols-1 gap-1.5">
          {PRESET_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInputValue(q)}
              className="text-left text-3xs font-mono text-zinc-400 hover:text-emerald-300 bg-zinc-900 hover:bg-zinc-900/80 px-2 py-1.5 rounded border border-zinc-800 transition-colors uppercase truncate"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Query input field */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-center bg-zinc-900/80 p-1.5 border border-zinc-800 rounded-lg">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Consult with internal regulatory agents..."
          className="flex-1 bg-transparent px-3 py-1.5 text-xs text-zinc-100 outline-none placeholder-zinc-700 font-mono"
        />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-950 transition-colors flex items-center space-x-1 shrink-0 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-display">ASK</span>
        </button>
      </form>
    </div>
  );
}
