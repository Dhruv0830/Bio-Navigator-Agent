from langgraph.graph import StateGraph, START, END
from app.agents.state import AgentState
from app.agents.router_agent import router_node
from app.agents.traversal_agent import traversal_node
from app.agents.critic_agent import critic_node

def create_workflow():
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("router", router_node)
    workflow.add_node("traversal", traversal_node)
    workflow.add_node("critic", critic_node)

    # Define edges (Linear flow)
    workflow.add_edge(START, "router")
    workflow.add_edge("router", "traversal")
    workflow.add_edge("traversal", "critic")
    workflow.add_edge("critic", END)

    return workflow.compile()

# Global compiled graph workflow instance
compiled_workflow = create_workflow()