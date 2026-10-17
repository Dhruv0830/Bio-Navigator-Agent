"use client";
import { useState } from "react";
import LogoIcon from "@/components/LogoIcon";
import { getOrCreateSessionId } from "@/utils/session";

export default function Home() {
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [subgraphData, setSubgraphData] = useState<any[]>([]);
  const [synthesis, setSynthesis] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal toggle states
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);

  const suggestionPills = [
    "Analyze EGFR pathway interactions",
    "Compare TP53 vs BRCA1 mutations",
    "What's the drug target outlook for Glioblastoma?",
    "Build a pathway thesis for Compound X",
  ];

  const handleExecuteQuery = async (targetQuery?: string) => {
    const q = targetQuery || query;
    if (!q.trim() || loading) return;

    setLoading(true);
    setHasSearched(true);
    setLogs([]);
    setSubgraphData([]);
    setSynthesis("");
    setIsAgentModalOpen(true); // Automatically pop out agent workflow on execution

    const sessionId = getOrCreateSessionId();

    try {
      const response = await fetch("http://localhost:8000/v1/navigate/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-ID": sessionId,
        },
        body: JSON.stringify({ query: q }),
      });

      if (!response.body) throw new Error("Stream disconnected.");

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
            if (data.subgraph_data) setSubgraphData(data.subgraph_data);
            if (data.final_synthesis) setSynthesis(data.final_synthesis);
          }
        }
      }
    } catch (err) {
      setLogs((prev) => [...prev, `Error connecting to backend: ${err}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#070A0F] font-sans text-slate-100 relative">
      {/* Top Header Navbar */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-[#182232] bg-[#070A0F] z-20">
        <div className="flex items-center gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#00E599]/10 border border-[#00E599]/30 flex items-center justify-center p-1">
              <LogoIcon size={14} className="text-[#00E599]" />
            </div>
            <span className="text-xs font-bold text-white tracking-wide">
              BioPathway Agent
            </span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Top-Left Translucent Action Icons */}
          <div className="flex items-center gap-2">
            {/* Docs Icon (Data Sources) */}
            <button
              onClick={() => setIsDocsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111726]/60 hover:bg-[#111726] border border-[#1E293B] text-slate-400 hover:text-slate-200 text-xs transition"
              title="View Data Sources"
            >
              <svg
                className="w-3.5 h-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span>Sources</span>
            </button>

            {/* Agent Icon (Workflow Pop-out Window) */}
            <button
              onClick={() => setIsAgentModalOpen(!isAgentModalOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition ${
                isAgentModalOpen
                  ? "bg-[#062016] border-[#10B981]/50 text-[#10B981]"
                  : "bg-[#111726]/60 hover:bg-[#111726] border-[#1E293B] text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle Agent Workflow"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span>Agent Workflow</span>
              {loading && (
                <span className="w-2 h-2 rounded-full bg-[#00E599] animate-pulse ml-1" />
              )}
            </button>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2 bg-[#0E1522] border border-[#1E293B] px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-[#00E599] animate-pulse" />
          <span className="text-[11px] text-[#00E599] font-mono font-bold tracking-wider">
            LIVE
          </span>
        </div>
      </header>

      {/* Main Full-Screen Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto relative">
        {!hasSearched ? (
          <div className="max-w-xl w-full flex flex-col items-center text-center my-auto">
            {/* Centered Graph Icon Badge */}
            <div className="w-16 h-16 rounded-2xl bg-[#091C17] border border-[#10B981]/30 flex items-center justify-center mb-6 shadow-lg p-3">
              <LogoIcon size={38} className="text-[#00E599]" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Bio-Pathway Agent
            </h1>
            <p className="text-xs text-slate-400 max-w-lg leading-relaxed mb-8">
              Ask me to analyze any biological pathway, assess drug targets, or
              query gene-protein graph relationships.
            </p>

            {/* Suggestion Pills */}
            <div className="flex flex-wrap gap-2.5 justify-center max-w-lg">
              {suggestionPills.map((pill, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(pill);
                    handleExecuteQuery(pill);
                  }}
                  className="bg-[#111726] border border-[#1E293B] hover:border-[#10B981]/50 text-slate-300 hover:text-white px-4 py-2 rounded-full text-xs transition shadow-sm"
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl w-full flex flex-col gap-6 my-auto py-8">
            {/* Synthesis & Subgraph Output */}
            {synthesis && (
              <div className="bg-[#0A0E17] border border-[#182232] rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4 border-b border-[#182232] pb-3">
                  <h2 className="text-sm font-bold text-white">
                    Final Synthesis Report
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#062016] text-[#10B981] border border-[#10B981]/30">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap mb-6">
                  {synthesis}
                </p>

                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
                  Connected Subgraph Nodes
                </h3>
                <pre className="bg-[#111726] p-4 rounded-lg text-xs text-[#00E599] overflow-x-auto max-h-56 font-mono border border-[#1E293B]">
                  {JSON.stringify(subgraphData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- AGENT WORKFLOW POP-OUT WINDOW (MODAL) --- */}
      {isAgentModalOpen && (
        <div className="absolute top-16 left-6 z-50 w-96 bg-[#0A0E17] border border-[#182232] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-4 py-3 bg-[#111726] border-b border-[#182232]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00E599]" />
              <span className="font-bold text-xs uppercase text-slate-200">
                Agent Execution Workflow
              </span>
            </div>
            <button
              onClick={() => setIsAgentModalOpen(false)}
              className="text-slate-400 hover:text-slate-200 text-xs font-mono p-1"
            >
              ✕
            </button>
          </div>
          <div className="p-4 font-mono text-xs text-[#00E599] max-h-80 overflow-y-auto space-y-1.5 bg-[#070A0F]">
            {logs.length === 0 ? (
              <span className="text-slate-500">
                Awaiting query execution... Run a query to stream agent
                thoughts.
              </span>
            ) : (
              logs.map((l, i) => <div key={i}>{`> ${l}`}</div>)
            )}
          </div>
        </div>
      )}

      {/* --- DOCS / DATA SOURCES MODAL (JUST FOR SHOW) --- */}
      {isDocsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0A0E17] border border-[#182232] rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#182232] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-[#00E599]/10 border border-[#00E599]/30 flex items-center justify-center p-0.5">
                  <LogoIcon size={12} className="text-[#00E599]" />
                </div>
                <h2 className="text-sm font-bold text-white">
                  Connected Data Sources
                </h2>
              </div>
              <button
                onClick={() => setIsDocsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs text-slate-300">
              <div className="bg-[#111726] border border-[#1E293B] p-3 rounded-xl">
                <span className="font-bold text-white block mb-1">
                  FalkorDB Cloud Graph
                </span>
                <span className="text-slate-400">
                  Pre-seeded biomedical knowledge graph hosting Disease, Gene,
                  Protein, and Compound relationships.
                </span>
              </div>
              <div className="bg-[#111726] border border-[#1E293B] p-3 rounded-xl">
                <span className="font-bold text-white block mb-1">
                  Upstash Semantic Cache
                </span>
                <span className="text-slate-400">
                  Vector embedding cache for instant retrieval of frequent
                  biological queries.
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsDocsModalOpen(false)}
              className="mt-2 w-full bg-[#1A2333] hover:bg-[#232F45] text-slate-200 border border-[#2B3952] py-2 rounded-xl text-xs font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bottom Anchored Chat / Query Bar */}
      <div className="p-4 bg-[#070A0F] border-t border-[#182232] z-20">
        <div className="max-w-3xl mx-auto flex flex-col gap-1.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteQuery();
            }}
            className="flex items-center gap-3 bg-[#111726] border border-[#1E293B] rounded-xl px-4 py-2.5 focus-within:border-[#10B981]/50 transition shadow-lg"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a biological pathway query or enter a target..."
              className="flex-1 bg-transparent text-xs text-slate-100 focus:outline-none placeholder:text-slate-500 py-1"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#1A2333] hover:bg-[#232F45] text-slate-200 border border-[#2B3952] px-4 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
            >
              {loading ? "Running..." : "Send"}
            </button>
          </form>
          <span className="text-[10px] text-slate-500 text-center font-mono">
            Press Enter to send • Click Agent Workflow top-left to view live
            thoughts
          </span>
        </div>
      </div>
    </div>
  );
}
