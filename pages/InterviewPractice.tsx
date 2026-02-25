import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Route, InterviewQuestion, InterviewSession, GenerateQuestionsRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * @component
 * @description Mock Interview Practice page for generating and practicing interview questions
 * @returns {JSX.Element} The rendered interview practice page
 */
function InterviewPractice() {
  const [currentRoute, setCurrentRoute] = useState<Route>(Route.INTERVIEW_PRACTICE);
  const [activeTab, setActiveTab] = useState<'setup' | 'practice' | 'history'>('setup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Setup state
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState(5);

  // Practice state
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // History state
  const [pastSessions, setPastSessions] = useState<InterviewSession[]>([]);

  const handleGenerateQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const request: GenerateQuestionsRequest = {
        job_title: jobTitle || undefined,
        company: company || undefined,
        count: questionCount,
        difficulty,
      };

      const response = await fetch(`${API_BASE_URL}/v1/interview/generate-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': localStorage.getItem('RESUMEAI_API_KEY') || '',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate questions: ${response.statusText}`);
      }

      const data = await response.json();
      setCurrentSession({
        id: data.session_id,
        sessionId: data.session_id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'in_progress',
        jobTitle,
        company,
        questions: data.questions,
        answers: [],
        completionPercentage: 0,
      });

      setCurrentQuestionIndex(0);
      setCurrentAnswer('');
      setFeedback(null);
      setShowFeedback(false);
      setActiveTab('practice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentSession || currentQuestionIndex >= currentSession.questions.length) {
      return;
    }

    try {
      setLoading(true);
      const question = currentSession.questions[currentQuestionIndex];

      const response = await fetch(`${API_BASE_URL}/v1/interview/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': localStorage.getItem('RESUMEAI_API_KEY') || '',
        },
        body: JSON.stringify({
          session_id: currentSession.sessionId,
          question_id: question.id,
          answer: currentAnswer,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit answer: ${response.statusText}`);
      }

      const data = await response.json();
      setFeedback(data.feedback);
      setShowFeedback(true);

      // Update session progress
      setCurrentSession(prev => prev ? {
        ...prev,
        answers: [...prev.answers, {
          id: data.answer_id,
          questionId: question.id,
          answer: currentAnswer,
          timestamp: new Date().toISOString(),
        }],
        completionPercentage: data.progress,
        averageScore: data.average_score,
      } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentSession && currentQuestionIndex < currentSession.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer('');
      setShowFeedback(false);
      setFeedback(null);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setCurrentAnswer('');
      setShowFeedback(false);
      setFeedback(null);
    }
  };

  const handleCompleteSession = async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      await fetch(`${API_BASE_URL}/v1/interview/session/${currentSession.sessionId}/complete`, {
        method: 'POST',
        headers: {
          'X-API-KEY': localStorage.getItem('RESUMEAI_API_KEY') || '',
        },
      });

      // Update session status
      setCurrentSession(prev => prev ? { ...prev, status: 'completed' } : null);
      setActiveTab('history');
      loadSessionHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete session');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/v1/interview/history`, {
        headers: {
          'X-API-KEY': localStorage.getItem('RESUMEAI_API_KEY') || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPastSessions(data.sessions);
      }
    } catch (err) {
      console.error('Failed to load session history:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadSessionHistory();
    }
  }, [activeTab]);

  const currentQuestion = currentSession ? currentSession.questions[currentQuestionIndex] : null;

  return (
    <div className="flex min-h-screen bg-[#f6f6f8]">
      <Sidebar currentRoute={currentRoute} onNavigate={setCurrentRoute} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Interview Practice</h1>
            <p className="text-slate-600">Prepare for your interviews with AI-generated questions and feedback</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('setup')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'setup'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Setup
            </button>
            <button
              onClick={() => setActiveTab('practice')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'practice'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Practice
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              History
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {/* Setup Tab */}
          {activeTab === 'setup' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Generate Interview Questions</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Target Job Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Senior Software Engineer"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Company (Optional)
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g., Google, Microsoft"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Difficulty Level
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Number of Questions
                    </label>
                    <select
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {[3, 5, 10, 15, 20].map((num) => (
                        <option key={num} value={num}>
                          {num} questions
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerateQuestions}
                  disabled={loading}
                  className="w-full mt-6 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:bg-slate-400 transition-colors"
                >
                  {loading ? 'Generating...' : 'Generate Questions'}
                </button>
              </div>
            </div>
          )}

          {/* Practice Tab */}
          {activeTab === 'practice' && currentSession && currentQuestion && (
            <div className="space-y-6">
              {/* Progress */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    Question {currentQuestionIndex + 1} of {currentSession.questions.length}
                  </span>
                  {currentSession.averageScore && (
                    <span className="text-sm font-medium text-primary-600">
                      Average Score: {currentSession.averageScore}/10
                    </span>
                  )}
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${currentSession.completionPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Question */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full mb-3">
                    {currentQuestion.category.toUpperCase()} - {currentQuestion.difficulty.toUpperCase()}
                  </span>
                  <h2 className="text-2xl font-semibold text-slate-900">{currentQuestion.question}</h2>
                </div>

                {currentQuestion.tips && currentQuestion.tips.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Tips:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {currentQuestion.tips.map((tip, i) => (
                        <li key={i} className="text-sm text-blue-800">{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Answer Input or Feedback */}
              {!showFeedback ? (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Your Answer</label>
                  <textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    rows={8}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!currentAnswer.trim() || loading}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:bg-slate-400 transition-colors"
                    >
                      {loading ? 'Analyzing...' : 'Get Feedback'}
                    </button>
                    <button
                      onClick={() => setCurrentAnswer('')}
                      className="px-4 py-2 bg-slate-200 text-slate-900 font-medium rounded-lg hover:bg-slate-300 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : feedback ? (
                <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Feedback</h3>
                    <span className="text-2xl font-bold text-primary-600">{feedback.score}/10</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Summary</p>
                    <p className="text-slate-600">{feedback.summary}</p>
                  </div>

                  {feedback.strengths && feedback.strengths.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-green-700 mb-2">✓ Strengths</p>
                      <ul className="list-disc list-inside space-y-1">
                        {feedback.strengths.map((strength: string, i: number) => (
                          <li key={i} className="text-sm text-slate-600">{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedback.improvements && feedback.improvements.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-orange-700 mb-2">→ Areas for Improvement</p>
                      <ul className="list-disc list-inside space-y-1">
                        {feedback.improvements.map((improvement: string, i: number) => (
                          <li key={i} className="text-sm text-slate-600">{improvement}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedback.suggested_answer && (
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-sm font-semibold text-slate-700 mb-2">Suggested Answer</p>
                      <p className="text-sm text-slate-600">{feedback.suggested_answer}</p>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Navigation */}
              <div className="flex gap-3">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-900 font-medium rounded-lg hover:bg-slate-300 disabled:bg-slate-100 disabled:text-slate-400 transition-colors"
                >
                  Previous
                </button>
                {currentQuestionIndex === currentSession.questions.length - 1 ? (
                  <button
                    onClick={handleCompleteSession}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-slate-400 transition-colors"
                  >
                    {loading ? 'Completing...' : 'Complete Session'}
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    disabled={!showFeedback}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:bg-slate-400 transition-colors"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {pastSessions.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <p className="text-slate-600 mb-4">No interview sessions yet. Generate questions to get started!</p>
                  <button
                    onClick={() => setActiveTab('setup')}
                    className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Start Practicing
                  </button>
                </div>
              ) : (
                pastSessions.map((session) => (
                  <div key={session.sessionId} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {session.jobTitle ? `${session.jobTitle} at ${session.company || 'Unknown'}` : 'Interview Practice'}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {new Date(session.createdAt).toLocaleDateString()} • {session.questions.length} questions
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
                          {session.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-6">
                        <div>
                          <p className="text-xs text-slate-500 uppercase font-semibold">Completed</p>
                          <p className="text-lg font-bold text-slate-900">{session.answers.length}/{session.questions.length}</p>
                        </div>
                        {session.averageScore && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase font-semibold">Average Score</p>
                            <p className="text-lg font-bold text-primary-600">{session.averageScore}/10</p>
                          </div>
                        )}
                      </div>
                      <button className="px-4 py-2 bg-primary-100 text-primary-600 font-medium rounded-lg hover:bg-primary-200 transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default InterviewPractice;
