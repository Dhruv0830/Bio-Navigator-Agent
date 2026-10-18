from fastapi import Header, HTTPException
from typing import Optional, Annotated
import redis
import time
import uuid
from config import settings

# Initialize Upstash Redis client
redis_client = redis.Redis.from_url(settings.REDIS_URL)

def check_rate_limit(x_session_id: Annotated[Optional[str], Header()] = None) -> str:
    """
    Sliding-window token bucket rate limiter: 30 requests per 60 seconds per session.
    """
    if not x_session_id:
        x_session_id = str(uuid.uuid4())
    
    bucket_key = f"rate_limit:{x_session_id}"
    current_time = time.time()
    
    try:
        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(bucket_key, 0, current_time - 60)
        pipe.zcard(bucket_key)
        pipe.zadd(bucket_key, {str(current_time): current_time})
        pipe.expire(bucket_key, 60)
        _, request_count, _, _ = pipe.execute()
        
        if request_count > 30:
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Too many requests in a 60-second window."
            )
    except redis.RedisError as e:
        print(f"Redis Rate Limiter Warning (Fail-Open): {e}")
        
    return x_session_id