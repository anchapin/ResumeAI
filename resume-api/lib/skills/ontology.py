"""
Skills Ontology

Database of skills with categories, synonyms, and relationships.
Extends existing skills ontology from match.py.
"""

import logging
from typing import Literal

logger = logging.getLogger(__name__)


# Skills database organized by category
SKILLS_DATABASE = {
    # Technical Skills - Programming Languages
    "technical": {
        "languages": [
            {"name": "Python", "synonyms": ["Python 3", "Python 2", "Python programming"]},
            {"name": "Java", "synonyms": ["Java 8", "Java 11", "Java programming", "J2EE"]},
            {"name": "JavaScript", "synonyms": ["JS", "ES6", "ECMAScript", "Vanilla JS"]},
            {"name": "TypeScript", "synonyms": ["TS", "TypeScript 4"]},
            {"name": "Go", "synonyms": ["Golang", "Go programming"]},
            {"name": "Rust", "synonyms": ["Rust programming"]},
            {"name": "C++", "synonyms": ["C++11", "C++14", "C++17", "CPP"]},
            {"name": "C#", "synonyms": ["CSharp", "C Sharp", ".NET"]},
            {"name": "Ruby", "synonyms": ["Ruby programming", "Ruby on Rails"]},
            {"name": "PHP", "synonyms": ["PHP 7", "PHP 8", "PHP programming"]},
            {"name": "Swift", "synonyms": ["Swift programming", "iOS Swift"]},
            {"name": "Kotlin", "synonyms": ["Kotlin programming", "Android Kotlin"]},
            {"name": "Scala", "synonyms": ["Scala programming"]},
            {"name": "R", "synonyms": ["R programming", "R language"]},
            {"name": "MATLAB", "synonyms": ["MATLAB programming"]},
            {"name": "SQL", "synonyms": ["SQL queries", "SQL programming", "T-SQL", "PL/SQL"]},
            {"name": "Shell", "synonyms": ["Bash", "Shell scripting", "Bash scripting"]},
        ],
        "frameworks": [
            {"name": "React", "synonyms": ["React.js", "ReactJS", "React Native"]},
            {"name": "Angular", "synonyms": ["AngularJS", "Angular 2+", "Angular framework"]},
            {"name": "Vue.js", "synonyms": ["Vue", "VueJS", "Vue 3"]},
            {"name": "Django", "synonyms": ["Django framework", "Django REST"]},
            {"name": "Flask", "synonyms": ["Flask framework", "Flask API"]},
            {"name": "FastAPI", "synonyms": ["FastAPI framework"]},
            {"name": "Spring", "synonyms": ["Spring Boot", "Spring Framework", "Spring MVC"]},
            {"name": "Express", "synonyms": ["Express.js", "ExpressJS", "Express framework"]},
            {"name": "Next.js", "synonyms": ["NextJS", "Next"]},
            {"name": "TensorFlow", "synonyms": ["TF", "TensorFlow 2"]},
            {"name": "PyTorch", "synonyms": ["PyTorch framework"]},
            {"name": "Scikit-learn", "synonyms": ["sklearn", "scikit-learn"]},
            {"name": "Pandas", "synonyms": ["Pandas library", "Python Pandas"]},
            {"name": "NumPy", "synonyms": ["Numpy", "Python NumPy"]},
            {"name": "Node.js", "synonyms": ["Node", "NodeJS", "Node.js framework"]},
        ],
    },
    # Tools & Platforms
    "tools": {
        "cloud": [
            {"name": "AWS", "synonyms": ["Amazon Web Services", "AWS Cloud", "EC2", "S3", "Lambda"]},
            {"name": "Azure", "synonyms": ["Microsoft Azure", "Azure Cloud"]},
            {"name": "GCP", "synonyms": ["Google Cloud Platform", "Google Cloud", "GCP Cloud"]},
            {"name": "Heroku", "synonyms": ["Heroku platform"]},
            {"name": "Vercel", "synonyms": ["Vercel platform"]},
            {"name": "Netlify", "synonyms": ["Netlify platform"]},
        ],
        "devops": [
            {"name": "Docker", "synonyms": ["Docker containers", "Docker containerization"]},
            {"name": "Kubernetes", "synonyms": ["K8s", "Kubernetes orchestration"]},
            {"name": "Jenkins", "synonyms": ["Jenkins CI", "Jenkins CI/CD"]},
            {"name": "GitLab CI", "synonyms": ["GitLab CI/CD", "GitLab pipelines"]},
            {"name": "GitHub Actions", "synonyms": ["GitHub Actions CI", "Actions"]},
            {"name": "Terraform", "synonyms": ["Terraform IaC", "Infrastructure as Code"]},
            {"name": "Ansible", "synonyms": ["Ansible automation"]},
            {"name": "Prometheus", "synonyms": ["Prometheus monitoring"]},
            {"name": "Grafana", "synonyms": ["Grafana dashboards", "Grafana monitoring"]},
        ],
        "databases": [
            {"name": "PostgreSQL", "synonyms": ["Postgres", "PostgreSQL database"]},
            {"name": "MySQL", "synonyms": ["MySQL database", "MySQL DB"]},
            {"name": "MongoDB", "synonyms": ["Mongo", "MongoDB database", "NoSQL MongoDB"]},
            {"name": "Redis", "synonyms": ["Redis cache", "Redis database"]},
            {"name": "Elasticsearch", "synonyms": ["Elastic Search", "Elasticsearch search"]},
            {"name": "SQLite", "synonyms": ["SQLite database"]},
            {"name": "DynamoDB", "synonyms": ["AWS DynamoDB", "DynamoDB NoSQL"]},
        ],
        "ide": [
            {"name": "VS Code", "synonyms": ["Visual Studio Code", "VSCode"]},
            {"name": "IntelliJ", "synonyms": ["IntelliJ IDEA", "IntelliJ IDE"]},
            {"name": "PyCharm", "synonyms": ["PyCharm IDE", "JetBrains PyCharm"]},
            {"name": "Vim", "synonyms": ["Vim editor", "ViM"]},
            {"name": "Emacs", "synonyms": ["Emacs editor"]},
        ],
    },
    # Soft Skills
    "soft": {
        "communication": [
            {"name": "Communication", "synonyms": ["Communication skills", "Verbal communication", "Written communication"]},
            {"name": "Presentation", "synonyms": ["Presentation skills", "Public speaking"]},
            {"name": "Documentation", "synonyms": ["Technical writing", "Documentation skills"]},
            {"name": "Collaboration", "synonyms": ["Teamwork", "Cross-functional collaboration"]},
        ],
        "leadership": [
            {"name": "Leadership", "synonyms": ["Team leadership", "Technical leadership"]},
            {"name": "Mentoring", "synonyms": ["Mentorship", "Coaching", "Mentoring junior developers"]},
            {"name": "Management", "synonyms": ["Project management", "People management", "Engineering management"]},
            {"name": "Strategy", "synonyms": ["Strategic thinking", "Strategic planning"]},
        ],
        "problem_solving": [
            {"name": "Problem Solving", "synonyms": ["Problem-solving", "Analytical thinking", "Critical thinking"]},
            {"name": "Debugging", "synonyms": ["Debugging skills", "Troubleshooting"]},
            {"name": "Optimization", "synonyms": ["Performance optimization", "Code optimization"]},
        ],
        "work_habits": [
            {"name": "Time Management", "synonyms": ["Time management", "Prioritization"]},
            {"name": "Adaptability", "synonyms": ["Flexibility", "Adaptable"]},
            {"name": "Self-motivated", "synonyms": ["Self-starter", "Proactive", "Independent"]},
            {"name": "Attention to Detail", "synonyms": ["Detail-oriented", "Detail oriented"]},
        ],
    },
    # Domain Skills
    "domain": {
        "software_engineering": [
            {"name": "Software Development", "synonyms": ["Software engineering", "Application development"]},
            {"name": "API Design", "synonyms": ["REST API", "RESTful API", "API development", "GraphQL"]},
            {"name": "System Design", "synonyms": ["Architecture design", "Distributed systems", "Microservices"]},
            {"name": "Testing", "synonyms": ["Unit testing", "Integration testing", "Test-driven development", "TDD"]},
            {"name": "Code Review", "synonyms": ["Code review", "Peer review"]},
            {"name": "Agile", "synonyms": ["Agile methodology", "Scrum", "Sprint", "Kanban"]},
            {"name": "CI/CD", "synonyms": ["Continuous integration", "Continuous deployment", "DevOps"]},
        ],
        "data_science": [
            {"name": "Data Analysis", "synonyms": ["Data analytics", "Analyzing data"]},
            {"name": "Machine Learning", "synonyms": ["ML", "Machine learning algorithms", "Deep learning"]},
            {"name": "Data Visualization", "synonyms": ["Data viz", "Visualization", "Tableau", "PowerBI"]},
            {"name": "Statistics", "synonyms": ["Statistical analysis", "Statistical modeling"]},
            {"name": "A/B Testing", "synonyms": ["A/B testing", "Experimentation", "Hypothesis testing"]},
        ],
        "web_development": [
            {"name": "Frontend Development", "synonyms": ["Front-end", "UI development", "Client-side"]},
            {"name": "Backend Development", "synonyms": ["Back-end", "Server-side", "API development"]},
            {"name": "Full Stack", "synonyms": ["Full-stack", "Fullstack development"]},
            {"name": "Responsive Design", "synonyms": ["Mobile-first", "Responsive web design"]},
            {"name": "Web Performance", "synonyms": ["Performance optimization", "Web optimization"]},
        ],
    },
}

