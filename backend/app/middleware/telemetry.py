from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response

# Prometheus Metrics Definitions
REQUEST_COUNT = Counter(
    "biopathway_http_requests_total",
    "Total HTTP Requests",
    ["method", "endpoint", "http_status"]
)

REQUEST_LATENCY = Histogram(
    "biopathway_http_request_duration_seconds",
    "HTTP Request Latency in Seconds",
    ["endpoint"]
)

CACHE_HITS = Counter(
    "biopathway_cache_hits_total",
    "Total Semantic Cache Hits"
)

AGENT_HOPS = Counter(
    "biopathway_agent_graph_hops_total",
    "Total Multi-Hop Graph Traversals executed"
)

def metrics_endpoint():
    """Exposes Prometheus metrics endpoint for Grafana scraping."""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)