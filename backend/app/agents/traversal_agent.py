from app.agents.state import AgentState
from app.database.falkor_client import falkor_client
from app.search.hybrid_search import hybrid_search_engine

def traversal_node(state: AgentState) -> AgentState:
    """Executes multi-hop graph queries on FalkorDB Cloud using Hybrid Search for intelligent anchor discovery."""
    thoughts = state.get("agent_thoughts", [])
    query = state["query"]
    entities = state["extracted_entities"]
    thoughts.append("Traversal Agent: Initializing hybrid search and multi-hop graph traversal...")

    graph = falkor_client.connect()
    subgraph_results = []

    try:
        # Step 1: Use Hybrid Search to find the most relevant anchor entities in the graph corpus
        search_term = entities[0].get("name", "") if entities else query
        thoughts.append(f"Traversal Agent: Executing hybrid search for anchor term: '{search_term}'")
        hybrid_results = hybrid_search_engine.search(search_term, top_k=3)
        
        anchor_names = [res["name"] for res in hybrid_results if res.get("name")]
        if not anchor_names and entities:
            anchor_names = [e.get("name") for e in entities if e.get("name")]
        if not anchor_names:
            anchor_names = [query]

        thoughts.append(f"Traversal Agent: Identified anchor nodes via hybrid search: {anchor_names}")

        # Step 2: Perform multi-hop graph traversal anchored on the hybrid search results
        for name in anchor_names[:2]:
            cypher_query = f"""
            MATCH path = (n)-[r1]-(m)-[r2]-(p)
            WHERE toLower(n.name) CONTAINS toLower('{name}') 
               OR toLower(n.symbol) CONTAINS toLower('{name}')
            RETURN nodes(path) AS nodes, relationships(path) AS rels
            LIMIT 5
            """
            result = graph.query(cypher_query)
            
            for row in result.result_set:
                nodes, rels = row[0], row[1]
                node_list = [{"id": id(n), "labels": list(n.labels) if hasattr(n, 'labels') else [], "properties": dict(n.properties) if hasattr(n, 'properties') else {}} for n in nodes]
                subgraph_results.append({"anchor": name, "path_nodes": node_list})
        
        # Fallback if no specific paths matched via hybrid search anchors
        if not subgraph_results:
            fallback_query = "MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 10"
            res = graph.query(fallback_query)
            thoughts.append("Traversal Agent: No strict path match found via hybrid anchors, returning general neighborhood subgraph.")
            subgraph_results.append({"fallback_links": len(res.result_set)})

        state["subgraph_data"] = subgraph_results
        thoughts.append(f"Traversal Agent: Successfully retrieved {len(subgraph_results)} pathway subgraphs using hybrid search & graph traversal.")
    except Exception as e:
        state["error"] = str(e)
        thoughts.append(f"Traversal Agent Error: {e}")

    state["agent_thoughts"] = thoughts
    return state