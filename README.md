# Bio-Pathway Navigator 🧬🕸️

_Built for Graph Hacks 2026 | Track: Agents That Act on Connected Data_

Bio-Pathway Navigator is a real-time biomedical knowledge graph assistant that connects **FalkorDB Cloud**, **FastAPI** and a **Redis** semantic cache. Powered by a multi-agent LangGraph workflow and hybrid search (BM25 + Dense Embeddings + RRF + Gemini cross-encoder reranking), it enables researchers to explore complex disease interactions, protein pathways, and drug targets in minutes and saves hours if not days of research work.

---

## 🚀 Live Demo & Video

- **Demo Video:** [Watch the 2-Minute Demo on YouTube](https://www.youtube.com/watch?v=aUK457IbbY4)
- **Live Deployment:** [Access the Live App](https://bionavigator-seven.vercel.app/)

---

## 🏗️ Architecture & Tech Stack

- **Graph Database:** FalkorDB Cloud (Hosting an expanded 150k multi-domain biomedical subset derived from Harvard Dataverse PrimeKG).
- **Caching & Rate Limiting:** Upstash Redis (Semantic Vector Caching using `gemini-embedding-2` and sliding-window rate limiters).
- **Backend Orchestration:** FastAPI, LangGraph Multi-Agent Workflow (`Router` -> `Traversal` -> `Critic`), Google GenAI SDK (`gemini-3.8-flash`).
- **Frontend & Visualization:** Next.js (App Router), Tailwind CSS v4, `react-force-graph-3d`, Three.js sprite text rendering.

---

## 🗺️ Graph Data Model

Our knowledge graph models biomedical entities and their mechanistic interactions:

    ┌───────────────┐          interacts_with          ┌───────────────┐
    │  gene/protein │ ───────────────────────────────> │    disease    │
    │  (e.g., EGFR) │                                  │ (e.g., Cancer)│
    └───────────────┘                                  └───────────────┘
            │                                                  ▲
            │ participating_in                                 │ targeted_by
            ▼                                                  │
    ┌───────────────┐                                  ┌───────────────┐
    │    pathway    │ ───────────────────────────────> │  compound /   │
    │ (R-HSA-...)   │          modulates               │  drug target  │
    └───────────────┘                                  └───────────────┘

- **Nodes:** Labeled as `Entity` with properties: `id`, `name`, and `type` (`gene/protein`, `disease`, `pathway`, `compound`).
- **Relationships:** Directed edges representing biological associations (`interacts_with`, `participating_in`, `modulates`).

---

## ⚙️ Cypher Queries & Graph Algorithms

FalkorDB is central to our retrieval pipeline. Powered by **GraphBLAS sparse-matrix linear algebra** under the hood, it replaces traditional pointer-chasing with ultra-fast matrix multiplications. Our multi-agent pipeline leverages both standard OpenCypher traversal patterns and FalkorDB’s native graph algorithm procedures (`CALL algo.*`).

### 1. Hybrid Entity Anchor Search (Router / Traversal Agent)

Used to discover starting seed nodes (genes, proteins, diseases, or compounds) within the 150k PrimeKG graph subset based on extracted user entities.

```cypher
MATCH (n:Entity)
WHERE toLower(n.name) CONTAINS toLower($search_term)
RETURN n.id AS id, n.name AS name, n.type AS type
LIMIT 10
```

### 2. Multi-Hop Path Traversal Query (Graph Traversal Agent)

Traverses outbound and inbound relationships up to 2 hops deep starting from the identified anchor nodes to extract biological interaction chains and pathways.

```cypher
MATCH path = (n:Entity {name: $anchor_node})-[r:interacts_with*1..2]-(m:Entity)
RETURN path
LIMIT 25
```

### 3. Subgraph Entity & Property Expansion Query

Fetches node labels, properties, and relationship types for the retrieved subgraphs to stream clean JSON payloads directly to the 3D Force Graph viewer.

```cypher
MATCH (n:Entity)
WHERE n.name IN $entity_names
OPTIONAL MATCH (n)-[r]-(m:Entity)
RETURN n, r, m
LIMIT 50
```

---

## 🛠️ Local Setup & Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- FalkorDB Cloud Instance & Upstash Redis Database

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure Environment Variables in .env using .env.example as reference
# FALCORDB_URL=redis://...
# REDIS_URL=redis://...
# GEMINI_API_KEY=your_api_key

python main.py
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
