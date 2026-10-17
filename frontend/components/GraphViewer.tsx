"use client";
import React from "react";

interface GraphViewerProps {
  subgraphData: any[];
}

export default function GraphViewer({ subgraphData }: GraphViewerProps) {
  return (
    <div className="flex flex-col h-full bg-slate-950 p-6 text-slate-200">
      <h2 className="text-xl font-bold mb-4 text-emerald-400">
        Interactive Pathway Graph
      </h2>

      <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden">
        {subgraphData.length === 0 ? (
          <div className="text-center text-slate-500">
            <p>No active graph visualization loaded.</p>
            <p className="text-xs mt-1">
              Submit a query in the chat panel to stream pathways from FalkorDB
              Cloud.
            </p>
          </div>
        ) : (
          <div className="p-4 w-full h-full overflow-auto font-mono text-xs">
            <p className="text-emerald-400 mb-2">
              Active Subgraph Nodes & Relationships:
            </p>
            <pre className="bg-slate-950 p-4 rounded border border-slate-800 text-emerald-200/90 overflow-x-auto">
              {JSON.stringify(subgraphData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
