"""
Interview Practice API routes for generating questions and providing feedback.
"""

import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel

from .models import (
    GenerateQuestionsRequest,
    GenerateQuestionsResponse,
    InterviewQuestion,
    InterviewAnswer,
    InterviewFeedback,
    InterviewSession,
    SubmitAnswerRequest,
    GetFeedbackRequest,
    SessionHistoryResponse,
)

from config.dependencies import AuthorizedAPIKey
from lib.utils.ai import AIProvider
from monitoring import logging_config

# Configure logging
logger = logging_config.get_logger(__name__)

router = APIRouter(prefix="/v1/interview", tags=["interview"])

# In-memory storage for demo (replace with database in production)
_sessions: Dict[str, InterviewSession] = {}
_user_sessions: Dict[str, List[str]] = {}  # User ID -> List of session IDs


# Question templates based on difficulty and category
QUESTION_TEMPLATES = {
    "technical": {
        "easy": [
            "Explain what {skill} means and how you have used it in a project.",
            "What are the key features of {skill}?",
            "How would you approach learning {skill}?",
        ],
        "medium": [
            "Describe a challenging technical problem you solved using {skill}. What was your approach?",
            "How do you stay updated with new developments in {skill}?",
            "Walk me through a complex project where you used {skill}.",
        ],
        "hard": [
            "Design a system architecture for {job_title} role that leverages {skill}.",
            "How would you optimize performance in a {skill} application with millions of users?",
            "Describe an edge case you encountered with {skill} and how you resolved it.",
        ],
    },
    "behavioral": {
        "easy": [
            "Tell me about yourself and your professional background.",
            "Why are you interested in this {job_title} role?",
            "What are your greatest strengths as a professional?",
        ],
        "medium": [
            "Describe a situation where you had to work with a difficult team member. How did you handle it?",
            "Tell me about a time you failed. What did you learn from it?",
            "How do you prioritize tasks when you have multiple deadlines?",
        ],
        "hard": [
            "Describe a time you led a major initiative. What challenges did you face and how did you overcome them?",
            "Tell me about a decision you made that positively impacted your organization.",
            "How do you handle conflicts with senior stakeholders who disagree with your approach?",
        ],
    },
    "situational": {
        "easy": [
            "If a deadline was moved up by two weeks, how would you respond?",
            "What would you do if you discovered a bug in production code?",
            "How would you approach onboarding to a new team?",
        ],
        "medium": [
            "You're asked to work on a project outside your expertise. How would you approach it?",
            "A colleague's code review reveals a significant flaw in your implementation. How do you react?",
            "You notice your team is falling behind on a critical project. What steps would you take?",
        ],
        "hard": [
            "How would you approach modernizing a legacy system while maintaining business continuity?",
            "You discover that a critical decision you recommended was wrong. How do you handle it?",
            "How would you navigate a situation where business goals conflict with technical best practices?",
        ],
    },
    "domain": {
        "easy": [
            "What attracted you to the {job_title} role at {company}?",
            "What do you know about {company}'s products and market position?",
            "How do you see this {job_title} role fitting into your career goals?",
        ],
        "medium": [
            "How would your experience contribute to {company}'s current challenges?",
            "What do you think are the key skills for success in this {job_title} role?",
            "How do you approach staying current with industry trends relevant to {job_title}?",
        ],
        "hard": [
            "How would you approach transforming {company}'s {job_title} function?",
            "What strategic initiatives would you prioritize in your first 90 days as {job_title}?",
            "How would you measure success in this {job_title} position?",
        ],
    },
}

# Tips for answering different types of questions
ANSWER_TIPS = {
    "technical": [
        "Use the STAR method to structure your answer (Situation, Task, Action, Result)",
        "Provide concrete examples from your projects",
        "Explain not just what you did, but why you made that choice",
        "Focus on the impact and results of your technical decisions",
    ],
    "behavioral": [
        "Use the STAR method (Situation, Task, Action, Result)",
        "Focus on what YOU did, not what the team did",
        "Show self-awareness and what you learned from the experience",
        "Connect your answer to the role you're applying for",
    ],
    "situational": [
        "Think through the situation logically before answering",
        "Explain your reasoning and approach step-by-step",
        "Show your problem-solving and decision-making skills",
        "Consider multiple perspectives and potential consequences",
    ],
    "domain": [
        "Show genuine interest in the company and role",
        "Connect your background to the specific role",
        "Research the company's recent news and products",
        "Ask thoughtful follow-up questions if appropriate",
    ],
}


