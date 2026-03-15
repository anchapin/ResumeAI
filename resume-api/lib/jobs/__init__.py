"""
Jobs Module

Job aggregation, search, and recommendations.
"""

from .aggregator import JobAggregator
from .dedup import JobDeduplicator
from .schema import JobPosting

__all__ = [
    "JobAggregator",
    "JobDeduplicator",
    "JobPosting",
]
