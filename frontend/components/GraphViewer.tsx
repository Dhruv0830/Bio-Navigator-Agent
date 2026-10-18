"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-neutral-500 font-mono text-xs">
      Loading 3D Bio-Graph Engine...
    </div>
  ),
});

interface GraphViewerProps {
  subgraphData: any[];
  onSelectQuery: (query: string) => void;
}

const DYNAMIC_QUERIES = [
  "Analyze EGFR pathway interactions in cancer",
  "Compare TP53 vs BRCA1 DNA repair mutations",
  "What are the primary drug targets for Glioblastoma?",
  "Map cardiovascular disease pathways and lipid metabolism",
  "Investigate kinase inhibitor resistance mechanisms",
  "Explore neurodegenerative protein aggregation in Alzheimer's",
  "Identify inflammatory cytokine networks in autoimmune disorders",
  "Analyze viral entry receptors and pathogen interactions",
];

function createTextSprite(text: string) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (context) {
    context.font = "bold 28px sans-serif";
    const width = context.measureText(text).width + 30;
    canvas.width = width > 60 ? width : 60;
    canvas.height = 48;

    context.fillStyle = "rgba(0, 0, 0, 0.85)";
    if (context.roundRect) {
      context.roundRect(0, 0, canvas.width, canvas.height, 10);
    } else {
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.fill();

    context.font = "bold 24px sans-serif";
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(16, 8, 1);
  return sprite;
}

export default function GraphViewer({
  subgraphData,
  onSelectQuery,
}: GraphViewerProps) {
  const [isClient, setIsClient] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const fgRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Set zoom bounds and stable initial camera distance
  useEffect(() => {
    if (fgRef.current) {
      const controls = fgRef.current.controls();
      if (controls) {
        controls.minDistance = 30;
        controls.maxDistance = 600;
      }
    }
  }, [isClient]);

  // Stable zoom/positioning to distance 150 when live subgraph data arrives
  useEffect(() => {
    if (subgraphData && subgraphData.length > 0 && fgRef.current) {
      setTimeout(() => {
        // Smoothly animate camera distance to exactly 150 to prevent explosion
        fgRef.current.cameraPosition(
          { x: 0, y: 0, z: 150 }, // Target camera position
          { x: 0, y: 0, z: 0 }, // Look at center
          1000, // Transition duration in ms
        );
      }, 300);
    }
  }, [subgraphData]);

  const graphData = useMemo(() => {
    if (!isClient) return { nodes: [], links: [] };

    if (!subgraphData || subgraphData.length === 0) {
      const numNodes = 35;
      const nodes = [];
      const links: any[] = [];

      for (let i = 0; i < numNodes; i++) {
        const randomQuery =
          DYNAMIC_QUERIES[Math.floor(Math.random() * DYNAMIC_QUERIES.length)];
        nodes.push({
          id: `globe_node_${i}`,
          name: `Path ${i + 1}`,
          assignedQuery: randomQuery,
          val: 18,
          color: i % 2 === 0 ? "#ffffff" : "#737373",
          isGlobeNode: true,
        });
      }

      for (let i = 0; i < numNodes; i++) {
        for (let j = i + 1; j < numNodes; j++) {
          if (Math.random() > 0.75) {
            links.push({ source: nodes[i].id, target: nodes[j].id });
          }
        }
      }

      return { nodes, links };
    }

    // Live Subgraph Nodes
    const nodesMap = new Map();
    const links: any[] = [];

    subgraphData.forEach((pathObj) => {
      const pathNodes = pathObj.path_nodes || [];
      pathNodes.forEach((node: any, idx: number) => {
        const nodeId = node.id || node.properties?.name;
        const nodeName = node.properties?.name || "Unknown";
        if (!nodesMap.has(nodeId)) {
          nodesMap.set(nodeId, {
            id: nodeId,
            name: nodeName,
            type: node.properties?.type || "Entity",
            val: 28,
            color: node.properties?.type === "disease" ? "#a3a3a3" : "#ffffff",
          });
        }
        if (idx > 0) {
          const prevId =
            pathNodes[idx - 1].id || pathNodes[idx - 1].properties?.name;
          links.push({ source: prevId, target: nodeId });
        }
      });
    });

    return {
      nodes: Array.from(nodesMap.values()),
      links,
    };
  }, [subgraphData, isClient]);

  if (!isClient) return <div className="flex-1 bg-black" />;

  return (
    <div className="absolute inset-0 w-full h-full bg-black z-0">
      {hoveredNode && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 bg-black/80 backdrop-blur-2xl border border-white/20 px-6 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-center pointer-events-none animate-in fade-in zoom-in-95">
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block mb-1">
            {hoveredNode.isGlobeNode
              ? "Click to Execute Query"
              : `Entity Type: ${hoveredNode.type}`}
          </span>
          <span className="text-xs font-semibold text-white">
            {hoveredNode.isGlobeNode
              ? `"${hoveredNode.assignedQuery}"`
              : hoveredNode.name}
          </span>
        </div>
      )}

      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel={(node: any) =>
          node.isGlobeNode
            ? `💡 Query: ${node.assignedQuery}`
            : `${node.name} (${node.type})`
        }
        nodeColor={(node: any) => node.color}
        nodeVal={(node: any) => node.val}
        nodeThreeObject={(node: any) => createTextSprite(node.name)}
        nodeThreeObjectExtend={true}
        linkColor={() => "rgba(255, 255, 255, 0.3)"}
        linkWidth={3}
        backgroundColor="#000000"
        onNodeHover={(node: any) => setHoveredNode(node)}
        onNodeClick={(node: any) => {
          if (node.isGlobeNode && node.assignedQuery) {
            onSelectQuery(node.assignedQuery);
          }
        }}
      />
    </div>
  );
}