def generate_questions(
    job_title: Optional[str],
    company: Optional[str],
    count: int = 5,
    difficulty: Optional[str] = None,
    categories: Optional[List[str]] = None,
) -> List[InterviewQuestion]:
    """Generate interview questions based on parameters."""
    if categories is None:
        categories = ["technical", "behavioral", "situational", "domain"]
    if difficulty is None:
        difficulty = "medium"

    questions = []
    question_id = 0

    for category in categories:
        if category not in QUESTION_TEMPLATES:
            continue

        templates = QUESTION_TEMPLATES[category].get(difficulty, QUESTION_TEMPLATES[category].get("medium", []))

        for template in templates[:max(1, count // len(categories))]:
            # Format template with available context
            question_text = template
            if "{job_title}" in question_text and job_title:
                question_text = question_text.replace("{job_title}", job_title)
            if "{company}" in question_text and company:
                question_text = question_text.replace("{company}", company)
            if "{skill}" in question_text:
                skills = ["Python", "JavaScript", "React", "System Design", "AWS", "Database Design"]
                question_text = question_text.replace("{skill}", skills[question_id % len(skills)])

            tips = ANSWER_TIPS.get(category, [])

            questions.append(
                InterviewQuestion(
                    id=f"q_{question_id}",
                    question=question_text,
                    category=category,
                    difficulty=difficulty,
                    tips=tips[:2],  # Limit to 2 tips
                )
            )
            question_id += 1

            if len(questions) >= count:
                return questions[:count]

    return questions[:count]


def generate_feedback(
    answer: str,
    question: str,
    category: str,
    ai_provider: Optional[AIProvider] = None,
) -> InterviewFeedback:
    """Generate feedback on an interview answer using AI."""
    feedback_id = f"fb_{uuid.uuid4().hex[:8]}"
    answer_id = f"ans_{uuid.uuid4().hex[:8]}"

    # Generate feedback using AI if available
    if ai_provider:
        try:
            prompt = f"""
You are an expert interview coach. Evaluate this interview answer:

Question: {question}
Category: {category}
User's Answer: {answer}

Provide feedback in JSON format with exactly these keys:
- score (1-10 integer)
- strengths (list of 2-3 specific strengths)
- improvements (list of 2-3 areas for improvement)
- summary (1-2 sentence summary)
- suggested_answer (brief improved version of the answer)

Respond with only valid JSON, no markdown formatting.
"""

            response = ai_provider.generate_text(prompt)
            feedback_data = json.loads(response)

            return InterviewFeedback(
                id=feedback_id,
                answer_id=answer_id,
                score=min(10, max(1, int(feedback_data.get("score", 5)))),
                strengths=feedback_data.get("strengths", ["Good effort", "Clear communication"]),
                improvements=feedback_data.get("improvements", ["Provide more examples", "Explain your reasoning"]),
                summary=feedback_data.get("summary", "Good answer with room for improvement"),
                suggested_answer=feedback_data.get("suggested_answer"),
            )
        except Exception as e:
            logger.error(f"Error generating AI feedback: {e}")

    # Fallback to template-based feedback
    score = 6
    if len(answer) < 50:
        score = 4
    elif len(answer) > 500:
        score = 7
    elif "example" in answer.lower() or "project" in answer.lower():
        score = 7
    elif "I" in answer and "we" in answer:
        score = 8

    return InterviewFeedback(
        id=feedback_id,
        answer_id=answer_id,
        score=score,
        strengths=["Clear communication", "Demonstrates experience"],
        improvements=["Add more specific examples", "Explain the impact of your actions"],
        summary="Good answer. Consider providing more concrete examples to strengthen your response.",
    )


@router.post("/generate-questions", response_model=GenerateQuestionsResponse)
async def generate_interview_questions(
    request: GenerateQuestionsRequest,
    api_key: AuthorizedAPIKey,
) -> GenerateQuestionsResponse:
    """
    Generate interview questions based on job title, company, and difficulty.

    Args:
        request: GenerateQuestionsRequest with job details
        api_key: Authorized API key

    Returns:
        GenerateQuestionsResponse with generated questions and session ID
    """
    try:
        questions = generate_questions(
            job_title=request.job_title,
            company=request.company,
            count=request.count or 5,
            difficulty=request.difficulty or "medium",
            categories=request.categories or ["technical", "behavioral", "situational"],
        )

        if not questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not generate questions with the provided parameters",
            )

        session_id = f"session_{uuid.uuid4().hex[:12]}"

        # Store session
        session = InterviewSession(
            id=session_id,
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
            status="in_progress",
            job_title=request.job_title,
            company=request.company,
            questions=questions,
            answers=[],
            completion_percentage=0,
        )
        _sessions[session_id] = session

        logger.info(f"Generated {len(questions)} interview questions for session {session_id}")

        return GenerateQuestionsResponse(questions=questions, session_id=session_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating interview questions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate interview questions",
        )


@router.post("/submit-answer")
async def submit_interview_answer(
    request: SubmitAnswerRequest,
    api_key: AuthorizedAPIKey,
) -> Dict[str, Any]:
    """
    Submit an answer to an interview question.

    Args:
        request: SubmitAnswerRequest with session, question, and answer
        api_key: Authorized API key

    Returns:
        Dict with answer ID and feedback
    """
    try:
        session = _sessions.get(request.session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {request.session_id} not found",
            )

        # Find the question
        question = next((q for q in session.questions if q.id == request.question_id), None)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question {request.question_id} not found",
            )

        # Create answer record
        answer = InterviewAnswer(
            id=f"ans_{uuid.uuid4().hex[:8]}",
            question_id=request.question_id,
            answer=request.answer,
            video_url=request.video_url,
            recording_duration=request.recording_duration,
            timestamp=datetime.utcnow().isoformat(),
        )
        session.answers.append(answer)

        # Generate feedback
        feedback = generate_feedback(
            answer=request.answer,
            question=question.question,
            category=question.category,
        )

        if session.feedback is None:
            session.feedback = []
        session.feedback.append(feedback)

        # Update session progress
        session.completion_percentage = int((len(session.answers) / len(session.questions)) * 100)

        # Calculate average score
        if session.feedback:
            avg_score = sum(f.score for f in session.feedback) / len(session.feedback)
            session.average_score = round(avg_score, 1)

        session.updated_at = datetime.utcnow().isoformat()

        logger.info(f"Submitted answer to question {request.question_id} in session {request.session_id}")

        return {
            "answer_id": answer.id,
            "feedback": feedback.model_dump(),
            "progress": session.completion_percentage,
            "average_score": session.average_score,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting answer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit answer",
        )


