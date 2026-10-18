import os
import pandas as pd
import requests
from app.database.falkor_client import falkor_client

def check_and_seed_database():
    print("Checking FalkorDB graph state...")
    graph = falkor_client.graph
    
    # Check if nodes already exist to avoid redundant seeding
    try:
        result = graph.query("MATCH (n:Entity) RETURN count(n) AS count")
        node_count = result.result_set[0][0] if result.result_set else 0
    except Exception:
        node_count = 0

    if node_count > 20000:
        print(f"Graph already populated with {node_count:,} nodes. Skipping seed process.")
        return

    print("Graph is empty or incomplete. Verifying local files...")

    DATASET_URL = "https://dataverse.harvard.edu/api/access/datafile/6180620"
    LOCAL_RAW_CSV = "raw_primekg.csv"
    LOCAL_FILTERED_CSV = "primekg_expanded_150k.csv"

    # 1. Download raw_primekg.csv if not present locally (ideal for GitHub repositories)
    if not os.path.exists(LOCAL_RAW_CSV):
        print(f"Local {LOCAL_RAW_CSV} not found. Downloading full PrimeKG dataset (~980 MB, this may take a couple of minutes)...")
        response = requests.get(DATASET_URL, stream=True)
        response.raise_for_status()
        with open(LOCAL_RAW_CSV, "wb") as f:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)
        print("Download complete.")
    else:
        print(f"Found existing local raw dataset at {LOCAL_RAW_CSV}. Skipping download!")

    # 2. Filter / Sample the 150k subset if not already cached
    if not os.path.exists(LOCAL_FILTERED_CSV):
        print("Loading raw dataset and performing expanded multi-domain stratified sampling...")
        df = pd.read_csv(LOCAL_RAW_CSV, low_memory=False)
        
        # Expanded domains covering a wide breadth of precision medicine
        domains = {
            "Oncology": ["EGFR", "TP53", "BRCA1", "Glioblastoma", "Lung Cancer", "Breast Cancer", "Melanoma", "Erlotinib", "Gefitinib", "Pembrolizumab", "KRAS", "MTOR", "Leukemia", "Lymphoma"],
            "Cardiology": ["Heart Failure", "Hypertension", "Coronary Artery Disease", "Statins", "ACE", "AGTR1", "Atherosclerosis", "Myocardial Infarction", "Arrhythmia", "Warfarin"],
            "Neurology": ["Alzheimer", "Parkinson", "Multiple Sclerosis", "Amyloid", "Tau", "Memantine", "Huntington", "Dopamine", "Serotonin", "Epilepsy", "Stroke"],
            "Immunology_Metabolism": ["TNF", "IL6", "Arthritis", "Diabetes", "Insulin", "Metformin", "Type 2 Diabetes", "Asthma", "Lupus", "Immune", "Crohn", "Thyroid"],
            "Pharmacology": ["Antibiotic", "Analgesic", "Opioid", "NSAID", "Antiviral", "Antifungal", "Antibody", "Inhibitor", "Receptor", "Kinase"],
            "Infectious_Diseases": ["COVID-19", "HIV", "Influenza", "Tuberculosis", "Malaria", "Hepatitis", "SARS", "Virus", "Bacterial", "Pathogen"],
            "Psychiatry_MentalHealth": ["Depression", "Schizophrenia", "Bipolar", "Anxiety", "SSRI", "Antipsychotic", "ADHD", "Autism", "PTSD"],
            "Rare_Genetics": ["Cystic Fibrosis", "Sickle Cell", "Duchenne", "Hemophilia", "Mutation", "Genetic", "Chromosome", "Rare Disease"]
        }
        
        sampled_dfs = []
        rows_per_domain = 20000  # 8 domains * 20k max = target cap of ~150k unique rows
        
        for domain_name, terms in domains.items():
            print(f"Sampling domain: {domain_name}...")
            pattern = '|'.join(terms)
            domain_df = df[
                df['x_name'].str.contains(pattern, case=False, na=False) |
                df['y_name'].str.contains(pattern, case=False, na=False)
            ]
            
            if len(domain_df) > rows_per_domain:
                domain_sample = domain_df.sample(n=rows_per_domain, random_state=42)
            else:
                domain_sample = domain_df
            
            sampled_dfs.append(domain_sample)
        
        filtered_df = pd.concat(sampled_dfs).drop_duplicates().head(150000)
        filtered_df.to_csv(LOCAL_FILTERED_CSV, index=False)
        print(f"Saved expanded multi-domain subset with {len(filtered_df):,} edges to {LOCAL_FILTERED_CSV}")
    else:
        print(f"Loading local expanded filtered subset from {LOCAL_FILTERED_CSV}...")
        filtered_df = pd.read_csv(LOCAL_FILTERED_CSV)

    # 3. Create Cypher Indexes FIRST
    print("Configuring graph indexes in FalkorDB...")
    try:
        graph.query("CREATE INDEX FOR (n:Entity) ON (n.name)")
        graph.query("CREATE INDEX FOR (n:Entity) ON (n.type)")
    except Exception as e:
        print(f"Indexes ready or already exist: {e}")

    # 4. Bulk Ingest Nodes and Typed Edges in Optimized Batches
    print("Ingesting ~150,000 expanded rows into FalkorDB Cloud...")

    BATCH_SIZE = 2000
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
        
        batch_num = i // BATCH_SIZE + 1
        if batch_num % 10 == 0 or batch_num == total_batches:
            print(f"Processed batch {batch_num} / {total_batches}")

    # 5. Final Verification Check
    result = graph.query("MATCH (n:Entity)-[r]->(m:Entity) RETURN count(r) AS edge_count, count(n) AS node_count")
    edge_count = result.result_set[0][0]
    node_count = result.result_set[0][1]

    print("\n---------------------------------------------------")
    print(" Expanded 150k Multi-Domain Seeding Complete!")
    print(f" Total Nodes Ingested:  {node_count:,}")
    print(f" Total Edges Ingested:  {edge_count:,}")
    print("---------------------------------------------------")

if __name__ == "__main__":
    check_and_seed_database()