import os
import pandas as pd
import requests
from falkor_client import falkor_client

def check_and_seed_database():
    print("Checking FalkorDB graph state...")
    graph = falkor_client.graph
    
    # Check if nodes already exist
    try:
        result = graph.query("MATCH (n:Entity) RETURN count(n) AS count")
        node_count = result.result_set[0][0] if result.result_set else 0
    except Exception:
        # If the graph or index doesn't exist yet, count is 0
        node_count = 0

    if node_count > 0:
        print(f"Graph already populated with {node_count:,} nodes. Skipping seed process.")
        return

    print("Graph is empty. Starting automatic multi-domain database seeding...")

    # 2. Download / Load PrimeKG Dataset from Harvard Dataverse
    DATASET_URL = "https://dataverse.harvard.edu/api/access/datafile/6180620"
    LOCAL_CSV = "primekg_multidomain.csv"

    if not os.path.exists(LOCAL_CSV):
        print("Downloading PrimeKG dataset from Harvard Dataverse (this may take a minute)...")
        response = requests.get(DATASET_URL, stream=True)
        with open("raw_primekg.csv", "wb") as f:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)
        
        print("Filtering dataset for Multi-Domain High-Connectivity Hubs...")
        df = pd.read_csv("raw_primekg.csv", low_memory=False)
        
        target_terms = [
            # Oncology & Kinases
            "EGFR", "TP53", "BRCA1", "Glioblastoma", "Lung Cancer", "Breast Cancer", 
            "Melanoma", "Erlotinib", "Gefitinib", "Pembrolizumab",
            # Cardiology & Vascular
            "Heart Failure", "Hypertension", "Coronary Artery Disease", "Statins", 
            "ACE", "AGTR1", "Atherosclerosis",
            # Neurology & Neurodegeneration
            "Alzheimer", "Parkinson", "Multiple Sclerosis", "Amyloid", "Tau", "Memantine",
            # Immunology & Endocrinology / Metabolism
            "TNF", "IL6", "Arthritis", "Diabetes", "Insulin", "Metformin", "Type 2 Diabetes"
        ]
        
        filtered_df = df[
            df['x_name'].str.contains('|'.join(target_terms), case=False, na=False) |
            df['y_name'].str.contains('|'.join(target_terms), case=False, na=False)
        ].head(30000)
        
        filtered_df.to_csv(LOCAL_CSV, index=False)
        print(f"Saved filtered multi-domain subset with {len(filtered_df)} edges to {LOCAL_CSV}")
    else:
        print(f"Loading local multi-domain dataset from {LOCAL_CSV}...")
        filtered_df = pd.read_csv(LOCAL_CSV)

    # 3. Create Cypher Indexes
    print("Configuring graph indexes in FalkorDB...")
    try:
        graph.query("CREATE INDEX FOR (n:Entity) ON (n.name)")
        graph.query("CREATE INDEX FOR (n:Entity) ON (n.type)")
    except Exception as e:
        print(f"Indexes ready or already exist: {e}")

    # 4. Bulk Ingest Nodes and Typed Edges
    print("Ingesting multi-domain nodes and relationships into FalkorDB Cloud...")

    BATCH_SIZE = 500
    records = filtered_df.to_dict("records")
    total_batches = (len(records) // BATCH_SIZE) + 1

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        
        cypher_query = """
        UNWIND $batch AS row
        MERGE (source:Entity {name: row.x_name})
        ON CREATE SET source.type = row.x_type, source.id = row.x_id
        
        MERGE (target:Entity {name: row.y_name})
        ON CREATE SET target.type = row.y_type, target.id = row.y_id
        
        WITH source, target, row
        MERGE (source)-[r:RELATION {type: row.relation}]->(target)
        ON CREATE SET r.display_relation = row.display_relation
        """
        
        graph.query(cypher_query, {"batch": batch})
        print(f"Processed batch {i // BATCH_SIZE + 1} / {total_batches}")

    print("\n---------------------------------------------------")
    print(" Database Seeding Complete Successfully!")
    print(f" Target Graph Name: {falkor_client.graph_name}")
    print("---------------------------------------------------")

if __name__ == "__main__":
    check_and_seed_database()