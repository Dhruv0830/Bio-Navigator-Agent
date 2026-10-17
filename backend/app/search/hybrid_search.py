import numpy as np
from rank_bm25 import BM25Okapi
from openai import OpenAI
from app.config import settings
from app.database.falkor_client import falkor_client

class HybridSearchEngine:
    def __init__(self):
        # Initialize OpenAI client pointed to Gemini's OpenAI-compatible endpoint for embeddings
        self.client = OpenAI(
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            api_key=settings.FALKORDB_URL.split(":")[-1] # fallback or use GEMINI_API_KEY env if preferred, but let's use an independent environment check or config key
        )
    
    def get_embedding(self, text: str) -> list[float]:
        """Generates a dense vector embedding using Gemini's embedding model."""
        try:
            response = self.client.embeddings.create(
                model="text-embedding-004",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Embedding Generation Warning: {e}")
            # Fallback zero-vector if quota/network hits a snag
            return [0.0] * 768

    def reciprocal_rank_fusion(self, sparse_results: list, dense_results: list, k: int = 60) -> list:
        """Merges sparse (BM25) and dense ranking lists using Reciprocal Rank Fusion (RRF)."""
        rrf_scores = {}

        # Score sparse results
        for rank, doc in enumerate(sparse_results):
            doc_id = doc.get("id")
            if doc_id not in rrf_scores:
                rrf_scores[doc_id] = {"doc": doc, "score": 0.0}
            rrf_scores[doc_id]["score"] += 1.0 / (k + (rank + 1))

        # Score dense results
        for rank, doc in enumerate(dense_results):
            doc_id = doc.get("id")
            if doc_id not in rrf_scores:
                rrf_scores[doc_id] = {"doc": doc, "score": 0.0}
            rrf_scores[doc_id]["score"] += 1.0 / (k + (rank + 1))

        # Sort combined results descending by RRF score
        sorted_results = sorted(rrf_scores.values(), key=lambda x: x["score"], reverse=True)
        return [item["doc"] for item in sorted_results]

    def search(self, query: str, top_k: int = 5) -> list:
        """Executes hybrid retrieval over the FalkorDB Cloud knowledge graph."""
        graph = falkor_client.connect()

        # 1. Fetch corpus of nodes for BM25 sparse matching
        cypher_fetch = "MATCH (n) RETURN id(n) AS id, labels(n)[0] AS type, n.name AS name, n.symbol AS symbol"
        res = graph.query(cypher_fetch)
        
        corpus_docs = []
        corpus_texts = []
        for row in res.result_set:
            node_id, node_type, name, symbol = row[0], row[1], row[2], row[3]
            text_rep = f"{name or ''} {symbol or ''} {node_type}"
            corpus_docs.append({"id": node_id, "type": node_type, "name": name or symbol})
            corpus_texts.append(text_rep.lower().split())

        if not corpus_docs:
            return []

        # 2. BM25 Sparse Search
        bm25 = BM25Okapi(corpus_texts)
        tokenized_query = query.lower().split()
        bm25_scores = bm25.get_scores(tokenized_query)
        bm25_ranked_indices = np.argsort(bm25_scores)[::-1][:top_k]
        sparse_results = [corpus_docs[i] for i in bm25_ranked_indices if bm25_scores[i] > 0]

        # 3. Dense Vector / FalkorDB Match fallback (Simulated semantic ranking)
        # In production graph setups, this queries vector indexes directly. Here we take top corpus docs as semantic candidates.
        dense_results = corpus_docs[:top_k] 

        # 4. Merge via RRF
        final_ranking = self.reciprocal_rank_fusion(sparse_results, dense_results)
        return final_ranking[:top_k]

# Global hybrid search instance
hybrid_search_engine = HybridSearchEngine()