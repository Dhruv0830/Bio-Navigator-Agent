from app.agents.state import AgentState
from app.database.falkor_client import falkor_client

def traversal_node(state: AgentState) -> AgentState:
    """Executes multi-hop graph queries on FalkorDB Cloud based on extracted entities."""
    thoughts = state.get("agent_thoughts", [])
    entities = state["extracted_entities"]
    thoughts.append("Traversal Agent: Executing multi-hop graph traversal on FalkorDB Cloud...")

    graph = falkor_client.connect()
    subgraph_results = []

    try:
        if entities:
            # Target specific entity match with multi-hop connections
            entity_name = entities[0].get("name", "")
            cypher_query = f"""
            MATCH path = (d:Disease)-[r1]-(g:Gene)-[r2]-(p:Protein)-[r3]-(c:Compound)
            WHERE toLower(d.name) CONTAINS toLower('{entity_name}') 
               OR toLower(g.symbol) CONTAINS toLower('{entity_name}')
               OR toLower(c.name) CONTAINS toLower('{entity_name}')
            RETURN nodes(path) AS nodes, relationships(path) AS rels
            LIMIT 5
            """
            result = graph.query(cypher_query)
            
            for row in result.result_set:
                nodes, rels = row[0], row[1]
                node_list = [{"id": id(n), "labels": list(n.labels) if hasattr(n, 'labels') else [], "properties": dict(n.properties) if hasattr(n, 'properties') else {}} for n in nodes]
                subgraph_results.append({"path_nodes": node_list})
        
        # Fallback if no specific paths matched
        if not subgraph_results:
            fallback_query = "MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 10"
            res = graph.query(fallback_query)
            thoughts.append("Traversal Agent: No strict path match found, returning general neighborhood subgraph.")
            subgraph_results.append({"fallback_links": len(res.result_set)})

        state["subgraph_data"] = subgraph_results
        thoughts.append(f"Traversal Agent: Successfully retrieved {len(subgraph_results)} pathway subgraphs from cloud graph.")
    except Exception as e:
        state["error"] = str(e)
        thoughts.append(f"Traversal Agent Error: {e}")

    state["agent_thoughts"] = thoughts
    return state