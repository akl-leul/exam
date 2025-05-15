// app/teacher/submissions/[submissionId]/grade/page.tsx
"use client";
import { useState, useEffect, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    Submission, 
    Answer as PrismaAnswer, 
    Question as PrismaQuestion, 
    Option as PrismaOption, 
    StudentInfo, 
    Exam,
    QuestionType 
} from '@prisma/client';
import { Loader2, AlertTriangle, Save, CheckCircle, XCircle, MessageSquare, ArrowLeft, UserCircle, BookOpen } from 'lucide-react';

// Types to match the data structure from GET /api/teacher/submissions/[submissionId]/details
type FullOption = PrismaOption;
type FullQuestion = PrismaQuestion & { options: FullOption[] };
type AnswerWithQuestionDetails = PrismaAnswer & {
  question: FullQuestion;
  selectedOption?: FullOption | null;
};
type SubmissionForGrading = Submission & {
  studentInfo: StudentInfo;
  exam: Pick<Exam, 'id' | 'title'>;
  answers: AnswerWithQuestionDetails[];
};

// Type for local state of points being edited
type PointsUpdate = {
    answerId: string;
    pointsAwarded: string; // Keep as string for input field, parse to number on save
};

export default function GradeSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId as string;
  const logPrefix = `GradeSubmissionPage (ID: ${submissionId}):`;

  const [submissionData, setSubmissionData] = useState<SubmissionForGrading | null>(null);
  const [totalPossibleScore, setTotalPossibleScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Local state for short answer points
  const [shortAnswerPoints, setShortAnswerPoints] = useState<Record<string, string>>({}); // answerId -> points string

  useEffect(() => {
    console.log(`${logPrefix} useEffect triggered.`);
    if (!submissionId) {
      setError("Submission ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchSubmissionDetails = async () => {
      setIsLoading(true);
      setError('');
      setSuccessMessage('');
      try {
        const response = await fetch(`/api/teacher/submissions/${submissionId}/details`);
        console.log(`${logPrefix} Fetch submission details - Status: ${response.status}`);
        const resText = await response.text();
        if (!response.ok) {
          let msg = `Error ${response.status}: Could not load submission details.`;
          try { const errData = JSON.parse(resText); msg = errData.message || msg; } 
          catch (e) { if (response.status === 404) msg = "Submission not found."; }
          throw new Error(msg);
        }
        const data = JSON.parse(resText);
        console.log(`${logPrefix} Submission details fetched:`, data);
        if (!data.submission || data.totalPossibleScore === undefined) {
          throw new Error("Invalid data structure received from server.");
        }
        setSubmissionData(data.submission);
        setTotalPossibleScore(data.totalPossibleScore);

        // Initialize shortAnswerPoints state from fetched data
        const initialPoints: Record<string, string> = {};
        (data.submission.answers as AnswerWithQuestionDetails[]).forEach(ans => {
          if (ans.question.type === QuestionType.SHORT_ANSWER && ans.pointsAwarded !== null) {
            initialPoints[ans.id] = ans.pointsAwarded.toString();
          } else if (ans.question.type === QuestionType.SHORT_ANSWER) {
            initialPoints[ans.id] = ''; // Default to empty string for ungraded SA
          }
        });
        setShortAnswerPoints(initialPoints);

      } catch (err: any) {
        console.error(`${logPrefix} Error fetching submission details:`, err);
        setError(err.message || "Failed to load submission details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubmissionDetails();
  }, [submissionId]);

  const handlePointsChange = (answerId: string, value: string) => {
    setShortAnswerPoints(prev => ({ ...prev, [answerId]: value }));
  };

  const handleSaveChanges = async () => {
    console.log(`${logPrefix} handleSaveChanges called.`);
    if (!submissionData) {
      setError("No submission data loaded to save.");
      return;
    }
    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    const gradesToUpdate: PointsUpdate[] = [];
    for (const answerId in shortAnswerPoints) {
        // Only include if it's a short answer question associated with this answerId
        const relatedAnswer = submissionData.answers.find(ans => ans.id === answerId);
        if (relatedAnswer && relatedAnswer.question.type === QuestionType.SHORT_ANSWER) {
            const pointsStr = shortAnswerPoints[answerId];
            // Validate pointsStr: should be a number or empty (for null)
            const pointsNum = parseFloat(pointsStr);
            if (pointsStr === '' || pointsStr === null || pointsStr === undefined) { // Treat empty as clearing points
                 gradesToUpdate.push({ answerId, pointsAwarded: null as any }); // Send null if empty
            } else if (!isNaN(pointsNum) && pointsNum >= 0) { // Assuming max points per SA is handled by teacher visually
                 gradesToUpdate.push({ answerId, pointsAwarded: pointsNum.toString() });
            } else {
                setError(`Invalid points value "${pointsStr}" for one of the short answers. Please enter a number (e.g., 0, 0.5, 1).`);
                setIsSaving(false);
                return;
            }
        }
    }
    
    if (gradesToUpdate.length === 0) {
        setSuccessMessage("No short answer grades were changed or entered.");
        setIsSaving(false);
        return;
    }
    console.log(`${logPrefix} Grades to update:`, gradesToUpdate);

    try {
      const response = await fetch(`/api/teacher/submissions/${submissionId}/grade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            grades: gradesToUpdate.map(g => ({
                answerId: g.answerId,
                pointsAwarded: g.pointsAwarded === null ? null : parseFloat(g.pointsAwarded) // Parse to number before sending
            }))
        }),
      });
      console.log(`${logPrefix} Save grades API response status: ${response.status}`);
      const responseData = await response.json();

      if (!response.ok) {
        console.error(`${logPrefix} Failed to save grades. Status: ${response.status}, ResponseData:`, responseData);
        throw new Error(responseData.message || responseData.detail || `Error ${response.status}: Failed to save grades.`);
      }
      console.log(`${logPrefix} Grades saved successfully. ResponseData:`, responseData);
      setSuccessMessage("Grades saved successfully! Student's total score has been updated.");
      // Optionally, update local submissionData.score and isFullyGraded from responseData.submission
      if (responseData.submission) {
        setSubmissionData(prev => prev ? { ...prev, score: responseData.submission.score, isFullyGraded: responseData.submission.isFullyGraded, status: responseData.submission.status } : null);
      }

    } catch (err: any) {
      console.error(`${logPrefix} Error saving grades:`, err);
      setError(err.message || "An unexpected error occurred while saving grades.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- JSX Rendering Logic ---
  if (isLoading) { /* ... Loading JSX ... */ }
  if (error && !submissionData) { /* ... Error JSX for initial load fail ... */ }
  if (!submissionData) { /* ... Fallback if no data ... */ }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        <p className="ml-4 text-lg text-gray-700">Loading Submission for Grading...</p>
      </div>
    );
  }

  if (error && !submissionData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-red-50">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold text-red-700 mb-2">Error Loading Submission</h2>
        <p className="text-red-600 text-center mb-6">{error}</p>
        <Link href={`/teacher/exams/${submissionData?.examId || ''}/results`} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Back to Exam Results
        </Link>
      </div>
    );
  }
  
  if (!submissionData) {
    return <div className="p-8 text-center">Submission data could not be loaded.</div>;
  }

  const { studentInfo, exam, answers, score, isFullyGraded, status } = submissionData;
  const percentage = (score !== null && totalPossibleScore !== null && totalPossibleScore > 0) 
                     ? ((score / totalPossibleScore) * 100).toFixed(1) 
                     : null;


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
            <Link href={`/teacher/exams/${exam.id}/results`} className="text-indigo-600 hover:text-indigo-800 flex items-center text-sm mb-2">
                <ArrowLeft size={16} className="mr-1" /> Back to All Results for "{exam.title}"
            </Link>
            <h1 className="text-3xl font-bold text-gray-800">Grade Submission</h1>
        </div>

        {/* Submission & Student Info Header */}
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-indigo-700 flex items-center mb-1">
                        <BookOpen size={20} className="mr-2"/> {exam.title}
                    </h2>
                    <p className="text-sm text-gray-500">Exam ID: {exam.id}</p>
                </div>
                <div>
                    <h3 className="text-lg font-medium text-gray-700 flex items-center mb-1">
                        <UserCircle size={20} className="mr-2"/> {studentInfo.name}
                    </h3>
                    <p className="text-sm text-gray-500">Section: {studentInfo.section} | Grade: {studentInfo.grade}</p>
                    <p className="text-sm text-gray-500">Submission ID: {submissionData.id}</p>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t text-center">
                <p className="text-lg font-semibold">
                    Current Score: {score ?? <span className="italic">Not yet fully calculated</span>} / {totalPossibleScore ?? 'N/A'}
                    {percentage && ` (${percentage}%)`}
                </p>
                <p className={`text-xs mt-1 font-medium ${isFullyGraded ? 'text-green-600' : 'text-yellow-600'}`}>
                    Status: {isFullyGraded ? 'Fully Graded' : (status === 'SUBMITTED' ? 'Pending Final Grading' : status)}
                </p>
            </div>
        </div>

        {error && <p className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>}
        {successMessage && <p className="bg-green-100 border border-green-300 text-green-700 p-3 rounded-md mb-4 text-sm">{successMessage}</p>}

        {/* Answers Section */}
        <div className="space-y-6">
            {answers.map((ans, index) => (
                <div key={ans.id} className="bg-white p-5 rounded-lg shadow-md border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-md font-semibold text-gray-800">
                        <span className="text-blue-600">Q{index + 1}:</span> <span className="whitespace-pre-wrap">{ans.question.text}</span>
                        </p>
                        {/* Auto-grade status for MCQ/TF */}
                        {(ans.question.type === QuestionType.MCQ || ans.question.type === QuestionType.TRUE_FALSE) && (
                            ans.isCorrect ? 
                                <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center">
                                    <CheckCircle size={14} className="mr-1"/> Correct ({ans.pointsAwarded ?? 0} pts)
                                </span> :
                                <span className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-700 rounded-full flex items-center">
                                    <XCircle size={14} className="mr-1"/> Incorrect ({ans.pointsAwarded ?? 0} pts)
                                </span>
                        )}
                    </div>
                    
                    {/* Display student's choice for MCQ/TF */}
                    {(ans.question.type === QuestionType.MCQ || ans.question.type === QuestionType.TRUE_FALSE) && (
                        <div className="mt-2 text-sm">
                            <span className="font-medium text-gray-600">Student's Answer: </span>
                            <span className={`font-semibold ${ans.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                {ans.selectedOption ? ans.selectedOption.text : <span className="italic text-gray-500">Not Answered</span>}
                            </span>
                            {!ans.isCorrect && ans.question.options.find(o => o.isCorrect) && (
                                <p className="text-xs text-green-600 mt-1">
                                    Correct Answer: {ans.question.options.find(o => o.isCorrect)?.text}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Input for Short Answer grading */}
                    {ans.question.type === QuestionType.SHORT_ANSWER && (
                        <div className="mt-2">
                            <p className="text-sm font-medium text-gray-600 mb-1">Student's Answer:</p>
                            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-md whitespace-pre-wrap text-sm mb-3">
                                {ans.textAnswer || <span className="italic text-gray-400">No answer provided.</span>}
                            </div>
                            <div className="flex items-center space-x-2">
                                <label htmlFor={`points-${ans.id}`} className="text-sm font-medium text-gray-700">Points Awarded:</label>
                                <input
                                    type="number"
                                    id={`points-${ans.id}`}
                                    value={shortAnswerPoints[ans.id] || ''}
                                    onChange={(e) => handlePointsChange(ans.id, e.target.value)}
                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="e.g., 1"
                                    min="0"
                                    step="0.5" // Allow half points if needed
                                    // max={1} // TODO: Set max based on question's possible points
                                />
                                <span className="text-xs text-gray-500">(Max: {1 /* TODO: Make dynamic */})</span>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>

        {/* Save Changes Button */}
        <div className="mt-8 pt-6 border-t border-gray-300 flex justify-end">
            <button
                onClick={handleSaveChanges}
                disabled={isSaving || isLoading}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-md shadow-md flex items-center transition duration-150 disabled:opacity-70"
            >
                {isSaving ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save size={18} className="mr-2" />}
                {isSaving ? 'Saving Grades...' : 'Save All Grades'}
            </button>
        </div>
    </div>
  );
}