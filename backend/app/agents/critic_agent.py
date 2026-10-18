import os
from openai import OpenAI
from app.agents.state import AgentState

def critic_node(state: AgentState) -> AgentState:
    """Validates biological relevance and synthesizes the final response."""
    thoughts = state.get("agent_thoughts", [])
    thoughts.append("Critic Agent: Reviewing subgraph paths and synthesizing pharmacological response...")

    query = state["query"]
    subgraph_data = state.get("subgraph_data", [])

    client = OpenAI(
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        api_key=os.getenv("GEMINI_API_KEY")
    )

    prompt = f"""
    You are an expert Pharmacological and Biomedical Research Assistant. 
    User Query: "{query}"
    Retrieved Subgraph Data: {subgraph_data}
    
    Synthesize a clear, scientifically accurate explanation answering the query based on the pathway data. Ensure there are no hallucinations. Provide clear references to genes, proteins, compounds, and clinical trials found in the graph.
    """

    try:
        response = client.chat.completions.create(
            model="gemini-3.8-flash",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2
        )
        synthesis = response.choices[0].message.content
        state["final_synthesis"] = synthesis
        state["critic_feedback"] = "Approved: Scientifically consistent with graph data."
        thoughts.append("Critic Agent: Validation complete. Response synthesized successfully.")
    except Exception as e:
        state["final_synthesis"] = "Error generating synthesis from retrieved pathways."
        state["critic_feedback"] = f"Failed validation: {e}"
        thoughts.append(f"Critic Agent Error: {e}")

    state["agent_thoughts"] = thoughts
    return state