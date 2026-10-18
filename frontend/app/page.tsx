"use client";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import LogoIcon from "@/components/LogoIcon";
import GraphViewer from "@/components/GraphViewer";
import { getOrCreateSessionId } from "@/utils/session";

const STATUS_MESSAGES = [
  "Analyzing query intent & extracting medical entities...",
  "Finding disease connections in FalkorDB...",
  "Thinking in genes, proteins, and molecular pathways...",
  "Running hybrid BM25 + dense vector RRF search...",
  "Synthesizing final pharmacological report...",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [subgraphData, setSubgraphData] = useState<any[]>([]);
  const [synthesis, setSynthesis] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAgentNode, setActiveAgentNode] = useState<string>("idle"); // 'router' | 'traversal' | 'critic' | 'complete'

  // Live Timer & Status Popup States
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);

  // Windows toggle states
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);

  // Timer & 3-second rotating status popup effect
  useEffect(() => {
    let timer: any;
    let rotator: any;
    if (loading) {
      setElapsedSeconds(0);
      setStatusIdx(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      rotator = setInterval(() => {
        setStatusIdx((prev) => (prev + 1) % STATUS_MESSAGES.length);
      }, 3000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      clearInterval(timer);
      clearInterval(rotator);
    };
  }, [loading]);

  // Determine agent status ('done', 'active', or 'pending')
  const getAgentStatus = (agentName: "router" | "traversal" | "critic") => {
    if (activeAgentNode === "complete") return "done";
    if (agentName === "router") {
      if (activeAgentNode === "router") return "active";
      if (["traversal", "critic"].includes(activeAgentNode)) return "done";
    }
    if (agentName === "traversal") {
      if (activeAgentNode === "router") return "pending";
      if (activeAgentNode === "traversal") return "active";
      if (activeAgentNode === "critic") return "done";
    }
    if (agentName === "critic") {
      if (["router", "traversal"].includes(activeAgentNode)) return "pending";
      if (activeAgentNode === "critic") return "active";
    }
    return "pending";
  };

  const routerStatus = getAgentStatus("router");
  const traversalStatus = getAgentStatus("traversal");
  const criticStatus = getAgentStatus("critic");

  const latestThought =
    logs.length > 0 ? logs[logs.length - 1] : "Awaiting user query...";

  const handleExecuteQuery = async (targetQuery?: string) => {
    const q = targetQuery || query;
    if (!q.trim() || loading) return;

    setLoading(true);
    setLogs([]);
    setSubgraphData([]);
    setSynthesis("");
    setIsReportOpen(true);
    setActiveAgentNode("router");

    const sessionId = getOrCreateSessionId();

    try {
      const response = await fetch("/api/query", {
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
            if (data.node) setActiveAgentNode(data.node);
            if (data.thoughts) setLogs((prev) => [...prev, ...data.thoughts]);
            if (data.subgraph_data) setSubgraphData(data.subgraph_data);
            if (data.final_synthesis) setSynthesis(data.final_synthesis);
          }
        }
      }
      setActiveAgentNode("complete");
    } catch (err) {
      setLogs((prev) => [...prev, `Error connecting to backend: ${err}`]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black font-sans text-neutral-100 relative">
      {/* 3D Globe Viewer Background */}
      <GraphViewer
        subgraphData={subgraphData}
        onSelectQuery={(selectedQuery) => {
          setQuery(selectedQuery);
          handleExecuteQuery(selectedQuery);
        }}
      />

      {/* Top Floating Control Bar */}
      <header className="absolute top-6 left-6 right-6 flex items-center justify-between px-6 py-3.5 bg-black/40 backdrop-blur-3xl border border-white/15 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-2xl bg-neutral-900 border border-white/25 flex items-center justify-center p-1.5 shadow-md">
            <LogoIcon size={18} className="text-white" />
          </div>
          <span className="text-xs font-semibold tracking-wide text-white">
            Bio-Pathway Navigator
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDocsOpen(true)}
            className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white text-xs font-medium transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
          >
            Sources
          </button>
          <button
            onClick={() => setIsLogDrawerOpen(!isLogDrawerOpen)}
            className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white text-xs font-medium transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2"
          >
            <span>Execution Logs</span>
            {loading && (
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            )}
          </button>
          {synthesis && (
            <button
              onClick={() => setIsReportOpen(!isReportOpen)}
              className="px-4 py-2 rounded-2xl bg-white/20 hover:bg-white/35 border border-white/30 text-white text-xs font-semibold transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg"
            >
              Synthesis Report
            </button>
          )}
        </div>
      </header>

      {/* --- LARGE CONNECTED VERTICAL WORKFLOW PIPELINE (Top-Left Dock) --- */}
      <div className="absolute top-28 left-6 flex flex-col gap-4 z-30 pointer-events-none w-[410px]">
        {/* Workflow Chain Container */}
        <div className="relative flex flex-col gap-5 pl-6">
          {/* Thick Glowing Connecting Line */}
          <div className="absolute left-[33px] top-8 bottom-8 w-1 bg-white/30 shadow-[0_0_20px_rgba(255,255,255,0.5)] z-0" />

          {/* Agent 1: Router */}
          <div
            className={`relative z-10 pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-3xl backdrop-blur-3xl border transition-all duration-500 shadow-2xl ${
              routerStatus === "active"
                ? "bg-white/25 border-white text-white scale-105 shadow-[0_0_40px_rgba(255,255,255,0.4)]"
                : routerStatus === "done"
                  ? "bg-black/60 border-white/40 text-neutral-200"
                  : "bg-black/60 border-white/10 text-neutral-500"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                routerStatus === "active"
                  ? "bg-white text-black border-white shadow-lg"
                  : routerStatus === "done"
                    ? "bg-neutral-800 text-white border-white/30"
                    : "bg-neutral-900 border-white/10 text-neutral-500"
              }`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase font-mono tracking-widest text-neutral-400">
                Agent 01
              </span>
              <span className="text-sm font-bold text-white tracking-wide">
                Router & Intent Analyzer
              </span>
            </div>
            {routerStatus === "active" && (
              <span className="ml-auto text-[11px] font-mono bg-white text-black px-2.5 py-1 rounded-full font-bold animate-pulse shadow-md">
                Active
              </span>
            )}
            {routerStatus === "done" && (
              <span className="ml-auto text-[11px] font-mono bg-neutral-800 text-white border border-white/30 px-2.5 py-1 rounded-full font-semibold">
                Done
              </span>
            )}
          </div>

          {/* Agent 2: Traversal */}
          <div
            className={`relative z-10 pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-3xl backdrop-blur-3xl border transition-all duration-500 shadow-2xl ${
              traversalStatus === "active"
                ? "bg-white/25 border-white text-white scale-105 shadow-[0_0_40px_rgba(255,255,255,0.4)]"
                : traversalStatus === "done"
                  ? "bg-black/60 border-white/40 text-neutral-200"
                  : "bg-black/60 border-white/10 text-neutral-500"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                traversalStatus === "active"
                  ? "bg-white text-black border-white shadow-lg"
                  : traversalStatus === "done"
                    ? "bg-neutral-800 text-white border-white/30"
                    : "bg-neutral-900 border-white/10 text-neutral-500"
              }`}
            >
              <svg
                className="w-6 h-6"
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
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase font-mono tracking-widest text-neutral-400">
                Agent 02
              </span>
              <span className="text-sm font-bold text-white tracking-wide">
                Graph Traversal Engine
              </span>
            </div>
            {traversalStatus === "active" && (
              <span className="ml-auto text-[11px] font-mono bg-white text-black px-2.5 py-1 rounded-full font-bold animate-pulse shadow-md">
                Active
              </span>
            )}
            {traversalStatus === "done" && (
              <span className="ml-auto text-[11px] font-mono bg-neutral-800 text-white border border-white/30 px-2.5 py-1 rounded-full font-semibold">
                Done
              </span>
            )}
          </div>

          {/* Agent 3: Critic */}
          <div
            className={`relative z-10 pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-3xl backdrop-blur-3xl border transition-all duration-500 shadow-2xl ${
              criticStatus === "active"
                ? "bg-white/25 border-white text-white scale-105 shadow-[0_0_40px_rgba(255,255,255,0.4)]"
                : criticStatus === "done"
                  ? "bg-black/60 border-white/40 text-neutral-200"
                  : "bg-black/60 border-white/10 text-neutral-500"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                criticStatus === "active"
                  ? "bg-white text-black border-white shadow-lg"
                  : criticStatus === "done"
                    ? "bg-neutral-800 text-white border-white/30"
                    : "bg-neutral-900 border-white/10 text-neutral-500"
              }`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase font-mono tracking-widest text-neutral-400">
                Agent 03
              </span>
              <span className="text-sm font-bold text-white tracking-wide">
                Critic & Synthesizer
              </span>
            </div>
            {criticStatus === "active" && (
              <span className="ml-auto text-[11px] font-mono bg-white text-black px-2.5 py-1 rounded-full font-bold animate-pulse shadow-md">
                Active
              </span>
            )}
            {criticStatus === "done" && (
              <span className="ml-auto text-[11px] font-mono bg-neutral-800 text-white border border-white/30 px-2.5 py-1 rounded-full font-semibold">
                Done
              </span>
            )}
          </div>
        </div>

        {/* Live Timer & 3-Sec Rotating Status Popup Box */}
        {loading && (
          <div className="pointer-events-auto bg-black/80 backdrop-blur-3xl border border-white/25 p-4 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-top-2 mt-2 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                Live Agent Stream
              </span>
              <span className="text-xs font-mono text-white font-bold bg-white/10 px-2.5 py-0.5 rounded-full">
                ⏱ {formatTimer(elapsedSeconds)}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping flex-shrink-0" />
              <p className="text-xs font-mono text-neutral-200 leading-relaxed transition-all duration-300">
                {STATUS_MESSAGES[statusIdx]}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* --- FLOATING WINDOW: SYNTHESIS REPORT (Top Right) --- */}
      {isReportOpen && synthesis && (
        <div className="absolute top-28 right-6 w-[520px] max-h-[75vh] bg-black/60 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col z-30 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
            <span className="font-semibold text-sm tracking-wide text-white">
              Final Synthesis Report
            </span>
            <button
              onClick={() => setIsReportOpen(false)}
              className="text-neutral-400 hover:text-white text-xs font-mono p-1 transition-transform hover:scale-125"
            >
              ✕
            </button>
          </div>
          <div className="p-6 overflow-y-auto text-sm text-neutral-200 leading-relaxed space-y-4 font-normal">
            <ReactMarkdown>{synthesis}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* --- TRANSLUCENT FULL EXECUTION LOG DRAWER --- */}
      {isLogDrawerOpen && (
        <div className="absolute top-28 left-[440px] w-[420px] bg-black/50 backdrop-blur-3xl border border-white/20 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col z-30 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
            <span className="font-semibold text-xs tracking-wide text-white">
              Full Execution Stream Logs
            </span>
            <button
              onClick={() => setIsLogDrawerOpen(false)}
              className="text-neutral-400 hover:text-white text-xs font-mono p-1 transition-transform hover:scale-125"
            >
              ✕
            </button>
          </div>
          <div className="p-4 font-mono text-xs text-neutral-300 max-h-80 overflow-y-auto space-y-2">
            {logs.length === 0 ? (
              <span className="text-neutral-500 italic">
                No logs yet. Run a query to start tracing agent execution.
              </span>
            ) : (
              logs.map((l, i) => (
                <div key={i} className="leading-relaxed">{`> ${l}`}</div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- SOURCES MODAL --- */}
      {isDocsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-black/60 backdrop-blur-3xl border border-white/20 rounded-3xl p-6 shadow-[0_30px_70px_rgba(0,0,0,0.95)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-semibold text-white">
                Connected Data Sources
              </span>
              <button
                onClick={() => setIsDocsOpen(false)}
                className="text-neutral-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-3 text-xs text-neutral-300">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <span className="font-semibold text-white block mb-1">
                  Harvard Dataverse PrimeKG Dataset
                </span>
                <span className="text-neutral-400">
                  Expanded 150k multi-domain biomedical graph covering oncology,
                  neurology, cardiology, and pharmacology.
                </span>
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                <span className="font-semibold text-white block mb-1">
                  FalkorDB Cloud & Upstash Redis
                </span>
                <span className="text-neutral-400">
                  Cloud graph execution engine with sliding-window rate limits
                  and semantic vector caching.
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsDocsOpen(false)}
              className="w-full bg-white text-black hover:bg-neutral-200 py-2.5 rounded-2xl text-xs font-semibold transition-all hover:scale-105"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bottom Floating Query Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xl px-6 z-20">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteQuery();
          }}
          className="flex items-center gap-3 bg-black/50 backdrop-blur-3xl border border-white/20 rounded-3xl px-5 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.9)] transition-all duration-300 hover:border-white/40 hover:scale-105"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a biological pathway query or click any globe node..."
            className="flex-1 bg-transparent text-xs text-neutral-100 focus:outline-none placeholder:text-neutral-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-white text-black hover:bg-neutral-200 px-5 py-2 rounded-2xl text-xs font-semibold transition-all duration-300 hover:scale-110 active:scale-95 disabled:opacity-50 shadow-md"
          >
            {loading ? "Running..." : "Search"}
          </button>
        </form>
      </div>
    </div>
  );
}
