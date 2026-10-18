from falkordb import FalkorDB
from config import settings

class FalkorClient:
    def __init__(self):
        # Pull the full connection URL directly from settings or environment variables
        self.url = getattr(settings, "FALKORDB_URL", "redis://localhost:6379")
        self.graph_name = "biomedical_graph"
        self._db = None
        self._graph = None

    def connect(self):
        if not self._db:
            if not self.url:
                raise ValueError("FALKORDB_URL is not set in your environment variables or config.")
            
            # Ensure the connection string has the proper redis protocol scheme
            conn_url = self.url
            if not conn_url.startswith(("redis://", "rediss://", "unix://")):
                conn_url = f"redis://default:{conn_url}"

            # Connect directly to your FalkorDB Cloud public endpoint
            self._db = FalkorDB.from_url(conn_url)
            self._graph = self._db.select_graph(self.graph_name)
        return self._graph

    @property
    def graph(self):
        if not self._graph:
            return self.connect()
        return self._graph

# Global client instance
falkor_client = FalkorClient()