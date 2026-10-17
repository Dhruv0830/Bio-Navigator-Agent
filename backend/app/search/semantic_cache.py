import redis
import json
import numpy as np
from app.config import settings
from openai import OpenAI

class SemanticCache:
    def __init__(self, similarity_threshold: float = 0.92):
        self.redis_client = redis.Redis.from_url(settings.REDIS_URL)
        self.threshold = similarity_threshold
        self.client = OpenAI(
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            api_key=settings.FALKORDB_URL.split(":")[-1]
        )

    def _get_embedding(self, text: str) -> list[float]:
        """Generates embedding vector for cache comparison."""
        try:
            response = self.client.embeddings.create(
                model="text-embedding-004",
                input=text
            )
            return response.data[0].embedding
        except Exception:
            return []

    def _cosine_similarity(self, vec_a: list[float], vec_b: list[float]) -> float:
        """Computes cosine similarity between two float vectors."""
        a = np.array(vec_a)
        b = np.array(vec_b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    def get(self, query: str) -> dict | None:
        """Checks Upstash Redis cache for semantically matching prior queries."""
        query_embedding = self._get_embedding(query)
        if not query_embedding:
            return None

        # Scan cached keys in Upstash Redis
        cache_keys = self.redis_client.keys("sem_cache:*")
        for key in cache_keys:
            cached_data = self.redis_client.hgetall(key)
            if not cached_data:
                continue
            
            cached_embedding = json.loads(cached_data.get(b"embedding", b"[]"))
            if not cached_embedding:
                continue

            similarity = self._cosine_similarity(query_embedding, cached_embedding)
            if similarity >= self.threshold:
                print(f"Semantic Cache HIT ⚡ (Similarity: {similarity:.4f})")
                return json.loads(cached_data.get(b"response", b"{}"))

        return None

    def set(self, query: str, response_data: dict):
        """Stores query embedding and response in Upstash Redis with a 24-hour TTL."""
        query_embedding = self._get_embedding(query)
        if not query_embedding:
            return

        cache_id = abs(hash(query))
        cache_key = f"sem_cache:{cache_id}"

        mapping = {
            "query": query,
            "embedding": json.dumps(query_embedding),
            "response": json.dumps(response_data)
        }

        try:
            pipe = self.redis_client.pipeline()
            pipe.hset(cache_key, mapping=mapping)
            pipe.expire(cache_key, 86400) # Expire in 24 hours
            pipe.execute()
        except redis.RedisError as e:
            print(f"Redis Cache Write Warning: {e}")

# Global semantic cache instance
semantic_cache = SemanticCache()