import os

class Settings:
    # FalkorDB Public Connection URL Parsing
    FALKORDB_URL: str = os.getenv("FALKORDB_URL", "redis://localhost:6379")
    # Upstash Redis Connection URL
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

settings = Settings()
