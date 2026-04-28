import sys
sys.path.insert(0, './resume_ai_lib/src')
import time
from resume_ai_lib.tailor import ResumeTailorer
from typing import Dict, Any, List
import string
import random

def generate_random_string(length: int) -> str:
    return ''.join(random.choices(string.ascii_letters + " ", k=length))

def run_benchmark():
    # We will initialize with OpenAI to avoid the Value error
    # We won't actually call the API in our benchmark.
    try:
        tailorer = ResumeTailorer(ai_provider="openai", api_key="dummy")
    except Exception as e:
        # if openai not installed, try anthropic
        try:
            tailorer = ResumeTailorer(ai_provider="anthropic", api_key="dummy")
        except Exception:
            # Bypass __init__ to test the specific function
            class DummyTailorer(ResumeTailorer):
                def __init__(self):
                    pass
            tailorer = DummyTailorer()


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
