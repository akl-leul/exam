// app/exam/[submissionId]/result/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    QuestionType, 
    Submission, 
    Answer as PrismaAnswer, // Alias to avoid naming conflict if you have a local 'Answer' type
    Question as PrismaQuestion, 
    Option as PrismaOption, 
    StudentInfo, 
    Exam 
} from '@prisma/client';
import { CheckCircle, XCircle, Edit3, AlertTriangle, FileText, Award, Loader2, Home, MessageSquare } from 'lucide-react'; // Added MessageSquare

// Define precise types for the data structure expected from the API
type FullOptionFromDb = PrismaOption; // Prisma's Option type, includes 'isCorrect'
type FullQuestionFromDb = PrismaQuestion & { 
    options: FullOptionFromDb[]; // Question with all its options (including correct answer info)
};
type AnswerWithFullDetails = PrismaAnswer & { 
  question: FullQuestionFromDb;         // The full question object
  selectedOption?: FullOptionFromDb | null; // The specific Option object student selected (if MCQ/TF)
};
type SubmissionForResultsPage = Submission & {
  studentInfo: StudentInfo; // Full StudentInfo object
  exam: Pick<Exam, 'id' | 'title' | 'header'>; // Necessary exam details
  answers: AnswerWithFullDetails[]; // Array of answers with all details
};

