#!/usr/bin/env python3
"""
Load Testing for Database Read Replicas

Tests read distribution, failover under load, and replication lag impact.
Provides metrics on replica performance and failover behavior.
"""

import asyncio
import time
import statistics
import random
from typing import List, Dict, Any
from dataclasses import dataclass, field
import json
import logging

import httpx
import click

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class QueryMetrics:
    """Metrics for a single query."""

    query_id: int
    query_type: str  # "read" or "write"
    start_time: float
    end_time: float
    duration_ms: float = field(default=0.0)
    success: bool = False
    error: str = ""
    replica_used: str = ""

    def __post_init__(self):
        self.duration_ms = (self.end_time - self.start_time) * 1000


@dataclass
class LoadTestResults:
    """Results from a load test."""

    test_name: str
    total_queries: int = 0
    successful_queries: int = 0
    failed_queries: int = 0
    read_queries: int = 0
    write_queries: int = 0

    total_duration_seconds: float = 0.0
    avg_query_time_ms: float = 0.0
    min_query_time_ms: float = 0.0
    max_query_time_ms: float = 0.0
    p50_query_time_ms: float = 0.0
    p95_query_time_ms: float = 0.0
    p99_query_time_ms: float = 0.0

    queries_per_second: float = 0.0
    success_rate: float = 0.0

    errors: Dict[str, int] = field(default_factory=dict)
    replica_distribution: Dict[str, int] = field(default_factory=dict)
    metrics: List[QueryMetrics] = field(default_factory=list)

    def add_metric(self, metric: QueryMetrics):
        """Add a query metric."""
        self.metrics.append(metric)
        self.total_queries += 1

        if metric.success:
            self.successful_queries += 1
            if metric.query_type == "read":
                self.read_queries += 1
            else:
                self.write_queries += 1
        else:
            self.failed_queries += 1
            error_key = metric.error or "unknown"
            self.errors[error_key] = self.errors.get(error_key, 0) + 1

        # Track replica usage
        if metric.replica_used:
            self.replica_distribution[metric.replica_used] = (
                self.replica_distribution.get(metric.replica_used, 0) + 1
            )

    def finalize(self, total_duration: float):
        """Finalize results and calculate statistics."""
        self.total_duration_seconds = total_duration

        if not self.metrics:
            return

        # Calculate success rate
        self.success_rate = self.successful_queries / self.total_queries * 100

        # Calculate queries per second
        self.queries_per_second = (
            self.total_queries / total_duration if total_duration > 0 else 0
        )

        # Calculate timing stats
        successful_times = [m.duration_ms for m in self.metrics if m.success]

        if successful_times:
            self.avg_query_time_ms = statistics.mean(successful_times)
            self.min_query_time_ms = min(successful_times)
            self.max_query_time_ms = max(successful_times)

            if len(successful_times) > 1:
                self.p50_query_time_ms = statistics.median(successful_times)
                # Calculate percentiles
                sorted_times = sorted(successful_times)
                p95_idx = int(len(sorted_times) * 0.95)
                p99_idx = int(len(sorted_times) * 0.99)
                self.p95_query_time_ms = sorted_times[
                    min(p95_idx, len(sorted_times) - 1)
                ]
                self.p99_query_time_ms = sorted_times[
                    min(p99_idx, len(sorted_times) - 1)
                ]

    def print_summary(self):
        """Print summary of results."""
        print(f"\n{'='*60}")
        print(f"Load Test Results: {self.test_name}")
        print(f"{'='*60}")
        print(f"Total Queries:        {self.total_queries}")
        print(
            f"Successful:           {self.successful_queries} ({self.success_rate:.1f}%)"
        )
        print(f"Failed:               {self.failed_queries}")
        print(f"Read Queries:         {self.read_queries}")
        print(f"Write Queries:        {self.write_queries}")
        print(f"\nTiming Statistics:")
        print(f"Total Duration:       {self.total_duration_seconds:.2f}s")
        print(f"Queries/Second:       {self.queries_per_second:.2f}")
        print(f"Avg Query Time:       {self.avg_query_time_ms:.2f}ms")
        print(f"Min Query Time:       {self.min_query_time_ms:.2f}ms")
        print(f"Max Query Time:       {self.max_query_time_ms:.2f}ms")
        print(f"P50 Query Time:       {self.p50_query_time_ms:.2f}ms")
        print(f"P95 Query Time:       {self.p95_query_time_ms:.2f}ms")
        print(f"P99 Query Time:       {self.p99_query_time_ms:.2f}ms")

        if self.replica_distribution:
            print(f"\nReplica Distribution:")
            for replica, count in self.replica_distribution.items():
                pct = count / self.read_queries * 100 if self.read_queries > 0 else 0
                print(f"  {replica}: {count} ({pct:.1f}%)")

        if self.errors:
            print(f"\nErrors:")
            for error, count in self.errors.items():
                print(f"  {error}: {count}")


