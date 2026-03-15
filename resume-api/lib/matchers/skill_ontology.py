"""
Skill ontology for resume-JD matching.
Maps canonical skill names to common variations/synonyms.
"""

SKILL_ONTOLOGY = {
    # Programming Languages
    "Python": ["Python", "Python programming", "Python development"],
    "Java": ["Java", "Java programming", "Java development"],
    "JavaScript": ["JavaScript", "JS", "JavaScript programming", "ECMAScript"],
    "TypeScript": ["TypeScript", "TS", "TypeScript programming"],
    "Go": ["Go", "Golang", "Go programming"],
    "Rust": ["Rust", "Rust programming"],
    "C++": ["C++", "CPP", "C plus plus"],
    "C#": ["C#", "C sharp", "C# programming"],
    "Ruby": ["Ruby", "Ruby programming"],
    "PHP": ["PHP", "PHP development"],
    "Swift": ["Swift", "Swift programming"],
    "Kotlin": ["Kotlin", "Kotlin programming"],
    "Scala": ["Scala", "Scala programming"],
    "R": ["R", "R programming", "R statistical"],
    "MATLAB": ["MATLAB", "Matlab"],
    "Shell": ["Shell", "Bash", "Shell scripting", "Bash scripting"],
    "SQL": ["SQL", "SQL programming", "SQL queries"],

    # Web Frameworks
    "React": ["React", "React.js", "ReactJS", "React.js"],
    "Vue": ["Vue", "Vue.js", "VueJS", "Vue.js"],
    "Angular": ["Angular", "AngularJS", "Angular 2+"],
    "Django": ["Django", "Django framework", "Django REST"],
    "FastAPI": ["FastAPI", "Fast API"],
    "Flask": ["Flask", "Flask framework"],
    "Express": ["Express", "Express.js", "ExpressJS", "Node.js Express"],
    "Next.js": ["Next.js", "NextJS", "Next.js framework"],
    "Nuxt.js": ["Nuxt.js", "NuxtJS", "Nuxt.js framework"],
    "Svelte": ["Svelte", "Svelte.js", "SvelteJS"],
    "Spring Boot": ["Spring Boot", "Spring Framework", "Spring"],
    "Laravel": ["Laravel", "Laravel framework"],
    "Ruby on Rails": ["Ruby on Rails", "Rails", "RoR"],
    "ASP.NET": ["ASP.NET", "ASP.NET Core", "Dot NET"],
    "Gin": ["Gin", "Gin framework", "Gin Gonic"],
    "Echo": ["Echo", "Echo framework"],

    # Backend Technologies
    "Node.js": ["Node.js", "NodeJS", "Node", "Node.js development"],
    "GraphQL": ["GraphQL", "GraphQL API"],
    "REST": ["REST", "REST API", "RESTful API", "RESTful services"],
    "Microservices": ["Microservices", "Microservices architecture", "Microservice"],
    "Serverless": ["Serverless", "Serverless architecture", "Lambda"],
    "gRPC": ["gRPC", "gRPC API"],
    "WebSocket": ["WebSocket", "WebSockets", "WS"],
    "Message Queues": ["Message Queues", "RabbitMQ", "Kafka", "SQS"],
    "Event-Driven": ["Event-Driven", "Event Driven Architecture", "EDA"],

    # Databases
    "PostgreSQL": ["PostgreSQL", "Postgres", "PostgreSQL database"],
    "MySQL": ["MySQL", "MySQL database"],
    "MongoDB": ["MongoDB", "Mongo", "MongoDB database"],
    "Redis": ["Redis", "Redis cache", "Redis database"],
    "Elasticsearch": ["Elasticsearch", "Elastic Search", "ES"],
    "SQLite": ["SQLite", "SQLite database"],
    "Oracle": ["Oracle", "Oracle database"],
    "SQL Server": ["SQL Server", "Microsoft SQL Server", "MSSQL"],
    "DynamoDB": ["DynamoDB", "Amazon DynamoDB"],
    "Cassandra": ["Cassandra", "Apache Cassandra"],
    "Neo4j": ["Neo4j", "Neo4j graph"],
    "Firebase": ["Firebase", "Firebase Realtime", "Firestore"],
    "Supabase": ["Supabase", "Supabase database"],

    # Cloud & DevOps
    "AWS": ["AWS", "Amazon Web Services", "Amazon Web Service"],
    "GCP": ["GCP", "Google Cloud Platform", "Google Cloud"],
    "Azure": ["Azure", "Microsoft Azure", "Azure cloud"],
    "Docker": ["Docker", "Docker containers", "Dockerization"],
    "Kubernetes": ["Kubernetes", "K8s", "Kubernetes orchestration"],
    "Terraform": ["Terraform", "Terraform IaC", "Infrastructure as Code"],
    "CI/CD": ["CI/CD", "Continuous Integration", "Continuous Deployment", "Jenkins", "GitHub Actions", "GitLab CI"],
    "Ansible": ["Ansible", "Ansible automation"],
    "Prometheus": ["Prometheus", "Prometheus monitoring"],
    "Grafana": ["Grafana", "Grafana dashboards"],
    "ELK Stack": ["ELK Stack", "Elasticsearch Logstash Kibana"],
    "Nginx": ["Nginx", "NGINX", "Nginx server"],
    "Apache": ["Apache", "Apache server"],
    "Linux": ["Linux", "Linux administration", "Unix"],
    "Git": ["Git", "Git version control", "Git workflow"],

    # ML/AI
    "Machine Learning": ["ML", "Machine Learning", "Machine Learning engineering", "statistical learning"],
    "Deep Learning": ["Deep Learning", "Deep Learning engineering", "Neural Networks"],
    "NLP": ["NLP", "Natural Language Processing", "Computational Linguistics"],
    "Computer Vision": ["Computer Vision", "CV", "Image Processing"],
    "PyTorch": ["PyTorch", "PyTorch framework"],
    "TensorFlow": ["TensorFlow", "TensorFlow framework"],
    "Scikit-learn": ["Scikit-learn", "Sklearn", "Scikit Learn"],
    "Pandas": ["Pandas", "Pandas library"],
    "NumPy": ["NumPy", "Numpy", "NumPy library"],
    "Matplotlib": ["Matplotlib", "Matplotlib plotting"],
    "OpenCV": ["OpenCV", "OpenCV library"],
    "Hugging Face": ["Hugging Face", "Transformers", "HuggingFace Transformers"],
    "LangChain": ["LangChain", "LangChain framework"],
    "LLM": ["LLM", "Large Language Models", "Foundation Models"],

    # Soft Skills
    "Communication": ["Communication", "Communication skills", "Verbal Communication", "Written Communication"],
    "Leadership": ["Leadership", "Team Leadership", "Technical Leadership"],
    "Problem Solving": ["Problem Solving", "Analytical Thinking", "Critical Thinking"],
    "Teamwork": ["Teamwork", "Collaboration", "Team Player", "Cross-functional Collaboration"],
    "Project Management": ["Project Management", "PM", "Agile", "Scrum", "Sprint Planning"],
    "Mentoring": ["Mentoring", "Mentorship", "Coaching"],
    "Time Management": ["Time Management", "Prioritization", "Multitasking"],
    "Adaptability": ["Adaptability", "Flexible", "Quick Learner"],
    "Attention to Detail": ["Attention to Detail", "Detail-oriented", "Detail Oriented"],

    # Tools & Technologies
    "Jira": ["Jira", "Jira Software", "Atlassian Jira"],
    "Confluence": ["Confluence", "Atlassian Confluence"],
    "Slack": ["Slack", "Slack messaging"],
    "Figma": ["Figma", "Figma design"],
    "Postman": ["Postman", "Postman API"],
    "VS Code": ["VS Code", "Visual Studio Code"],
    "IntelliJ": ["IntelliJ", "IntelliJ IDEA"],
    "Vim": ["Vim", "Vim editor"],
    "Emacs": ["Emacs", "Emacs editor"],
}

# Flatten to set for fast lookup
ALL_SKILLS = set(SKILL_ONTOLOGY.keys())

# Reverse mapping: synonym -> canonical
SYNONYM_TO_CANONICAL = {}
for canonical, synonyms in SKILL_ONTOLOGY.items():
    for synonym in synonyms:
        SYNONYM_TO_CANONICAL[synonym.lower()] = canonical


def get_canonical_skill(synonym: str) -> str | None:
    """Get canonical skill name from synonym."""
    return SYNONYM_TO_CANONICAL.get(synonym.lower())


def get_synonyms(skill: str) -> list[str]:
    """Get all synonyms for a canonical skill name."""
    return SKILL_ONTOLOGY.get(skill, [])


def add_skill(skill: str, synonyms: list[str]) -> None:
    """Add a new skill to the ontology."""
    SKILL_ONTOLOGY[skill] = synonyms
    ALL_SKILLS.add(skill)
    for synonym in synonyms:
        SYNONYM_TO_CANONICAL[synonym.lower()] = skill
