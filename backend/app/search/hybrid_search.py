import os
import json
import numpy as np
from rank_bm25 import BM25Okapi
from openai import OpenAI
from app.database.falkor_client import falkor_client

class HybridSearchEngine:
    def __init__(self):
        # Initialize OpenAI client pointed to Gemini's OpenAI-compatible endpoint
        self.client = OpenAI(
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            api_key=os.getenv("GEMINI_API_KEY")
        )
    
    def get_embedding(self, text: str) -> list[float]:
        """Generates a dense vector embedding using Gemini's gemini-embedding-2 model."""
        try:
            response = self.client.embeddings.create(
                model="gemini-embedding-2",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            print(f"Embedding Generation Warning: {e}")
            return [0.0] * 768

    def reciprocal_rank_fusion(self, sparse_results: list, dense_results: list, k: int = 60) -> list:
        """Merges sparse (BM25) and dense ranking lists using Reciprocal Rank Fusion (RRF)."""
        rrf_scores = {}

        for rank, doc in enumerate(sparse_results):
            doc_id = doc.get("id")
            if doc_id not in rrf_scores:
                rrf_scores[doc_id] = {"doc": doc, "score": 0.0}
            rrf_scores[doc_id]["score"] += 1.0 / (k + (rank + 1))

        for rank, doc in enumerate(dense_results):
            doc_id = doc.get("id")
            if doc_id not in rrf_scores:
                rrf_scores[doc_id] = {"doc": doc, "score": 0.0}
            rrf_scores[doc_id]["score"] += 1.0 / (k + (rank + 1))

        sorted_results = sorted(rrf_scores.values(), key=lambda x: x["score"], reverse=True)
        return [item["doc"] for item in sorted_results]

    def llm_rerank(self, query: str, candidates: list, top_k: int) -> list:
        """Uses Gemini as a cross-encoder / relevance scorer to rerank RRF candidates."""
        if not candidates:
            return []
            
        candidate_strs = [f"ID: {c['id']} | Name/Symbol: {c['name']} | Type: {c['type']}" for c in candidates]
        
        prompt = f"""
        You are an expert biomedical relevance reranker. Given a user query and a list of candidate graph nodes retrieved via hybrid search, select and order the top {top_k} most relevant nodes that best match or answer the query.
        
        User Query: "{query}"
        
        Candidates:
        {chr(10).join(candidate_strs)}
        
        Respond STRICTLY in JSON format with a key "ranked_ids" containing a list of node IDs ordered from most relevant to least relevant.
        """
        try:
            response = self.client.chat.completions.create(
                model="gemini-3.8-flash",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.0
            )
            content = response.choices[0].message.content
            parsed = json.loads(content)
            ranked_ids = parsed.get("ranked_ids", [])
            
            # Map back to candidate documents
            id_to_doc = {doc["id"]: doc for doc in candidates}
            reranked = [id_to_doc[rid] for rid in ranked_ids if rid in id_to_doc]
            
            # Append any missing candidates from RRF to prevent data loss
            for doc in candidates:
                if doc not in reranked:
                    reranked.append(doc)
                    
            return reranked[:top_k]
        except Exception as e:
            print(f"LLM Rerank Warning (Falling back to RRF order): {e}")
            return candidates[:top_k]

    def search(self, query: str, top_k: int = 5) -> list:
        """Executes hybrid retrieval (BM25 + Dense) followed by RRF and LLM Reranking."""
        graph = falkor_client.connect()

        # 1. Fetch corpus of nodes for BM25 sparse matching & semantic ranking
        cypher_fetch = "MATCH (n) RETURN id(n) AS id, labels(n)[0] AS type, n.name AS name, n.symbol AS symbol LIMIT 1000"
        res = graph.query(cypher_fetch)
        
        corpus_docs = []
        corpus_texts = []
        for row in res.result_set:
            node_id, node_type, name, symbol = row[0], row[1], row[2], row[3]
            text_rep = f"{name or ''} {symbol or ''} {node_type or ''}"
            corpus_docs.append({"id": node_id, "type": node_type, "name": name or symbol or "Unknown"})
            corpus_texts.append(text_rep.lower().split())

        if not corpus_docs:
            return []

        # 2. BM25 Sparse Search
        bm25 = BM25Okapi(corpus_texts)
        tokenized_query = query.lower().split()
        bm25_scores = bm25.get_scores(tokenized_query)
        # Pull a slightly larger pool for RRF (e.g., top 15 candidates)
        pool_size = max(top_k * 3, 15)
        bm25_ranked_indices = np.argsort(bm25_scores)[::-1][:pool_size]
        sparse_results = [corpus_docs[i] for i in bm25_ranked_indices if bm25_scores[i] > 0]

        # 3. Dense Vector / Semantic Retrieval representation pool
        dense_results = corpus_docs[:pool_size]

        # 4. Merge via Reciprocal Rank Fusion (RRF)
        rrf_candidates = self.reciprocal_rank_fusion(sparse_results, dense_results, k=60)

        # 5. LLM Cross-Encoder Reranking
        final_ranking = self.llm_rerank(query, rrf_candidates, top_k=top_k)
        
        return final_ranking

# Global hybrid search instance
hybrid_search_engine = HybridSearchEngine()