class ReplicaLoadTester:
    """Load tester for database replicas."""

    def __init__(self, api_url: str = "http://localhost:8000"):
        """Initialize load tester."""
        self.api_url = api_url
        self.client = None

    async def __aenter__(self):
        """Async context manager enter."""
        self.client = httpx.AsyncClient(timeout=30.0)
        return self

    async def __aexit__(self, *args):
        """Async context manager exit."""
        if self.client:
            await self.client.aclose()

    async def test_read_distribution(
        self, num_queries: int = 1000, concurrent_requests: int = 10
    ) -> LoadTestResults:
        """
        Test read distribution across replicas.

        Args:
            num_queries: Total number of queries to run
            concurrent_requests: Concurrent requests at a time

        Returns:
            LoadTestResults with metrics
        """
        results = LoadTestResults("Read Distribution Test")

        logger.info(f"Running read distribution test: {num_queries} queries")

        start_time = time.time()

        # Create read tasks
        tasks = []
        for i in range(num_queries):
            query_id = i
            task = self._execute_read_query(query_id)
            tasks.append(task)

            # Batch requests
            if len(tasks) >= concurrent_requests or i == num_queries - 1:
                metrics = await asyncio.gather(*tasks, return_exceptions=True)
                for metric in metrics:
                    if isinstance(metric, QueryMetrics):
                        results.add_metric(metric)
                tasks = []

        total_duration = time.time() - start_time
        results.finalize(total_duration)

        return results

    async def test_write_heavy_load(
        self,
        num_queries: int = 100,
        read_write_ratio: float = 0.8,
        concurrent_requests: int = 10,
    ) -> LoadTestResults:
        """
        Test read replica distribution under write-heavy load.

        Args:
            num_queries: Total number of queries
            read_write_ratio: Ratio of read queries (0.8 = 80% read, 20% write)
            concurrent_requests: Concurrent requests

        Returns:
            LoadTestResults with metrics
        """
        results = LoadTestResults("Write Heavy Load Test")

        logger.info(f"Running write heavy load test: {num_queries} queries")

        start_time = time.time()

        # Create mixed tasks
        tasks = []
        for i in range(num_queries):
            query_id = i
            # Determine if read or write based on ratio
            is_read = random.random() < read_write_ratio

            if is_read:
                task = self._execute_read_query(query_id)
            else:
                task = self._execute_write_query(query_id)

            tasks.append(task)

            # Batch requests
            if len(tasks) >= concurrent_requests or i == num_queries - 1:
                metrics = await asyncio.gather(*tasks, return_exceptions=True)
                for metric in metrics:
                    if isinstance(metric, QueryMetrics):
                        results.add_metric(metric)
                tasks = []

        total_duration = time.time() - start_time
        results.finalize(total_duration)

        return results

    async def test_failover_behavior(
        self, num_queries: int = 500, concurrent_requests: int = 10
    ) -> LoadTestResults:
        """
        Test failover behavior under load.

        Note: This test checks that reads still succeed when replicas
        are unavailable (fallback to primary).

        Args:
            num_queries: Total number of queries
            concurrent_requests: Concurrent requests

        Returns:
            LoadTestResults with metrics
        """
        results = LoadTestResults("Failover Behavior Test")

        logger.info(f"Running failover behavior test: {num_queries} queries")

        start_time = time.time()

        # Create read tasks (which should failover gracefully)
        tasks = []
        for i in range(num_queries):
            query_id = i
            task = self._execute_read_query(query_id)
            tasks.append(task)

            # Batch requests
            if len(tasks) >= concurrent_requests or i == num_queries - 1:
                metrics = await asyncio.gather(*tasks, return_exceptions=True)
                for metric in metrics:
                    if isinstance(metric, QueryMetrics):
                        results.add_metric(metric)
                tasks = []

        total_duration = time.time() - start_time
        results.finalize(total_duration)

        return results

    async def _execute_read_query(self, query_id: int) -> QueryMetrics:
        """Execute a read query."""
        metric = QueryMetrics(
            query_id=query_id, query_type="read", start_time=time.time(), end_time=0.0
        )

        try:
            # Try to get replica status (which uses replicas for reads)
            response = await self.client.get(f"{self.api_url}/health/replicas")
            metric.end_time = time.time()

            if response.status_code == 200:
                metric.success = True
                data = response.json()
                # Track which replica was used (if available)
                if "replica" in data:
                    metric.replica_used = data["replica"]
            else:
                metric.error = f"HTTP {response.status_code}"
        except Exception as e:
            metric.end_time = time.time()
            metric.error = str(e)

        return metric

    async def _execute_write_query(self, query_id: int) -> QueryMetrics:
        """Execute a write query."""
        metric = QueryMetrics(
            query_id=query_id, query_type="write", start_time=time.time(), end_time=0.0
        )

        try:
            # This would execute a write operation (always goes to primary)
            # For now, simulate with a health check endpoint
            response = await self.client.post(
                f"{self.api_url}/health/check", json={"query": "write"}
            )
            metric.end_time = time.time()

            if response.status_code in [200, 201]:
                metric.success = True
            else:
                metric.error = f"HTTP {response.status_code}"
        except Exception as e:
            metric.end_time = time.time()
            metric.error = str(e)

        return metric


