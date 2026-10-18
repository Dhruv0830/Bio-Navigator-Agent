import time
import json
from typing import Optional, Annotated, List
from fastapi import FastAPI, Header, HTTPException
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

load_dotenv()

# Fixed import paths based on your project structure
from app.database.seed_data import check_and_seed_database
from app.middleware.rate_limiter import check_rate_limit, redis_client
from app.search.semantic_cache import semantic_cache
from app.agents.graph_workflow import compiled_workflow

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup Event: Automatically checks graph and seeds 150k subset if empty ---
    try:
        check_and_seed_database()
    except Exception as e:
        print(f"Startup Seeding Warning: {e}")
    yield
    # --- Shutdown Event (if any cleanup is needed) ---

app = FastAPI(
    title="Bio-Pathway Navigator API",
    version="1.0.0",
    lifespan=lifespan,
    description="Multi-agent biomedical graph navigation platform powered by FalkorDB Cloud & Gemini."
)

# CORS Middleware for Next.js Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
class NavigateRequest(BaseModel):
    query: str = Field(..., description="Biomedical navigation or pathway query", example="What compounds target EGFR in Glioblastoma?")

class NavigateResponse(BaseModel):
    session_id: str
    query: str
    intent: Optional[str] = None
    extracted_entities: List[dict] = []
    subgraph_data: List[dict] = []
    agent_thoughts: List[str] = []
    critic_feedback: Optional[str] = None
    final_synthesis: Optional[str] = None
    cached: bool = False

# --- Endpoints ---

@app.get("/")
def health_check():
    """Health check endpoint confirming cloud services connection."""
    return {
        "status": "healthy",
        "service": "Bio-Pathway Navigator Backend",
        "infrastructure": "FalkorDB Cloud & Upstash Redis"
    }


@app.post("/v1/navigate/stream")
async def navigate_stream(
    payload: NavigateRequest,
    x_session_id: Annotated[Optional[str], Header()] = None
):
    """
    Unified SSE streaming endpoint:
    1. Enforces rate limiting per session UUID.
    2. Checks Redis Semantic Cache (streams instantly if hit).
    3. Executes LangGraph multi-agent workflow over FalkorDB Cloud on cache miss.
    4. Persists results to semantic cache and updates Redis session history.
    """
    # 1. Rate Limiting Check (Sliding Window ZSET)
    session_id = check_rate_limit(x_session_id)
    
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    async def event_generator():
        # 2. Semantic Cache Check (Gemini Embeddings + Vector/Cosine Matching)
        cached_result = semantic_cache.get(query)
        if cached_result:
            # Extract the inner response dictionary and flatten it to match frontend root keys
            response_payload = cached_result.get("response", {})
            response_payload["session_id"] = session_id
            response_payload["cached"] = True
            response_payload["node"] = "complete"
            
            # Stream the flattened payload directly
            yield f"data: {json.dumps(response_payload)}\n\n"
            yield f"data: {json.dumps({'status': 'complete'})}\n\n"
            return

        # 3. Execute LangGraph Multi-Agent Workflow on Cache Miss
        initial_state = {
            "query": query,
            "session_id": session_id,
            "intent": None,
            "extracted_entities": [],
            "subgraph_data": [],
            "agent_thoughts": [],
            "critic_feedback": None,
            "final_synthesis": None,
            "error": None
        }
        
        final_thoughts = []
        final_subgraph = []
        final_synthesis_text = None
        final_intent = None
        final_entities = []
        final_critic = None

        try:
            # Stream node updates asynchronously from LangGraph
            async for chunk in compiled_workflow.astream(initial_state, stream_mode="updates"):
                for node_name, state_update in chunk.items():
                    if "agent_thoughts" in state_update:
                        final_thoughts = state_update["agent_thoughts"]
                    if "subgraph_data" in state_update:
                        final_subgraph = state_update["subgraph_data"]
                    if "final_synthesis" in state_update:
                        final_synthesis_text = state_update["final_synthesis"]
                    if "intent" in state_update:
                        final_intent = state_update["intent"]
                    if "extracted_entities" in state_update:
                        final_entities = state_update["extracted_entities"]
                    if "critic_feedback" in state_update:
                        final_critic = state_update["critic_feedback"]

                    event_data = {
                        "node": node_name,
                        "thoughts": state_update.get("agent_thoughts", []),
                        "subgraph_data": state_update.get("subgraph_data", []),
                        "final_synthesis": state_update.get("final_synthesis"),
                        "cached": False
                    }
                    yield f"data: {json.dumps(event_data)}\n\n"
            
            # 4. Assemble payload and store in Semantic Cache
            response_payload = {
                "session_id": session_id,
                "query": query,
                "intent": final_intent,
                "extracted_entities": final_entities,
                "subgraph_data": final_subgraph,
                "agent_thoughts": final_thoughts,
                "critic_feedback": final_critic,
                "final_synthesis": final_synthesis_text,
                "cached": False
            }
            semantic_cache.set(query, response_payload)

            # 5. Record Episodic Session Memory in Upstash Redis
            try:
                history_key = f"session_history:{session_id}"
                redis_client.rpush(history_key, query)
                redis_client.expire(history_key, 86400) # Retain history for 24h
            except Exception as redis_err:
                print(f"Redis Episodic History Warning: {redis_err}")

            yield f"data: {json.dumps({'status': 'complete'})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")