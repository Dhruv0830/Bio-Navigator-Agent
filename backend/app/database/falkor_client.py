from falkordb import FalkorDB
from app.config import settings

class FalkorClient:
    def __init__(self):
        self.host = settings.FALKORDB_HOST
        self.port = settings.FALKORDB_PORT
        self.password = settings.FALKORDB_PASSWORD
        self.graph_name = "biomedical_graph"
        self._db = None
        self._graph = None

    def connect(self):
        if not self._db:
            if self.password:
                self._db = FalkorDB(host=self.host, port=self.port, password=self.password)
            else:
                self._db = FalkorDB(host=self.host, port=self.port)
            self._graph = self._db.select_graph(self.graph_name)
        return self._graph

    @property
    def graph(self):
        if not self._graph:
            return self.connect()
        return self._graph

# Global client instance
falkor_client = FalkorClient()