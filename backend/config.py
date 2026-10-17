import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

class Settings:
    # FalkorDB Public Connection URL Parsing
    FALKORDB_URL: str = os.getenv("FALKORDB_URL", "redis://localhost:6379")

    @property
    def parsed_falkor(self) -> dict:
        parsed = urlparse(self.FALKORDB_URL)
        return {
            "host": parsed.hostname or "localhost",
            "port": parsed.port or 6379,
            "password": parsed.password or ""
        }

    # Upstash Redis Connection URL
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")

settings = Settings()