# Category hierarchy
CATEGORY_HIERARCHY = {
    "technical": ["languages", "frameworks", "libraries"],
    "tools": ["cloud", "devops", "databases", "ide"],
    "soft": ["communication", "leadership", "problem_solving", "work_habits"],
    "domain": ["software_engineering", "data_science", "web_development"],
}

# Skill priority by role (example mappings)
ROLE_PRIORITY = {
    "software_engineer": {
        "critical": ["Python", "Java", "JavaScript", "SQL", "Git"],
        "preferred": ["AWS", "Docker", "Kubernetes", "React", "Node.js"],
        "nice_to_have": ["Terraform", "Prometheus", "GraphQL"],
    },
    "data_scientist": {
        "critical": ["Python", "R", "SQL", "Machine Learning", "Statistics"],
        "preferred": ["TensorFlow", "PyTorch", "Pandas", "NumPy", "Data Visualization"],
        "nice_to_have": ["AWS", "Spark", "Kubernetes"],
    },
    "frontend_engineer": {
        "critical": ["JavaScript", "TypeScript", "React", "HTML", "CSS"],
        "preferred": ["Next.js", "Node.js", "Testing", "Web Performance"],
        "nice_to_have": ["GraphQL", "Webpack", "Design Systems"],
    },
    "backend_engineer": {
        "critical": ["Python", "Java", "Go", "SQL", "API Design"],
        "preferred": ["AWS", "Docker", "Kubernetes", "PostgreSQL", "Redis"],
        "nice_to_have": ["Terraform", "gRPC", "Event-driven architecture"],
    },
}


