import json
import os
from openai import OpenAI
from app.agents.state import AgentState

def router_node(state: AgentState) -> AgentState:
    """Classifies user intent and extracts biomedical entities."""
    query = state["query"]
    thoughts = state.get("agent_thoughts", [])
    thoughts.append(f"Router Agent: Analyzing query intent and extracting entities for: '{query}'")

    client = OpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=os.getenv("GEMINI_API_KEY", "dummy_key")
    )

    prompt = f"""
    You are a biomedical routing agent. Analyze the user query and extract target biomedical entities (Diseases, Genes, Proteins, Compounds, ClinicalTrials) and determine the intent ('pathway_traversal', 'drug_target_lookup', or 'general_inquiry').
    
    Query: "{query}"
    
    Respond STRICTLY in JSON format with keys: "intent", "entities" (list of objects with keys "type" and "name").
    """

    try:
        response = client.chat.completions.create(
            model="gemini-2.5-flash",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        parsed = json.loads(content)
        
        state["intent"] = parsed.get("intent", "pathway_traversal")
        state["extracted_entities"] = parsed.get("entities", [])
        thoughts.append(f"Router Agent: Identified intent '{state['intent']}' with entities {state['extracted_entities']}")
    except Exception as e:
        thoughts.append(f"Router Agent Warning: Falling back to hybrid search due to LLM error: {e}")
        state["intent"] = "pathway_traversal"
        state["extracted_entities"] = [{"type": "Keyword", "name": query}]

    state["agent_thoughts"] = thoughts
    return state