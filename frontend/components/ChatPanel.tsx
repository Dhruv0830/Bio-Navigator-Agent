"use client";
import React, { useState } from "react";
import LogoIcon from "./LogoIcon";

interface ChatPanelProps {
  logs: string[];
  synthesis: string;
  loading: boolean;
  query: string;
  setQuery: (q: string) => void;
  onExecute: (q?: string) => void;
  onOpenDocs: () => void;
  onToggleAgentModal: () => void;
  isAgentModalOpen: boolean;
}

export default function ChatPanel({
  logs,
  synthesis,
  loading,
  query,
  setQuery,
  onExecute,
  onOpenDocs,
  onToggleAgentModal,
  isAgentModalOpen,
}: ChatPanelProps) {
  return (
    <div className="w-[420px] h-full bg-neutral-950/90 backdrop-blur-2xl border-r border-neutral-800/80 flex flex-col z-10 shadow-2xl">
      {/* Top Brand Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-2.5 transition-transform duration-300 hover:scale-105">
          <div className="w-7 h-7 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center p-1 shadow-sm">
            <LogoIcon size={16} className="text-white" />
          </div>
          <span className="text-xs font-semibold text-white tracking-wider">
            BioPathway Agent
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDocs}
            className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-[11px] transition-all hover:scale-[1.02]"
          >
            Sources
          </button>
          <button
            onClick={onToggleAgentModal}
            className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all hover:scale-[1.02] ${
              isAgentModalOpen
                ? "bg-neutral-800 border-neutral-600 text-white"
                : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
            }`}
          >
            Workflow Logs
          </button>
        </div>
      </div>

      {/* Main Content Area in Sidebar */}
      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
        {/* Agent Thought Logs Stream */}
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-4 flex flex-col shadow-inner">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-neutral-800">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
              Agent Execution Stream
            </span>
            {loading && (
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            )}
          </div>
          <div className="font-mono text-[11px] text-neutral-300 max-h-48 overflow-y-auto space-y-1">
            {logs.length === 0 ? (
              <span className="text-neutral-600 italic">
                Ready. Click a node on the 3D globe or type a query below...
              </span>
            ) : (
              logs.map((l, i) => <div key={i}>{`> ${l}`}</div>)
            )}
          </div>
        </div>

        {/* Synthesis Report Card */}
        {synthesis && (
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between mb-3 border-b border-neutral-800 pb-2">
              <h3 className="text-xs font-semibold text-white">
                Final Synthesis Report
              </h3>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-neutral-950 text-white border border-neutral-700">
                Verified
              </span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {synthesis}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Query Bar */}
      <div className="p-4 border-t border-neutral-800/80 bg-neutral-950/80 backdrop-blur-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onExecute();
          }}
          className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 focus-within:border-neutral-500 transition shadow-lg"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a biological pathway..."
            className="flex-1 bg-transparent text-xs text-neutral-100 focus:outline-none placeholder:text-neutral-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-3 py-1.5 rounded-lg text-xs font-medium transition hover:scale-[1.03] disabled:opacity-50"
          >
            {loading ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
