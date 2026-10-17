"use client";
import React, { useState } from "react";
import { getOrCreateSessionId } from "../utils/session";

interface ChatPanelProps {
  onUpdateGraph?: (data: any) => void;
}

export default function ChatPanel({ onUpdateGraph }: ChatPanelProps) {
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [synthesis, setSynthesis] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setLogs([]);
    setSynthesis("");
    const sessionId = getOrCreateSessionId();

    try {
      const response = await fetch("http://localhost:8000/v1/navigate/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.body) throw new Error("No response body.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.replace("data: ", ""));
            if (data.thoughts) setLogs((prev) => [...prev, ...data.thoughts]);
            if (data.subgraph_data && onUpdateGraph)
              onUpdateGraph(data.subgraph_data);
            if (data.final_synthesis) setSynthesis(data.final_synthesis);
          }
        }
      }
    } catch (err) {
      setLogs((prev) => [...prev, `Error: ${err}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#070A0F] text-slate-100 p-4 border-r border-[#182232]">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#182232]">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">
          Agent Assistant
        </h2>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#062016] text-[#10B981] font-mono font-bold">
          LIVE
        </span>
      </div>

      {/* Execution Run Log */}
      <div className="flex-1 bg-[#0A0E17] border border-[#182232] rounded-xl p-3 overflow-y-auto mb-4 font-mono text-xs text-[#00E599]">
        <p className="text-slate-500 font-bold mb-2 text-[10px] uppercase">
          -- Agent Run Log --
        </p>
        {logs.map((log, idx) => (
          <div key={idx} className="mb-1">{`> ${log}`}</div>
        ))}
      </div>

      {/* Synthesis Output */}
      {synthesis && (
        <div className="bg-[#111726] border border-[#1E293B] rounded-xl p-3 mb-4 text-xs">
          <h3 className="font-bold text-[#00E599] mb-1">Synthesis Report</h3>
          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
            {synthesis}
          </p>
        </div>
      )}

      {/* Input Prompt Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 bg-[#111726] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#10B981]/50 transition"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-[#1A2333] hover:bg-[#232F45] text-slate-200 border border-[#2B3952] px-4 py-2 rounded-xl text-xs font-medium transition disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