export default function ExamResultPage() {
  const params = useParams();
  const router = useRouter();
  const submissionIdFromParams = params.submissionId as string; // Get submissionId from URL
  const logPrefix = "ExamResultPage:";

  const [resultData, setResultData] = useState<{
    submission: SubmissionForResultsPage;
    totalPossibleScore: number;
  } | null>(null);
  
  const [isLoadingResults, setIsLoadingResults] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    console.log(`${logPrefix} useEffect triggered. submissionId:`, submissionIdFromParams);
    if (!submissionIdFromParams) {
      console.error(`${logPrefix} No submissionId in params.`);
      setErrorMessage("Submission ID is missing from the URL. Cannot load results.");
      setIsLoadingResults(false);
      return;
    }

    setIsLoadingResults(true);
    setErrorMessage(''); // Reset error message on new fetch attempt
    fetch(`/api/submissions/${submissionIdFromParams}/result`)
      .then(async (res) => {
        console.log(`${logPrefix} Fetch results for submission ${submissionIdFromParams} - Status: ${res.status}`);
        const resText = await res.text();
        if (!res.ok) {
          let msg = `Error ${res.status}: Could not load your exam results.`;
          try { 
            const errData = JSON.parse(resText);
            msg = errData.message || msg;
            if (errData.redirectToExam && errData.submissionId) {
                console.warn(`${logPrefix} Exam not yet submitted, redirecting to take exam page for submission:`, errData.submissionId);
                router.replace(`/exam/${errData.submissionId}`); // Redirect to exam taking page
                setErrorMessage("This exam has not been submitted yet. Redirecting..."); 
                return null; // Signal to stop further processing in .then chain
            }
          } catch (e) { 
            console.warn(`${logPrefix} Could not parse error response as JSON for submission ${submissionIdFromParams}. Raw response:`, resText);
            if (res.status === 404) msg = `Results for submission ID "${submissionIdFromParams}" not found.`;
          }
          console.error(`${logPrefix} Error fetching results for submission ${submissionIdFromParams} -`, msg);
          throw new Error(msg);
        }
        return JSON.parse(resText); // If res.ok, expect valid JSON
      })
      .then(data => {
        if (data === null) return; // Stop if redirected by previous block
        console.log(`${logPrefix} Results fetched successfully for submission ${submissionIdFromParams}:`, data);
        if (!data.submission || data.totalPossibleScore === undefined || !data.submission.answers) {
            console.error(`${logPrefix} Invalid result data structure from server for submission ${submissionIdFromParams}. Missing 'submission', 'totalPossibleScore', or 'submission.answers'. Data:`, data);
            throw new Error("Received incomplete or invalid result data from the server.");
        }
        // Type assertion can be risky, ensure API sends correct structure
        setResultData(data as { submission: SubmissionForResultsPage; totalPossibleScore: number });
      })
      .catch(err => {
        console.error(`${logPrefix} Catch block for fetching results for submission ${submissionIdFromParams} -`, err);
        if(!errorMessage) { // Avoid overwriting specific redirect messages
            setErrorMessage(err.message || "An error occurred while loading your results. Please try again.");
        }
      })
      .finally(() => {
        setIsLoadingResults(false);
        console.log(`${logPrefix} Fetching results finished for submission ${submissionIdFromParams}.`);
      });
  // router and errorMessage are included in deps if their change should trigger side effects or re-evaluation
  }, [submissionIdFromParams, router, errorMessage]); 

  // Helper function to determine styling for MCQ/TF options
  const getOptionFeedbackClass = (
    option: FullOptionFromDb, // The current option being rendered
    studentSelectedThisOption: boolean, // Did the student select THIS option?
    isQuestionCorrectOverall: boolean | null // Was the student's answer to the WHOLE question correct?
  ) => {
    if (option.isCorrect) { // This option is the correct answer for the question
      return 'bg-green-100 border-green-500 text-green-700 font-semibold ring-1 ring-green-500';
    }
    // If this option was selected by student AND the student's answer to the question was INCORRECT
    if (studentSelectedThisOption && isQuestionCorrectOverall === false) {
      return 'bg-red-100 border-red-500 text-red-700 ring-1 ring-red-500';
    }
    // Default for unselected incorrect options, or selected correct options (already handled above)
    return 'border-gray-300 bg-gray-50';
  };

  // --- JSX Rendering Logic ---
  if (isLoadingResults) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
        <p className="text-lg text-gray-700">Loading Your Exam Results...</p>
      </div>
    );
  }

  if (errorMessage && !resultData) { // Show error if loading failed and no data is present
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
        <AlertTriangle size={48} className="text-red-600 mb-4" />
        <h1 className="text-2xl font-bold text-red-700 mb-3">Error Loading Results</h1>
        <p className="text-red-600 mb-6">{errorMessage}</p>
        <button 
            onClick={() => router.push('/')} 
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
        >
            <Home size={16} className="mr-2"/> Go to Homepage
        </button>
      </div>
    );
  }
  
  if (!resultData) { // Fallback if resultData is null after loading (should be rare if error handling is good)
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
            <AlertTriangle size={48} className="text-yellow-500 mb-4" />
            <p className="text-lg text-yellow-700">Could not retrieve your exam results at this time.</p>
            <p className="text-sm text-gray-500 mt-2">Please try refreshing the page or contact support if the issue persists.</p>
             <button 
                onClick={() => router.refresh()} 
                className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
                Try Reloading Page
            </button>
        </div>
    );
  }

  // If data is loaded successfully:
  const { submission, totalPossibleScore } = resultData;
  const { studentInfo, exam, answers, score, isFullyGraded, status } = submission;
  // Calculate percentage, handle division by zero or null score
  const percentage = (score !== null && totalPossibleScore > 0) 
                     ? ((score / totalPossibleScore) * 100).toFixed(1) 
                     : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <header className="bg-white shadow-xl rounded-lg p-6 sm:p-8 mb-8 text-center">
          <Award size={56} className="mx-auto text-yellow-500 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 mb-1">
            {exam.title} - Your Results
          </h1>
          {exam.header && <p className="text-md text-gray-600 mb-2">{exam.header}</p>}
          <p className="text-sm text-indigo-700 font-medium">
            Student: {studentInfo.name} ({studentInfo.section} - {studentInfo.grade})
          </p>
        </header>

        {/* Score Summary Section */}
        <section className="mt-6 py-4 px-6 bg-white shadow-lg rounded-lg border border-gray-200 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-indigo-700">
            Your Score: {score ?? <span className="italic text-gray-500">Pending</span>} / {totalPossibleScore ?? 'N/A'}
            {percentage !== null && <span className="text-lg"> ({percentage}%)</span>}
          </h2>
          {status === "SUBMITTED" && !isFullyGraded && (
            <p className="text-xs text-yellow-700 mt-2 bg-yellow-50 p-2 rounded-md flex items-center justify-center">
              <Edit3 size={14} className="inline mr-1.5 flex-shrink-0" /> 
              Some questions are pending manual grading by your teacher. Your final score may change.
            </p>
          )}
          {(status === "GRADED" || (status === "SUBMITTED" && isFullyGraded === true)) && ( // Check isFullyGraded explicitly
            <p className="text-xs text-green-700 mt-2 bg-green-50 p-2 rounded-md flex items-center justify-center">
                <CheckCircle size={14} className="inline mr-1.5 flex-shrink-0" /> 
                This exam has been graded.
            </p>
          )}
        </section>

        {/* Detailed Answer Review Section */}
        <h2 className="text-xl font-semibold text-gray-700 mb-5 mt-10 pt-4 border-t border-gray-200">Detailed Answer Review:</h2>
        <div className="space-y-5">
          {answers.map((ans, index) => (
            <div key={ans.id} className="bg-white p-4 sm:p-5 rounded-lg shadow-md border border-gray-200">
              <div className="flex justify-between items-start mb-3">
                <p className="text-sm sm:text-md font-semibold text-gray-800 flex-grow">
                  <span className="text-blue-600">Q{index + 1}:</span> <span className="whitespace-pre-wrap">{ans.question.text}</span>
                </p>
                {/* Feedback Icon for auto-graded questions */}
                {ans.question.type !== QuestionType.SHORT_ANSWER && (
                  ans.isCorrect === true ? 
                    <CheckCircle size={20} className="text-green-500 flex-shrink-0 ml-2" title="Correct" /> :
                  ans.isCorrect === false ?
                    <XCircle size={20} className="text-red-500 flex-shrink-0 ml-2" title="Incorrect" /> :
                    <MessageSquare size={20} className="text-gray-400 flex-shrink-0 ml-2" title="Not answered or N/A" /> 
                )}
                {/* Points for Short Answer questions */}
                {ans.question.type === QuestionType.SHORT_ANSWER && (
                  (isFullyGraded || ans.pointsAwarded !== null) ? // Show points if graded or specifically awarded
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                        ans.pointsAwarded !== null && ans.pointsAwarded > 0 ? 'bg-green-100 text-green-700' 
                        : (ans.pointsAwarded === 0 ? 'bg-red-100 text-red-600' 
                        : 'bg-yellow-100 text-yellow-700') // Neutral if pointsAwarded is null but graded
                    }`}>
                        {ans.pointsAwarded ?? '0'} / {1 /* TODO: Make SA points dynamic from question.points */} pts
                    </span>
                    : <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded italic">Pending Grade</span>
                )}
              </div>

              {/* Displaying options for MCQ/TF */}
              {(ans.question.type === QuestionType.MCQ || ans.question.type === QuestionType.TRUE_FALSE) && ans.question.options && (
                <div className="space-y-1.5 mt-2">
                  {ans.question.options.map(opt => (
                    <div 
                        key={opt.id} 
                        className={`flex items-center p-2 border rounded-md text-xs ${getOptionFeedbackClass(opt, ans.selectedOption?.id === opt.id, ans.isCorrect)}`}
                    >
                      <span className="font-medium">{opt.text}</span>
                      {ans.selectedOption?.id === opt.id && <span className="ml-auto text-xs font-semibold opacity-80">(Your Choice)</span>}
                      {opt.isCorrect && ans.selectedOption?.id !== opt.id && <span className="ml-auto text-xs font-semibold opacity-80">(Correct Answer)</span>}
                    </div>
                  ))}
                   {!ans.selectedOptionId && ( // If student didn't select any option
                      <p className="text-xs text-red-600 p-1.5 bg-red-50 rounded-md mt-1">You did not select an answer for this question.</p>
                  )}
                </div>
              )}

              {/* Displaying text answer for Short Answer */}
              {ans.question.type === QuestionType.SHORT_ANSWER && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Your Answer:</p>
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-md whitespace-pre-wrap text-sm">
                    {ans.textAnswer || <span className="italic text-gray-400">No answer provided.</span>}
                  </div>
                  {/* TODO: Display teacher feedback for SA if available (add a field to Answer model for teacher_feedback_text) */}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Back to Home Button */}
        <div className="mt-10 text-center">
             <button 
                onClick={() => router.push('/')} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-md shadow transition-colors flex items-center mx-auto"
            >
                <Home size={16} className="mr-2"/> Back to Homepage
            </button>
        </div>
      </div>
    </div>
  );
}