bio-pathway-navigator/
├── README.md # Professional architectural overview & cloud setup guide
├── backend/ # FastAPI Python Backend
│ ├── Dockerfile # For cloud deployment (Render, Railway, Fly.io)
│ ├── requirements.txt # fastapi, uvicorn, redis, falkordb, langgraph, openai, etc.
│ ├── .env.example # Template for FalkorDB Cloud & Upstash credentials
│ ├── .env # Active cloud configuration keys (Ignored in git)
│ └── app/
│ ├── main.py # FastAPI entrypoint, session middleware, & routes
│ ├── config.py # Centralized configuration loader for cloud hosts
│ ├── database/
│ │ ├── falkor_client.py # FalkorDB Cloud connection & query executor
│ │ └── seed_data.py # Remote script to seed biomedical nodes/edges into FalkorDB Cloud
│ ├── search/
│ │ ├── hybrid_search.py # BM25 sparse search + Dense vector scoring (RRF)
│ │ └── semantic_cache.py # Upstash Redis semantic caching layer
│ ├── agents/
│ │ ├── state.py # LangGraph state schema (PathwayState)
│ │ ├── router_agent.py # Intent parsing & query routing
│ │ ├── traversal_agent.py # Multi-hop Cypher tool execution agent
│ │ └── critic_agent.py # Pharmacological safety & validation critic
│ └── middleware/
│ ├── rate_limiter.py # Upstash Redis token bucket rate limiter (per session UUID)
│ └── telemetry.py # Prometheus metrics exporter
└── frontend/ # Next.js 14/15 Frontend
├── package.json
├── tailwind.config.js
└── src/
├── app/
│ ├── page.tsx # Main dashboard (Chat panel + Graph visualizer)
│ └── layout.tsx # Root layout with session UUID provider
├── utils/
│ └── session.ts # Client-side localStorage UUID generator & header injector
└── components/
├── GraphViewer.tsx # Interactive visual graph rendering component
├── ChatPanel.tsx # Live chat stream & agent thought logs
└── MetricsCard.tsx # Real-time latency & cache hit status indicators

[ Next.js Frontend ]
│ (Sends POST with JSON payload + 'X-Session-ID' header)
▼
[ FastAPI Gateway ]
│
├─► 1. Rate Limiter Middleware (Upstash Redis)
│ └─► Checks session token bucket. Rejects if >30 req/min.
│
├─► 2. Semantic Cache Lookup (Upstash Redis)
│ └─► Checks if vector similarity >= 0.95.
│ (If HIT ⚡: Returns cached graph data instantly, bypassing agents!)
│
└─► 3. LangGraph Multi-Agent Pipeline (Cache MISS)
├─► Router Agent: Parses intent & extracts entities
├─► Hybrid Search: BM25 sparse + Dense vectors (RRF) ──► FalkorDB Cloud (Finds Seed Nodes)
├─► Traversal Agent: Executes multi-hop Cypher queries ──► FalkorDB Cloud (Traverses Graph)
└─► Critic Agent: Validates medical relevance & filters hallucinations (Gemini API)
│
[ Storage & Persistence ]
└─► Saves result to Upstash Semantic Cache & appends query to Session Episodic Memory (`session_id`)
│
[ Response Delivery ]
└─► Returns structured JSON (Seed nodes, Subgraph edges, Agent thoughts, Synthesized answer)
└─► [ Frontend Renders Chat + Interactive Graph ]