class SkillsOntology:
    """
    Skills ontology database.

    Provides:
    - Skill lookup by name or synonym
    - Category classification
    - Hierarchy navigation (parent/child)
    - Related skills suggestions

    Example:
        ontology = SkillsOntology()
        skill = ontology.get_skill("Python")
        synonyms = ontology.get_synonyms("AWS")
        category = ontology.get_category("React")
    """

    def __init__(self):
        """Initialize the ontology."""
        self._skills_index: dict[str, dict] = {}
        self._synonyms_index: dict[str, str] = {}
        self._category_index: dict[str, str] = {}
        self._build_indices()

    def _build_indices(self):
        """Build lookup indices for efficient searching."""
        for category, subcategories in SKILLS_DATABASE.items():
            for subcategory, skills in subcategories.items():
                for skill_data in skills:
                    skill_name = skill_data["name"]
                    
                    # Index by skill name
                    self._skills_index[skill_name.lower()] = {
                        "name": skill_name,
                        "category": category,
                        "subcategory": subcategory,
                        "synonyms": skill_data.get("synonyms", []),
                    }

                    # Index by synonyms
                    for synonym in skill_data.get("synonyms", []):
                        self._synonyms_index[synonym.lower()] = skill_name

                    # Index category lookup
                    self._category_index[skill_name.lower()] = category

    def get_skill(self, name: str) -> dict | None:
        """
        Get skill by name.

        Args:
            name: Skill name (case-insensitive)

        Returns:
            Skill data dict or None if not found
        """
        return self._skills_index.get(name.lower())

    def get_synonyms(self, name: str) -> list[str]:
        """
        Get synonyms for a skill.

        Args:
            name: Skill name

        Returns:
            List of synonyms
        """
        skill = self.get_skill(name)
        return skill.get("synonyms", []) if skill else []

    def get_category(self, name: str) -> str | None:
        """
        Get category for a skill.

        Args:
            name: Skill name

        Returns:
            Category (technical, tools, soft, domain) or None
        """
        return self._category_index.get(name.lower())

    def lookup(self, text: str) -> dict | None:
        """
        Look up skill by text (name or synonym).

        Args:
            text: Text to look up

        Returns:
            Skill data dict or None
        """
        text_lower = text.lower()

        # Try direct name match
        if text_lower in self._skills_index:
            return self._skills_index[text_lower]

        # Try synonym match
        if text_lower in self._synonyms_index:
            skill_name = self._synonyms_index[text_lower]
            return self._skills_index.get(skill_name.lower())

        return None

    def get_all_skills(self, category: str | None = None) -> list[str]:
        """
        Get all skills, optionally filtered by category.

        Args:
            category: Optional category filter

        Returns:
            List of skill names
        """
        if category:
            return [
                data["name"]
                for name, data in self._skills_index.items()
                if data["category"] == category
            ]
        return [data["name"] for data in self._skills_index.values()]

    def get_skills_by_subcategory(self, category: str, subcategory: str) -> list[str]:
        """
        Get skills by category and subcategory.

        Args:
            category: Main category
            subcategory: Subcategory

        Returns:
            List of skill names
        """
        skills = SKILLS_DATABASE.get(category, {}).get(subcategory, [])
        return [s["name"] for s in skills]

    def get_related_skills(self, name: str, limit: int = 5) -> list[str]:
        """
        Get related skills (same subcategory).

        Args:
            name: Skill name
            limit: Maximum number of related skills

        Returns:
            List of related skill names
        """
        skill = self.get_skill(name)
        if not skill:
            return []

        # Get skills in same subcategory
        subcategory = skill["subcategory"]
        category = skill["category"]

        related = self.get_skills_by_subcategory(category, subcategory)
        # Remove self and limit
        related = [s for s in related if s != name][:limit]

        return related

    def get_priority_for_role(
        self, skill: str, role: str
    ) -> str | None:
        """
        Get skill priority for a specific role.

        Args:
            skill: Skill name
            role: Role identifier

        Returns:
            Priority (critical, preferred, nice_to_have) or None
        """
        role_priorities = ROLE_PRIORITY.get(role, {})

        for priority, skills in role_priorities.items():
            # Check direct match
            if skill in skills:
                return priority

            # Check synonym match
            skill_synonyms = self.get_synonyms(skill)
            for s in skills:
                if s in skill_synonyms or s.lower() == skill.lower():
                    return priority

        return None

    def search(self, query: str, limit: int = 10) -> list[dict]:
        """
        Search for skills matching query.

        Args:
            query: Search query
            limit: Maximum results

        Returns:
            List of matching skill data dicts
        """
        query_lower = query.lower()
        results = []

        # Search by name
        for name, data in self._skills_index.items():
            if query_lower in name:
                results.append(data)
                if len(results) >= limit:
                    break

        # Search by synonym
        for synonym, skill_name in self._synonyms_index.items():
            if query_lower in synonym:
                data = self._skills_index.get(skill_name.lower())
                if data and data not in results:
                    results.append(data)
                    if len(results) >= limit:
                        break

        return results

    def get_statistics(self) -> dict:
        """Get ontology statistics."""
        stats = {
            "total_skills": len(self._skills_index),
            "total_synonyms": len(self._synonyms_index),
            "by_category": {},
        }

        for category in SKILLS_DATABASE.keys():
            count = len(
                [d for d in self._skills_index.values() if d["category"] == category]
            )
            stats["by_category"][category] = count

        return stats


# Singleton instance
_ontology_instance: SkillsOntology | None = None


def get_ontology() -> SkillsOntology:
    """Get or create ontology singleton."""
    global _ontology_instance
    if _ontology_instance is None:
        _ontology_instance = SkillsOntology()
    return _ontology_instance