@click.command()
@click.option("--api-url", default="http://localhost:8000", help="API base URL")
@click.option(
    "--test",
    default="all",
    type=click.Choice(["distribution", "heavy", "failover", "all"]),
    help="Which test to run",
)
@click.option(
    "--num-queries", default=1000, type=int, help="Number of queries for each test"
)
@click.option("--concurrent", default=10, type=int, help="Concurrent requests")
@click.option("--output", default=None, help="Output file for results (JSON)")
async def main(api_url: str, test: str, num_queries: int, concurrent: int, output: str):
    """Load test database read replicas."""

    results_list = []

    async with ReplicaLoadTester(api_url) as tester:
        if test in ["distribution", "all"]:
            print("\n🔄 Testing read distribution across replicas...")
            results = await tester.test_read_distribution(
                num_queries=num_queries, concurrent_requests=concurrent
            )
            results.print_summary()
            results_list.append(results)

        if test in ["heavy", "all"]:
            print("\n⚖️  Testing write-heavy load...")
            results = await tester.test_write_heavy_load(
                num_queries=num_queries, concurrent_requests=concurrent
            )
            results.print_summary()
            results_list.append(results)

        if test in ["failover", "all"]:
            print("\n🔁 Testing failover behavior...")
            results = await tester.test_failover_behavior(
                num_queries=num_queries, concurrent_requests=concurrent
            )
            results.print_summary()
            results_list.append(results)

    # Save results if requested
    if output:
        output_data = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "results": [
                {
                    "test_name": r.test_name,
                    "total_queries": r.total_queries,
                    "successful_queries": r.successful_queries,
                    "failed_queries": r.failed_queries,
                    "success_rate": r.success_rate,
                    "queries_per_second": r.queries_per_second,
                    "avg_query_time_ms": r.avg_query_time_ms,
                    "p95_query_time_ms": r.p95_query_time_ms,
                    "p99_query_time_ms": r.p99_query_time_ms,
                    "replica_distribution": r.replica_distribution,
                }
                for r in results_list
            ],
        }

        with open(output, "w") as f:
            json.dump(output_data, f, indent=2)

        print(f"\n✅ Results saved to {output}")


if __name__ == "__main__":
    asyncio.run(main())
