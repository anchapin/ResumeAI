"""
Interview Preparation API Routes

Provides endpoints for:
- Starting mock interview sessions
- Generating interview questions
- Submitting answers with feedback
- Getting session reports
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from lib.interview import MockInterviewGenerator, InterviewQuestionGenerator

router = APIRouter(prefix="/interviews", tags=["interviews"])

# Global interview generator instance
interview_generator = MockInterviewGenerator()
question_generator = InterviewQuestionGenerator()


# Request/Response Models
class StartInterviewRequest(BaseModel):
    """Request model for starting a mock interview."""

    job_description: str
    num_questions: int = 5


class InterviewSessionResponse(BaseModel):
    """Response model for an interview session."""

    session_id: str
    job_description: str
    questions: List[Dict[str, Any]]
    current_question_index: int
    status: str


class SubmitAnswerRequest(BaseModel):
    """Request model for submitting an answer."""

    answer: str


class AnswerResponse(BaseModel):
    """Response model for a submitted answer."""

    success: bool
    feedback: str
    score: float
    is_complete: bool
    next_question: Optional[Dict[str, Any]] = None


class QuestionGenerationRequest(BaseModel):
    """Request model for generating questions."""

    job_description: str
    num_questions: int = 10
    categories: Optional[List[str]] = None


class QuestionsResponse(BaseModel):
    """Response model for generated questions."""

    success: bool
    questions: List[Dict[str, Any]]


# Endpoints
@router.post("/start", response_model=InterviewSessionResponse)
async def start_interview(request: StartInterviewRequest):
    """
    Start a new mock interview session.

    Generates questions based on the job description and returns
    the first question.
    """
    try:
        session = interview_generator.create_session(
            job_description=request.job_description, num_questions=request.num_questions
        )

        questions = [
            {
                "id": q.id,
                "category": q.category,
                "question": q.question,
                "difficulty": q.difficulty,
                "tips": q.tips,
            }
            for q in session.questions
        ]

        return InterviewSessionResponse(
            session_id=session.id,
            job_description=session.job_description,
            questions=questions,
            current_question_index=session.current_question_index,
            status=session.status,
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to start interview: {str(e)}"
        )


@router.get("/{session_id}", response_model=InterviewSessionResponse)
async def get_interview_session(session_id: str):
    """
    Get the current status of an interview session.
    """
    session = interview_generator.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    questions = [
        {
            "id": q.id,
            "category": q.category,
            "question": q.question,
            "difficulty": q.difficulty,
            "tips": q.tips,
        }
        for q in session.questions
    ]

    return InterviewSessionResponse(
        session_id=session.id,
        job_description=session.job_description,
        questions=questions,
        current_question_index=session.current_question_index,
        status=session.status,
    )


@router.post("/{session_id}/answer", response_model=AnswerResponse)
async def submit_answer(session_id: str, request: SubmitAnswerRequest):
    """
    Submit an answer to the current question in an interview session.

    Returns feedback, score, and moves to the next question.
    """
    session = interview_generator.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if session.status == "completed":
        raise HTTPException(
            status_code=400, detail="Interview session is already completed"
        )

    # Get current question
    if session.current_question_index >= len(session.questions):
        raise HTTPException(status_code=400, detail="No more questions available")

    current_question = session.questions[session.current_question_index]

    # Submit answer
    answer = interview_generator.submit_answer(
        session_id=session_id, question_id=current_question.id, answer=request.answer
    )

    if not answer:
        raise HTTPException(status_code=400, detail="Failed to submit answer")

    # Prepare next question
    next_question = None
    is_complete = session.status == "completed"

    if not is_complete and session.current_question_index < len(session.questions):
        next_q = session.questions[session.current_question_index]
        next_question = {
            "id": next_q.id,
            "category": next_q.category,
            "question": next_q.question,
            "difficulty": next_q.difficulty,
            "tips": next_q.tips,
        }

    return AnswerResponse(
        success=True,
        feedback=answer.feedback,
        score=answer.score,
        is_complete=is_complete,
        next_question=next_question,
    )


@router.get("/{session_id}/report")
async def get_interview_report(session_id: str):
    """
    Get the final report for a completed interview session.
    """
    report = interview_generator.generate_report(session_id)
    if not report:
        raise HTTPException(
            status_code=400,
            detail="Report not available. Interview may still be in progress.",
        )

    return report


@router.post("/questions/generate", response_model=QuestionsResponse)
async def generate_questions(request: QuestionGenerationRequest):
    """
    Generate interview questions without starting a full interview session.

    Useful for practice or generating question banks.
    """
    try:
        questions = question_generator.generate_questions(
            job_description=request.job_description,
            num_questions=request.num_questions,
            categories=request.categories,
        )

        question_list = [
            {
                "id": q.id,
                "category": q.category,
                "question": q.question,
                "difficulty": q.difficulty,
                "tips": q.tips,
            }
            for q in questions
        ]

        return QuestionsResponse(success=True, questions=question_list)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to generate questions: {str(e)}"
        )


@router.post("/questions/by-title", response_model=QuestionsResponse)
async def generate_questions_by_title(job_title: str, num_questions: int = 10):
    """
    Generate interview questions specifically for a job title.
    """
    try:
        questions = question_generator.generate_questions_for_title(
            job_title=job_title, num_questions=num_questions
        )

        question_list = [
            {
                "id": q.id,
                "category": q.category,
                "question": q.question,
                "difficulty": q.difficulty,
                "tips": q.tips,
            }
            for q in questions
        ]

        return QuestionsResponse(success=True, questions=question_list)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to generate questions: {str(e)}"
        )
