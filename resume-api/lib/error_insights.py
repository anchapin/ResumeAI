"""
Error-to-Insight Pipeline for ResumeAI API

Analyzes errors and converts them into actionable insights:
- Pattern detection in error logs
- Automatic categorization of error types
- Suggestion generation for common errors
- Error trend analysis
"""

import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field

from monitoring.logging_config import get_logger

logger = get_logger("lib.error_insights")


@dataclass
class ErrorInsight:
    """Represents an insight derived from an error"""

    error_type: str
    category: str
    severity: str  # low, medium, high, critical
    message: str
    suggestion: Optional[str] = None
    frequency: int = 1
    first_seen: datetime = field(default_factory=datetime.utcnow)
    last_seen: datetime = field(default_factory=datetime.utcnow)
    related_errors: List[str] = field(default_factory=list)


@dataclass
class ErrorPattern:
    """Represents a detected error pattern"""

    pattern_hash: str
    error_signature: str
    count: int = 0
    last_occurrence: Optional[datetime] = None
    solutions: List[str] = field(default_factory=list)


class ErrorToInsightPipeline:
    """
    Pipeline that converts errors into actionable insights.

    Features:
    - Error pattern detection
    - Automatic categorization
    - Suggestion generation
    - Trend analysis
    """

    # Common error categories and their typical solutions
    ERROR_CATEGORIES = {
        "validation": {
            "keywords": ["validation", "invalid", "required", "format"],
            "severity": "medium",
            "suggestion": "Check request payload format and required fields",
        },
        "authentication": {
            "keywords": ["auth", "token", "unauthorized", "forbidden"],
            "severity": "high",
            "suggestion": "Verify API key or authentication token",
        },
        "rate_limit": {
            "keywords": ["rate", "limit", "too many", "quota"],
            "severity": "medium",
            "suggestion": "Implement exponential backoff or reduce request frequency",
        },
        "timeout": {
            "keywords": ["timeout", "timed out", "slow"],
            "severity": "medium",
            "suggestion": "Check service availability or increase timeout settings",
        },
        "network": {
            "keywords": ["connection", "network", "dns", "refused"],
            "severity": "high",
            "suggestion": "Check network connectivity and service endpoints",
        },
        "resource": {
            "keywords": ["memory", "cpu", "disk", "storage"],
            "severity": "high",
            "suggestion": "Scale resources or optimize resource usage",
        },
        "data": {
            "keywords": ["database", "query", "null", "not found"],
            "severity": "medium",
            "suggestion": "Verify data integrity and check database queries",
        },
    }

    def __init__(self):
        self.error_history: List[Dict[str, Any]] = []
        self.patterns: Dict[str, ErrorPattern] = {}
        self.insights: List[ErrorInsight] = []
        self._max_history = 1000

    def analyze_error(
        self, error: Exception, context: Optional[Dict[str, Any]] = None
    ) -> ErrorInsight:
        """
        Analyze an error and generate an insight.

        Args:
            error: The exception to analyze
            context: Optional context information

        Returns:
            ErrorInsight with analysis results
        """
        error_message = str(error)
        error_type = type(error).__name__

        # Detect category
        category = self._detect_category(error_message)
        category_info = self.ERROR_CATEGORIES.get(category, {})

        # Detect severity
        severity = self._detect_severity(error_message, category_info)

        # Generate suggestion
        suggestion = self._generate_suggestion(error_type, error_message, category)

        # Create insight
        insight = ErrorInsight(
            error_type=error_type,
            category=category,
            severity=severity,
            message=error_message,
            suggestion=suggestion,
        )

        # Store in history
        self._record_error(error_type, error_message, context)

        # Update patterns
        self._update_patterns(error_type, error_message)

        # Add to insights list
        self.insights.append(insight)

        logger.info(f"Error analyzed: {error_type} -> {category} ({severity})")

        return insight

    def _detect_category(self, error_message: str) -> str:
        """Detect error category based on message content"""
        message_lower = error_message.lower()

        for category, info in self.ERROR_CATEGORIES.items():
            for keyword in info["keywords"]:
                if keyword in message_lower:
                    return category

        return "unknown"

    def _detect_severity(self, error_message: str, category_info: Dict[str, Any]) -> str:
        """Detect error severity"""
        # Use category default if available
        if category_info.get("severity"):
            return category_info["severity"]

        # Check for critical keywords
        critical_keywords = ["fatal", "crash", "outage", "breach"]
        if any(kw in error_message.lower() for kw in critical_keywords):
            return "critical"

        return "medium"

    def _generate_suggestion(self, error_type: str, error_message: str, category: str) -> str:
        """Generate actionable suggestion for the error"""
        category_info = self.ERROR_CATEGORIES.get(category, {})

        if category_info.get("suggestion"):
            return category_info["suggestion"]

        # Type-specific suggestions
        type_suggestions = {
            "ValueError": "Check the values provided are valid for the operation",
            "TypeError": "Ensure correct data types are being used",
            "KeyError": "Verify the key exists in the data structure",
            "TimeoutError": "Check service availability and increase timeout if needed",
            "ConnectionError": "Verify network connectivity and service endpoints",
            "PermissionError": "Check user permissions and access controls",
        }

        return type_suggestions.get(error_type, "Review error details and check application logs")

    def _record_error(
        self, error_type: str, error_message: str, context: Optional[Dict[str, Any]]
    ) -> None:
        """Record error in history"""
        record = {
            "error_type": error_type,
            "message": error_message,
            "timestamp": datetime.utcnow(),
            "context": context or {},
        }

        self.error_history.append(record)

        # Trim history if needed
        if len(self.error_history) > self._max_history:
            self.error_history = self.error_history[-self._max_history :]

    def _update_patterns(self, error_type: str, error_message: str) -> None:
        """Update error patterns"""
        # Create pattern hash from error type and first 50 chars of message
        signature = f"{error_type}:{error_message[:50]}"
        pattern_hash = hashlib.md5(signature.encode()).hexdigest()

        if pattern_hash in self.patterns:
            pattern = self.patterns[pattern_hash]
            pattern.count += 1
            pattern.last_occurrence = datetime.utcnow()
        else:
            self.patterns[pattern_hash] = ErrorPattern(
                pattern_hash=pattern_hash,
                error_signature=signature,
                count=1,
                last_occurrence=datetime.utcnow(),
            )

    def get_trending_errors(self, hours: int = 24) -> List[ErrorInsight]:
        """Get errors trending in the last N hours"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)

        trending = [insight for insight in self.insights if insight.last_seen >= cutoff]

        # Sort by frequency
        trending.sort(key=lambda x: x.frequency, reverse=True)

        return trending

    def get_pattern_summary(self) -> Dict[str, Any]:
        """Get summary of detected error patterns"""
        return {
            "total_patterns": len(self.patterns),
            "patterns": [
                {
                    "signature": p.error_signature,
                    "count": p.count,
                    "last_seen": p.last_occurrence.isoformat() if p.last_occurrence else None,
                }
                for p in sorted(self.patterns.values(), key=lambda x: x.count, reverse=True)[:10]
            ],
        }

    def clear_history(self) -> None:
        """Clear error history and patterns"""
        self.error_history.clear()
        self.patterns.clear()
        self.insights.clear()


# Global pipeline instance
_pipeline: Optional[ErrorToInsightPipeline] = None


def get_pipeline() -> ErrorToInsightPipeline:
    """Get or create global pipeline instance"""
    global _pipeline
    if _pipeline is None:
        _pipeline = ErrorToInsightPipeline()
    return _pipeline


def analyze_error(error: Exception, context: Optional[Dict[str, Any]] = None) -> ErrorInsight:
    """
    Convenience function to analyze an error.

    Args:
        error: The exception to analyze
        context: Optional context information

    Returns:
        ErrorInsight with analysis results
    """
    return get_pipeline().analyze_error(error, context)


def get_error_insights() -> List[ErrorInsight]:
    """Get all stored error insights"""
    return get_pipeline().insights


def get_error_trends(hours: int = 24) -> List[ErrorInsight]:
    """Get trending errors from the last N hours"""
    return get_pipeline().get_trending_errors(hours)
