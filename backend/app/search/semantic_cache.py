import os
import hashlib
import json
import numpy as np
import redis
from typing import Optional, Dict, Any
from google import genai
from google.genai import types

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=False)

def cosine_similarity(a: list, b: list) -> float:
    a_arr, b_arr = np.array(a), np.array(b)
    return float(np.dot(a_arr, b_arr) / (np.linalg.norm(a_arr) * np.linalg.norm(b_arr)))

class RedisGeminiSemanticCache:
    def __init__(self, similarity_threshold: float = 0.92, ttl_seconds: int = 86400):
        self.threshold = similarity_threshold
        self.ttl = ttl_seconds
        
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is missing.")
            
        self.client = genai.Client(api_key=api_key)
        self.embedding_model = "gemini-embedding-2"

    def _get_embedding(self, text: str) -> list:
        try:
            response = self.client.models.embed_content(
                model=self.embedding_model,
                contents=text,
                config=types.EmbedContentConfig(output_dimensionality=768)
            )
            # Safe attribute retrieval for google-genai SDK response
            if hasattr(response, 'embeddings') and response.embeddings:
                return response.embeddings[0].values
            elif hasattr(response, 'embedding'):
                return response.embedding
            elif isinstance(response, dict) and 'embedding' in response:
                return response['embedding']
            return [0.0] * 768
        except Exception as e:
            print(f"Embedding Generation Warning: {e}")
            return [0.0] * 768

    def get(self, query_text: str) -> Optional[Dict[str, Any]]:
        try:
            query_vector = self._get_embedding(query_text)
            cache_keys = redis_client.keys(b"cache:*")
            
            best_match = None
            highest_similarity = -1.0
            
            for key in cache_keys:
                raw_data = redis_client.get(key)
                if not raw_data:
                    continue
                
                entry = json.loads(raw_data.decode('utf-8'))
                cached_vector = entry.get("embedding")
                
                if cached_vector:
                    sim = cosine_similarity(query_vector, cached_vector)
                    if sim > highest_similarity:
                        highest_similarity = sim
                        best_match = entry["response"]
            
            if highest_similarity >= self.threshold and best_match:
                return {
                    "response": best_match,
                    "similarity": round(highest_similarity, 4),
                    "cached": True
                }
        except Exception as e:
            print(f"Redis Semantic Cache GET Warning: {e}")
            
        return None

    def set(self, query_text: str, response_data: Any):
        try:
            query_vector = self._get_embedding(query_text)
            query_hash = hashlib.sha256(query_text.encode()).hexdigest()
            cache_key = f"cache:{query_hash}"
            
            payload = {
                "query": query_text,
                "embedding": query_vector,
                "response": response_data
            }
            
            redis_client.setex(
                name=cache_key,
                time=self.ttl,
                value=json.dumps(payload)
            )
        except Exception as e:
            print(f"Redis Semantic Cache SET Warning: {e}")

semantic_cache = RedisGeminiSemanticCache(similarity_threshold=0.92, ttl_seconds=86400)