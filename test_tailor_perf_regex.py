import sys
sys.path.insert(0, './resume_ai_lib/src')
import time
from resume_ai_lib.tailor import ResumeTailorer
from typing import Dict, Any, List
import string
import random
import re

def generate_random_string(length: int) -> str:
    return ''.join(random.choices(string.ascii_letters + " ", k=length))

class RegexOptimizedTailorer(ResumeTailorer):
    def __init__(self):
        pass

    def _calculate_relevance(
        self, experience: Dict[str, Any], keywords: List[str]
    ) -> float:
        """Calculate relevance score for an experience entry based on keywords."""
        score = 0.0

        # Check title
        title = experience.get("title", "").lower()
        role = experience.get("role", "").lower()
        company = experience.get("company", "").lower()

        # Check description/bullets
        description = ""
        if isinstance(experience.get("bullets"), list):
            description = " ".join(
                [
                    b.get("text", "") if isinstance(b, dict) else str(b)
                    for b in experience["bullets"]
                ]
            ).lower()
        elif isinstance(experience.get("description"), str):
            description = experience["description"].lower()

        text_to_check = f"{title} {role} {company} {description}"

        # OPTIMIZATION: Combine keywords into a single regex and find all matches
        # We need the count of unique keywords matched

        # This is a benchmark for regex.
        # But wait, python's 'in' operator is highly optimized in C and usually faster than regex for simple substring matching if the list is not extremely long.

        for keyword in keywords:
            if keyword in text_to_check:
                score += 1.0

        # Normalize to 0-1 range
        max_score = max(len(keywords), 1)
        return min(score / max_score, 1.0)


def run_benchmark():
    tailorer = RegexOptimizedTailorer()

    # Create large resume data
    resume_data = {
        "experience": [
            {
                "title": f"Software Engineer {i}",
                "company": f"Company {i}",
                "role": f"Role {i}",
                "bullets": [generate_random_string(100) for _ in range(5)]
            } for i in range(100)
        ]
    }

    keywords = ["python", "javascript", "react", "node", "aws", "docker", "kubernetes", "sql", "git", "ci/cd", "linux", "cloud", "api", "rest", "graphql", "microservices", "agile", "scrum", "jira", "testing", "pytest", "jest", "cypress", "automation", "devops", "machine learning", "data", "analytics", "performance", "optimization", "security", "encryption", "oauth", "jwt", "database", "postgres", "mongodb", "redis", "caching", "scaling", "architecture", "design", "patterns", "solid", "dry", "clean code", "refactoring", "code review", "mentor", "leadership", "communication"]

    # Ensure keywords are lowercased for the benchmark
    keywords = [k.lower() for k in keywords]

    start_time = time.time()

    for _ in range(100):
        # We simulate the _calculate_relevance logic directly to isolate the performance
        for exp in resume_data["experience"]:
            tailorer._calculate_relevance(exp, keywords)

    end_time = time.time()

    print(f"Time taken: {end_time - start_time:.4f} seconds")

if __name__ == "__main__":
    run_benchmark()