@router.get("/session/{session_id}")
async def get_session(
    session_id: str,
    api_key: AuthorizedAPIKey,
) -> InterviewSession:
    """
    Get details of an interview session.

    Args:
        session_id: ID of the session
        api_key: Authorized API key

    Returns:
        InterviewSession with all details
    """
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    return session


@router.post("/session/{session_id}/complete")
async def complete_session(
    session_id: str,
    api_key: AuthorizedAPIKey,
) -> Dict[str, Any]:
    """
    Mark an interview session as completed.

    Args:
        session_id: ID of the session
        api_key: Authorized API key

    Returns:
        Dict with session summary
    """
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    session.status = "completed"
    session.updated_at = datetime.utcnow().isoformat()

    logger.info(f"Completed interview session {session_id}")

    return {
        "session_id": session_id,
        "status": "completed",
        "questions_answered": len(session.answers),
        "total_questions": len(session.questions),
        "average_score": session.average_score,
        "completion_percentage": session.completion_percentage,
    }


@router.get("/history")
async def get_session_history(
    api_key: AuthorizedAPIKey,
) -> SessionHistoryResponse:
    """
    Get the user's interview session history.

    Args:
        api_key: Authorized API key

    Returns:
        SessionHistoryResponse with list of sessions
    """
    # In a real app, filter by user_id from the API key
    sessions = list(_sessions.values())

    # Sort by creation date (newest first)
    sessions.sort(key=lambda s: s.created_at, reverse=True)

    average_score = None
    if sessions:
        all_scores = [s.average_score for s in sessions if s.average_score]
        if all_scores:
            average_score = round(sum(all_scores) / len(all_scores), 1)

    return SessionHistoryResponse(
        sessions=sessions[:20],  # Limit to last 20 sessions
        total_sessions=len(sessions),
        average_score=average_score,
    )


@router.post("/feedback")
async def get_answer_feedback(
    request: GetFeedbackRequest,
    api_key: AuthorizedAPIKey,
) -> InterviewFeedback:
    """
    Get AI feedback on an interview answer.

    Args:
        request: GetFeedbackRequest with answer details
        api_key: Authorized API key

    Returns:
        InterviewFeedback with detailed feedback
    """
    try:
        feedback = generate_feedback(
            answer=request.answer,
            question=request.question,
            category=request.category,
        )
        return feedback
    except Exception as e:
        logger.error(f"Error generating feedback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate feedback",
        )
