"""
Interview Preparation Library

Provides functionality for mock interviews, question generation,
and response evaluation.
"""

import uuid
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
import random


@dataclass
class InterviewQuestion:
    """Represents an interview question."""

    id: str
    category: str  # 'technical', 'behavioral', 'system_design', 'cultural'
    question: str
    difficulty: str  # 'easy', 'medium', 'hard'
    sample_answer: Optional[str] = None
    tips: List[str] = field(default_factory=list)


@dataclass
class InterviewAnswer:
    """Represents a user's answer to a question."""

    question_id: str
    answer: str
    submitted_at: datetime = field(default_factory=datetime.now)
    feedback: Optional[str] = None
    score: Optional[float] = None


@dataclass
class MockInterviewSession:
    """Represents a mock interview session."""

    id: str
    job_description: str
    questions: List[InterviewQuestion] = field(default_factory=list)
    answers: List[InterviewAnswer] = field(default_factory=list)
    current_question_index: int = 0
    status: str = "in_progress"  # 'in_progress', 'completed'
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None


class InterviewQuestionGenerator:
    """Generates interview questions based on job descriptions."""

    # Question banks by category
    QUESTION_BANKS = {
        "behavioral": [
            {
                "question": "Tell me about a time you had to deal with a difficult team member.",
                "tips": [
                    "Use the STAR method",
                    "Focus on your actions, not others'",
                    "Show empathy and growth",
                ],
            },
            {
                "question": "Describe a time when you had to meet a tight deadline.",
                "tips": [
                    "Explain your prioritization strategy",
                    "Show how you communicated with stakeholders",
                    "Highlight the outcome",
                ],
            },
            {
                "question": "Tell me about a time you failed and what you learned from it.",
                "tips": [
                    "Be honest about the failure",
                    "Focus on what you learned",
                    "Show how you've applied the lesson",
                ],
            },
            {
                "question": "Describe a time you had to convince your team to adopt a new approach.",
                "tips": [
                    "Show your leadership skills",
                    "Explain your communication strategy",
                    "Highlight the positive outcome",
                ],
            },
            {
                "question": "Tell me about a time you went above and beyond for a customer.",
                "tips": [
                    "Focus on customer impact",
                    "Show your problem-solving skills",
                    "Demonstrate empathy",
                ],
            },
        ],
        "technical": [
            {
                "question": "Explain the difference between REST and GraphQL APIs.",
                "tips": [
                    "Cover key architectural differences",
                    "Discuss pros and cons of each",
                    "Give use case examples",
                ],
            },
            {
                "question": "What is your approach to debugging a complex issue?",
                "tips": [
                    "Show your systematic approach",
                    "Mention specific tools and techniques",
                    "Highlight collaboration when needed",
                ],
            },
            {
                "question": "How would you design a URL shortening service?",
                "tips": [
                    "Start with core requirements",
                    "Discuss scalability considerations",
                    "Cover database design",
                ],
            },
            {
                "question": "Explain database indexing and when you would use it.",
                "tips": [
                    "Cover B-tree and hash indexes",
                    "Discuss trade-offs",
                    "Give practical examples",
                ],
            },
            {
                "question": "What strategies do you use to optimize application performance?",
                "tips": [
                    "Cover profiling and measurement",
                    "Discuss common bottlenecks",
                    "Show breadth of knowledge",
                ],
            },
        ],
        "system_design": [
            {
                "question": "Design a scalable chat application like Slack.",
                "tips": [
                    "Consider real-time communication",
                    "Discuss database choices",
                    "Cover message delivery guarantees",
                ],
            },
            {
                "question": "How would you design a recommendation system?",
                "tips": [
                    "Discuss different approaches",
                    "Cover data collection",
                    "Address scalability",
                ],
            },
            {
                "question": "Design a rate limiting system.",
                "tips": [
                    "Cover different algorithms",
                    "Discuss distributed systems challenges",
                    "Show trade-off understanding",
                ],
            },
            {
                "question": "How would you design a distributed cache?",
                "tips": [
                    "Discuss consistency models",
                    "Cover eviction strategies",
                    "Address fault tolerance",
                ],
            },
        ],
        "cultural_fit": [
            {
                "question": "What type of work environment helps you thrive?",
                "tips": [
                    "Be specific about your preferences",
                    "Show adaptability",
                    "Align with company culture",
                ],
            },
            {
                "question": "How do you stay current with industry trends?",
                "tips": [
                    "Mention specific resources",
                    "Show passion for learning",
                    "Give concrete examples",
                ],
            },
            {
                "question": "What questions do you have about this role/company?",
                "tips": [
                    "Ask thoughtful questions",
                    "Show you've done research",
                    "Avoid salary/benefits initially",
                ],
            },
        ],
    }

    def generate_questions(
        self,
        job_description: str,
        num_questions: int = 5,
        categories: Optional[List[str]] = None,
    ) -> List[InterviewQuestion]:
        """
        Generate interview questions based on job description.

        Args:
            job_description: The job description to base questions on
            num_questions: Number of questions to generate
            categories: List of categories to include

        Returns:
            List of InterviewQuestion objects
        """
        if categories is None:
            categories = ["behavioral", "technical", "system_design", "cultural_fit"]

        questions = []
        questions_per_category = max(1, num_questions // len(categories))

        for category in categories:
            category_questions = self.QUESTION_BANKS.get(category, [])
            selected = random.sample(
                category_questions, min(questions_per_category, len(category_questions))
            )

            for q in selected:
                questions.append(
                    InterviewQuestion(
                        id=str(uuid.uuid4()),
                        category=category,
                        question=q["question"],
                        difficulty=random.choice(["easy", "medium", "hard"]),
                        tips=q["tips"],
                    )
                )

        # Shuffle and limit
        random.shuffle(questions)
        return questions[:num_questions]

    def generate_questions_for_title(
        self, job_title: str, num_questions: int = 5
    ) -> List[InterviewQuestion]:
        """Generate questions specifically for a job title."""
        job_title_lower = job_title.lower()

        # Customize categories based on role
        if "manager" in job_title_lower or "lead" in job_title_lower:
            categories = ["behavioral", "system_design", "cultural_fit"]
        elif "engineer" in job_title_lower or "developer" in job_title_lower:
            categories = ["technical", "behavioral", "system_design"]
        elif "designer" in job_title_lower:
            categories = ["behavioral", "cultural_fit", "technical"]
        else:
            categories = ["behavioral", "technical", "system_design", "cultural_fit"]

        return self.generate_questions(job_title, num_questions, categories)


class MockInterviewGenerator:
    """Manages mock interview sessions."""

    def __init__(self):
        self.sessions: Dict[str, MockInterviewSession] = {}
        self.question_generator = InterviewQuestionGenerator()

    def create_session(
        self, job_description: str, num_questions: int = 5
    ) -> MockInterviewSession:
        """Create a new mock interview session."""
        session_id = str(uuid.uuid4())

        # Generate questions based on job description
        questions = self.question_generator.generate_questions(
            job_description, num_questions
        )

        session = MockInterviewSession(
            id=session_id, job_description=job_description, questions=questions
        )

        self.sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[MockInterviewSession]:
        """Get a session by ID."""
        return self.sessions.get(session_id)

    def submit_answer(
        self, session_id: str, question_id: str, answer: str
    ) -> Optional[InterviewAnswer]:
        """Submit an answer for a question in a session."""
        session = self.sessions.get(session_id)
        if not session:
            return None

        # Find the question
        question = next((q for q in session.questions if q.id == question_id), None)
        if not question:
            return None

        # Create answer with auto-feedback
        interview_answer = InterviewAnswer(
            question_id=question_id,
            answer=answer,
            feedback=self._generate_feedback(question, answer),
            score=self._score_answer(question, answer),
        )

        session.answers.append(interview_answer)

        # Move to next question
        session.current_question_index += 1
        if session.current_question_index >= len(session.questions):
            session.status = "completed"
            session.completed_at = datetime.now()

        return interview_answer

    def _generate_feedback(self, question: InterviewQuestion, answer: str) -> str:
        """Generate feedback for an answer."""
        answer_length = len(answer)

        if answer_length < 50:
            return "Your answer seems too brief. Try to provide more detail with specific examples."

        if answer_length < 150:
            return "Good start, but consider expanding your answer with more specific examples or details."

        # Check for STAR method in behavioral questions
        if question.category == "behavioral":
            answer_lower = answer.lower()
            if not any(
                word in answer_lower
                for word in ["situation", "task", "action", "result", "i ", "my "]
            ):
                return "Consider using the STAR method (Situation, Task, Action, Result) to structure your answer."

        return "Great answer! You provided good detail and structure. Keep practicing to refine your delivery."

    def _score_answer(self, question: InterviewQuestion, answer: str) -> float:
        """Score an answer (0-100)."""
        score = 50.0  # Base score

        # Length factor
        length = len(answer)
        if 100 <= length <= 500:
            score += 20
        elif length > 500:
            score += 15

        # Structure indicators
        answer_lower = answer.lower()
        if any(
            word in answer_lower
            for word in ["first", "second", "finally", "additionally", "however"]
        ):
            score += 10

        if any(
            word in answer_lower
            for word in ["because", "therefore", "result", "outcome", "learned"]
        ):
            score += 10

        # Specificity
        if any(
            word in answer_lower
            for word in ["for example", "for instance", "specifically", "exactly"]
        ):
            score += 10

        return min(100.0, score)

    def generate_report(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Generate a final report for a completed session."""
        session = self.sessions.get(session_id)
        if not session or session.status != "completed":
            return None

        # Calculate overall score
        total_score = (
            sum(a.score for a in session.answers) / len(session.answers)
            if session.answers
            else 0
        )

        # Category breakdown
        category_scores = {}
        for answer in session.answers:
            question = next(q for q in session.questions if q.id == answer.question_id)
            if question.category not in category_scores:
                category_scores[question.category] = []
            category_scores[question.category].append(answer.score)

        category_averages = {
            cat: sum(scores) / len(scores) for cat, scores in category_scores.items()
        }

        return {
            "session_id": session_id,
            "job_description": session.job_description,
            "total_questions": len(session.questions),
            "answered_questions": len(session.answers),
            "overall_score": round(total_score, 1),
            "category_scores": {k: round(v, 1) for k, v in category_averages.items()},
            "questions": [
                {
                    "question": q.question,
                    "category": q.category,
                    "difficulty": q.difficulty,
                    "answer": a.answer,
                    "feedback": a.feedback,
                    "score": a.score,
                }
                for q, a in zip(session.questions, session.answers)
            ],
            "completed_at": (
                session.completed_at.isoformat() if session.completed_at else None
            ),
        }
