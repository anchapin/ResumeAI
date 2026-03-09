"""
N+1 Query Detector

Monitors SQLAlchemy queries to detect N+1 query patterns.
Use during development to identify performance issues.
"""

import logging
import time
from collections import defaultdict
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class QueryInfo:
    """Information about a single query."""

    sql: str
    duration: float
    timestamp: float
    table: str


@dataclass
class N1QueryPattern:
    """Represents a potential N+1 query pattern."""

    base_table: str
    related_table: str
    queries: List[QueryInfo] = field(default_factory=list)
    total_time: float = 0.0


class N1QueryDetector:
    """Detects N+1 query patterns in SQLAlchemy."""

    def __init__(self, threshold: int = 3):
        self.threshold = threshold  # Number of queries to same table to flag
        self.queries: List[QueryInfo] = []
        self._query_counts: Dict[str, int] = defaultdict(int)
        self._enabled = False

    def enable(self):
        """Enable query detection."""
        self._enabled = True
        self.queries.clear()
        self._query_counts.clear()

    def disable(self):
        """Disable query detection."""
        self._enabled = False

    def record_query(self, sql: str, duration: float):
        """Record a query for analysis."""
        if not self._enabled:
            return

        # Extract table name from SQL
        table = self._extract_table(sql)
        if not table:
            return

        query_info = QueryInfo(sql=sql, duration=duration, timestamp=time.time(), table=table)
        self.queries.append(query_info)
        self._query_counts[table] += 1

    def _extract_table(self, sql: str) -> Optional[str]:
        """Extract table name from SQL query."""
        sql = sql.upper()
        if "FROM" in sql:
            start = sql.find("FROM") + 5
            end = sql.find(" ", start)
            if end == -1:
                end = len(sql)
            table = sql[start:end].strip()
            return table.rstrip(")").lstrip("(")
        return None

    def detect_n1_patterns(self) -> List[N1QueryPattern]:
        """Detect N+1 query patterns."""
        if not self._enabled:
            return []

        patterns = []

        # Find tables queried multiple times
        for table, count in self._query_counts.items():
            if count >= self.threshold:
                table_queries = [q for q in self.queries if q.table == table]

                # Check if these are repeated queries (N+1 pattern)
                if self._is_repeated_pattern(table_queries):
                    total_time = sum(q.duration for q in table_queries)
                    patterns.append(
                        N1QueryPattern(
                            base_table="unknown",  # Would need more analysis
                            related_table=table,
                            queries=table_queries,
                            total_time=total_time,
                        )
                    )

        return patterns

    def _is_repeated_pattern(self, queries: List[QueryInfo]) -> bool:
        """Check if queries look like N+1 pattern (similar SQL)."""
        if len(queries) < 2:
            return False

        # Compare first parts of SQL (before WHERE)
        first_sqls = [q.sql.split("WHERE")[0].strip() for q in queries]
        first = first_sqls[0]

        # Count how many match the first pattern
        matches = sum(1 for s in first_sqls if s == first)

        return matches >= self.threshold

    def get_report(self) -> str:
        """Generate a report of N+1 patterns found."""
        patterns = self.detect_n1_patterns()

        if not patterns:
            return "No N+1 query patterns detected."

        lines = ["N+1 Query Patterns Detected", "=" * 40]

        for pattern in patterns:
            lines.append(f"\nTable: {pattern.related_table}")
            lines.append(f"Query count: {len(pattern.queries)}")
            lines.append(f"Total time: {pattern.total_time:.3f}s")

            # Show unique queries
            unique_queries = set(q.sql[:100] for q in pattern.queries)
            lines.append(f"Unique query patterns: {len(unique_queries)}")

        return "\n".join(lines)


# Global detector instance
_detector = N1QueryDetector()


def get_detector() -> N1QueryDetector:
    """Get the global N+1 query detector."""
    return _detector


@contextmanager
def detect_n1_queries(threshold: int = 3):
    """Context manager to detect N+1 queries."""
    detector = N1QueryDetector(threshold=threshold)
    detector.enable()
    try:
        yield detector
    finally:
        detector.disable()
        report = detector.get_report()
        if "No N+1" not in report:
            logger.warning(report)
