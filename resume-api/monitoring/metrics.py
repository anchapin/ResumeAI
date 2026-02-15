"""Prometheus metrics collection for Resume API."""
from prometheus_client import Counter, Histogram, Gauge, Info
from prometheus_client.registry import CollectorRegistry
from config import settings

registry = CollectorRegistry()

http_requests_total = Counter("http_requests_total", "Total HTTP requests", ["method", "endpoint", "status_code"], registry=registry)
http_request_duration_seconds = Histogram("http_request_duration_seconds", "HTTP latency", ["method", "endpoint"], buckets=(0.1, 0.5, 1.0, 5.0), registry=registry)
http_errors_total = Counter("http_errors_total", "Total HTTP errors", ["method", "endpoint", "status_code"], registry=registry)
rate_limit_exceeded_total = Counter("rate_limit_exceeded_total", "Rate limit violations", ["endpoint"], registry=registry)
pdfs_generated_total = Counter("pdfs_generated_total", "Total PDFs generated", ["variant"], registry=registry)
resumes_tailored_total = Counter("resumes_tailored_total", "Total resumes tailored", ["ai_provider"], registry=registry)
variants_listed_total = Counter("variants_listed_total", "Total variant listings", registry=registry)
active_users_gauge = Gauge("active_users", "Active users", registry=registry)
requests_per_user_gauge = Gauge("requests_per_user_avg", "Avg requests per user", registry=registry)
ai_requests_total = Counter("ai_requests_total", "Total AI requests", ["provider", "model", "status"], registry=registry)
ai_request_duration_seconds = Histogram("ai_request_duration_seconds", "AI latency", ["provider", "model"], buckets=(1, 5, 10, 30, 60), registry=registry)
db_connections_active = Gauge("db_connections_active", "Active DB connections", registry=registry)
db_query_duration_seconds = Histogram("db_query_duration_seconds", "DB query latency", ["operation"], buckets=(0.01, 0.05, 0.1, 0.5, 1.0), registry=registry)
db_queries_total = Counter("db_queries_total", "Total DB queries", ["operation"], registry=registry)
api_info = Info("api", "API info", registry=registry)
api_info.info({"version": settings.app_version, "name": settings.app_name, "debug": str(settings.debug).lower()})

def increment_http_requests(method, endpoint, status_code): http_requests_total.labels(method=method, endpoint=endpoint, status_code=status_code).inc()
def observe_http_request_duration(method, endpoint, duration_seconds): http_request_duration_seconds.labels(method=method, endpoint=endpoint).observe(duration_seconds)
def increment_http_errors(method, endpoint, status_code): http_errors_total.labels(method=method, endpoint=endpoint, status_code=status_code).inc()
def increment_rate_limit_exceeded(endpoint): rate_limit_exceeded_total.labels(endpoint=endpoint).inc()
def increment_pdfs_generated(variant="default"): pdfs_generated_total.labels(variant=variant).inc()
def increment_resumes_tailored(ai_provider="openai"): resumes_tailored_total.labels(ai_provider=ai_provider).inc()
def increment_variants_listed(): variants_listed_total.inc()
def set_active_users(count): active_users_gauge.set(count)
def set_requests_per_user_avg(count): requests_per_user_gauge.set(count)
def increment_ai_requests(provider, model, status="success"): ai_requests_total.labels(provider=provider, model=model, status=status).inc()
def observe_ai_request_duration(provider, model, duration_seconds): ai_request_duration_seconds.labels(provider=provider, model=model).observe(duration_seconds)
def set_db_connections_active(count): db_connections_active.set(count)
def observe_db_query_duration(operation, duration_seconds): db_query_duration_seconds.labels(operation=operation).observe(duration_seconds)
def increment_db_queries(operation): db_queries_total.labels(operation=operation).inc()
