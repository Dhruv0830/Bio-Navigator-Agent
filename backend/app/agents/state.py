from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    query: str
    session_id: str
    intent: Optional[str]
    extracted_entities: List[Dict[str, Any]]
    subgraph_data: List[Dict[str, Any]]
    agent_thoughts: List[str]
    critic_feedback: Optional[str]
    final_synthesis: Optional[str]
    error: Optional[str]