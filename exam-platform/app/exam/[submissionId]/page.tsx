"use client";
import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QuestionType } from '@prisma/client';
import { Clock, Send, AlertTriangle, Loader2 } from 'lucide-react';

type ExamOptionForStudent = { id: string; text: string };
type ExamQuestionForStudent = {
  id: string; text: string; type: QuestionType; order: number; options: ExamOptionForStudent[];
};
type StudentAnswerPayload = {
  questionId: string; selectedOptionId?: string; textAnswer?: string;
};

export default function ExamTakingPage() {
  const params = useParams();
  const router = useRouter();
  const submissionIdFromParams = params.submissionId as string;
  const logPrefix = "ExamTakingPage:";

  const [examData, setExamData] = useState<{
    title: string;
    header?: string | null;
    studentName: string;
    questions: ExamQuestionForStudent[];
    durationSeconds?: number; // <-- Add timer field
  } | null>(null);

  const [studentAnswers, setStudentAnswers] = useState<Record<string, StudentAnswerPayload>>({});
  const [isLoadingExam, setIsLoadingExam] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Fetch exam data and initialize timer
  useEffect(() => {
    if (!submissionIdFromParams) {
      setErrorMessage("Exam session ID is missing from the URL. Cannot load exam.");
      setIsLoadingExam(false);
      return;
    }
    setIsLoadingExam(true);
    setErrorMessage('');
    fetch(`/api/submissions/${submissionIdFromParams}/questions`)
      .then(async (res) => {
        const resText = await res.text();
        if (!res.ok) {
          let msg = `Error ${res.status}: Could not load exam questions.`;
          try {
            const errData = JSON.parse(resText);
            msg = errData.message || msg;
            if (errData.redirectToResults && errData.submissionId) {
              router.replace(`/exam/${errData.submissionId}/result`);
              setErrorMessage("This exam has already been submitted. Redirecting to results...");
              return null;
            }
          } catch (e) {}
          throw new Error(msg);
        }
        return JSON.parse(resText);
      })
      .then(data => {
        if (data === null) return;
        setExamData({
          title: data.examTitle,
          header: data.examHeader,
          studentName: data.studentName,
          questions: data.questions,
          durationSeconds: data.durationSeconds, // <-- Store timer value if present
        });
        const initialAnswers: Record<string, StudentAnswerPayload> = {};
        data.questions.forEach((q: ExamQuestionForStudent) => {
          initialAnswers[q.id] = { questionId: q.id };
        });
        setStudentAnswers(initialAnswers);
      })
      .catch(err => {
        if (!errorMessage) setErrorMessage(err.message || "An error occurred while loading the exam.");
      })
      .finally(() => setIsLoadingExam(false));
  }, [submissionIdFromParams, router, errorMessage]);

  // Initialize timer when examData loads
  useEffect(() => {
    if (examData?.durationSeconds && typeof examData.durationSeconds === "number") {
      setTimeLeft(examData.durationSeconds);
    }
  }, [examData?.durationSeconds]);

  // Timer countdown effect
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      if (!isSubmittingExam) {
        handleSubmitExam(null, true); // auto-submit
      }
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => (t !== null ? t - 1 : t)), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line
  }, [timeLeft]);

  const handleAnswerChange = (questionId: string, questionType: QuestionType, value: string) => {
    setStudentAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: {
        ...prevAnswers[questionId],
        questionId: questionId,
        ...(questionType === QuestionType.MCQ || questionType === QuestionType.TRUE_FALSE
          ? { selectedOptionId: value, textAnswer: undefined }
          : { textAnswer: value, selectedOptionId: undefined }),
      },
    }));
  };

  // Accept autoSubmit flag for timer
  const handleSubmitExam = async (e: FormEvent | null, autoSubmit = false) => {
    if (e) e.preventDefault();
    if (!examData) return;

    const unansweredQuestions = examData.questions.filter(q => {
      const ans = studentAnswers[q.id];
      if (q.type === QuestionType.MCQ || q.type === QuestionType.TRUE_FALSE) {
        return !ans?.selectedOptionId;
      } else if (q.type === QuestionType.SHORT_ANSWER) {
        return !ans?.textAnswer || ans.textAnswer.trim() === '';
      }
      return true;
    }).length;

    if (!autoSubmit) {
      let confirmationMessage = "Are you sure you want to submit your answers?";
      if (unansweredQuestions > 0) {
        confirmationMessage = `You have ${unansweredQuestions} unanswered question${unansweredQuestions > 1 ? "s" : ""}. Submit anyway?`;
      }
      if (!window.confirm(confirmationMessage)) return;
    }

    setIsSubmittingExam(true);
    setSubmissionError('');
    const answersToSubmit = Object.values(studentAnswers);

    try {
      const response = await fetch(`/api/submissions/${submissionIdFromParams}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersToSubmit }),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.message || `Error ${response.status}: Could not submit your answers.`);
      router.push(`/exam/${submissionIdFromParams}/result`);
    } catch (err: any) {
      setSubmissionError(err.message || "An unexpected error occurred during submission. Please try again.");
    } finally {
      setIsSubmittingExam(false);
    }
  };

  // --- JSX Rendering ---
  if (isLoadingExam) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
        <p className="text-lg text-gray-700">Loading Your Exam...</p>
      </div>
    );
  }

  if (errorMessage && !examData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
        <AlertTriangle size={48} className="text-red-600 mb-4" />
        <h1 className="text-2xl font-bold text-red-700 mb-3">Error Loading Exam</h1>
        <p className="text-red-600 mb-6">{errorMessage}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  if (!examData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <p>No exam data available for this session. This might be a temporary issue or the session is invalid.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="bg-white shadow-lg rounded-lg p-5 sm:p-6 mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-1">
            {examData.title}
          </h1>
          {examData.header && (
            <p className="text-md text-gray-600 mb-2">{examData.header}</p>
          )}
          <p className="text-sm text-indigo-600 font-medium">
            Taking exam as: {examData.studentName}
          </p>
          {/* TIMER */}
          {typeof examData.durationSeconds === "number" && (
            <div className="flex items-center justify-center mt-4">
              <Clock className="text-indigo-500 mr-2" />
              {typeof timeLeft === "number" && timeLeft > 0 ? (
                <>
                  <span className="text-lg font-semibold text-indigo-700">
                    {Math.floor(timeLeft / 60).toString().padStart(2, "0")}:
                    {(timeLeft % 60).toString().padStart(2, "0")}
                  </span>
                  <span className="ml-2 text-sm text-gray-500">Time Remaining</span>
                </>
              ) : timeLeft === 0 ? (
                <span className="text-red-600 font-semibold ml-2">
                  Time is up! Submitting your answers...
                </span>
              ) : null}
            </div>
          )}
        </header>

        {submissionError && (
          <div className="mb-6 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm flex items-center">
            <AlertTriangle size={18} className="mr-2 flex-shrink-0" />
            <span>{submissionError}</span>
          </div>
        )}

        <form onSubmit={handleSubmitExam} className="space-y-6">
          {examData.questions.map((q, index) => (
            <div key={q.id} className="bg-white p-5 sm:p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <p className="text-xs font-semibold text-blue-600 mb-1">Question {index + 1}</p>
              <p className="text-md sm:text-lg font-medium text-gray-800 mb-4 whitespace-pre-wrap">{q.text}</p>
              {q.type === QuestionType.MCQ && (
                <div className="space-y-2">
                  {q.options.map(opt => (
                    <label key={opt.id} className="flex items-center p-3 border rounded-md hover:bg-indigo-50 cursor-pointer transition-colors has-[:checked]:bg-indigo-100 has-[:checked]:border-indigo-400">
                      <input
                        type="radio" name={`question-${q.id}`} value={opt.id}
                        checked={studentAnswers[q.id]?.selectedOptionId === opt.id}
                        onChange={(e) => handleAnswerChange(q.id, q.type, e.target.value)}
                        className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-3 text-sm text-gray-700">{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === QuestionType.TRUE_FALSE && (
                <div className="space-y-2">
                  {q.options.map(opt => (
                    <label key={opt.id} className="flex items-center p-3 border rounded-md hover:bg-indigo-50 cursor-pointer transition-colors has-[:checked]:bg-indigo-100 has-[:checked]:border-indigo-400">
                      <input
                        type="radio" name={`question-${q.id}`} value={opt.id}
                        checked={studentAnswers[q.id]?.selectedOptionId === opt.id}
                        onChange={(e) => handleAnswerChange(q.id, q.type, e.target.value)}
                        className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="ml-3 text-sm text-gray-700">{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === QuestionType.SHORT_ANSWER && (
                <textarea
                  rows={3}
                  value={studentAnswers[q.id]?.textAnswer || ''}
                  onChange={(e) => handleAnswerChange(q.id, q.type, e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Type your answer here..."
                />
              )}
            </div>
          ))}

          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-center">
            <button
              type="submit"
              disabled={isSubmittingExam || isLoadingExam || !examData || examData.questions.length === 0}
              className="w-full max-w-sm bg-green-600 text-white py-2.5 px-6 rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-150 text-md font-semibold flex items-center justify-center disabled:opacity-60"
            >
              {isSubmittingExam ? (
                <><Loader2 className="animate-spin h-5 w-5 mr-2" /> Submitting Exam...</>
              ) : (
                <><Send className="mr-2 h-5 w-5" /> Submit My Answers</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
