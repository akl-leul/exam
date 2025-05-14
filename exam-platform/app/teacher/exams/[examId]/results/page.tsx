// app/teacher/exams/[examId]/results/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Submission, StudentInfo, Exam } from '@prisma/client'; // Prisma types
import { Eye, Edit, AlertOctagon, Loader2, ListChecks, Users, ArrowLeft } from 'lucide-react'; // Removed CheckCircle as it wasn't used directly

// Define types for the data structure we expect on the frontend
type SubmissionWithStudentInfo = Submission & {
  studentInfo: Pick<StudentInfo, 'id' | 'name' | 'section' | 'grade'>; // Added id to studentInfo
};

type ExamHeaderDetails = Pick<Exam, 'id' | 'title'>;

export default function ExamResultsPage() {
  const params = useParams();
  const router = useRouter(); // Initialize useRouter
  const examId = params.examId as string;

  const [examDetails, setExamDetails] = useState<ExamHeaderDetails | null>(null);
  const [submissionsList, setSubmissionsList] = useState<SubmissionWithStudentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    console.log("ExamResultsPage: useEffect triggered. examId from params:", examId);
    if (!examId) {
      console.error("ExamResultsPage: Exam ID is missing from URL parameters.");
      setErrorMessage("Exam ID is not available. Cannot load results.");
      setIsLoading(false);
      return;
    }

    const fetchExamSubmissions = async () => {
      console.log(`ExamResultsPage: Starting to fetch submissions for examId: ${examId}`);
      setIsLoading(true);
      setErrorMessage('');
      try {
        const response = await fetch(`/api/teacher/exams/${examId}/submissions`);
        console.log(`ExamResultsPage: API call to /api/teacher/exams/${examId}/submissions - Status: ${response.status}`);
        
        const responseText = await response.text(); // Always get text first for robust error handling

        if (!response.ok) {
          console.error(`ExamResultsPage: API call failed. Status: ${response.status}. Response Text: ${responseText}`);
          let message = `Error ${response.status}: Failed to fetch exam submissions.`;
          try {
            const errData = JSON.parse(responseText); // Try to parse error from API
            message = errData.message || message;
          } catch (parseError) {
            // If responseText is not JSON (e.g., HTML 404 page from Next.js itself)
            console.warn("ExamResultsPage: Could not parse error response as JSON. Raw response might be HTML or plain text.", parseError);
            if (response.status === 404) {
                message = `Error 404: The requested resource (exam submissions for exam ID ${examId}) was not found. Please check the Exam ID or ensure the API route exists.`;
            }
          }
          throw new Error(message);
        }
        
        const data = JSON.parse(responseText); // If response.ok, expect valid JSON
        console.log("ExamResultsPage: Successfully fetched data from API:", data);

        if (!data.exam || !data.submissions || !Array.isArray(data.submissions)) {
            console.error("ExamResultsPage: API response is missing 'exam' details or 'submissions' array, or 'submissions' is not an array. Data:", data);
            throw new Error("Received incomplete or invalid data structure from the server.");
        }

        setExamDetails(data.exam);
        setSubmissionsList(data.submissions as SubmissionWithStudentInfo[]); // Cast to ensure type match

      } catch (err: any) {
        console.error("ExamResultsPage: An error occurred in fetchExamSubmissions:", err);
        setErrorMessage(err.message || "An unexpected error occurred while loading submissions.");
      } finally {
        setIsLoading(false);
        console.log("ExamResultsPage: fetchExamSubmissions process finished.");
      }
    };

    fetchExamSubmissions();
  }, [examId]); // Dependency array includes examId

  const getStatusChip = (status: string, isFullyGraded: boolean | null | undefined) => { // Handle potentially null/undefined isFullyGraded
    const fullyGraded = isFullyGraded === true; // Treat null/undefined as not fully graded

    if (status === 'STARTED') {
      return <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">In Progress</span>;
    }
    if (status === 'SUBMITTED') {
      return fullyGraded
        ? <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Graded (Auto)</span>
        : <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">Submitted (Pending Review)</span>;
    }
    if (status === 'GRADED') { // This implies teacher has finalized grades
         return <span className="px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full">Fully Graded</span>;
    }
    return <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">{status || 'Unknown'}</span>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        <p className="ml-4 text-lg text-gray-700">Loading Exam Results...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-red-50">
        <AlertOctagon className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold text-red-700 mb-2">Error Loading Results</h2>
        <p className="text-red-600 text-center mb-6">{errorMessage}</p>
        <button
            onClick={() => router.push('/teacher/dashboard')} // Use router.push
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
            Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <Link href="/teacher/dashboard" className="text-indigo-600 hover:text-indigo-800 flex items-center text-sm mb-2">
            <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <ListChecks size={30} className="mr-3 text-indigo-600" />
            Results for: <span className="ml-2 text-indigo-700">{examDetails?.title || 'Loading exam title...'}</span>
        </h1>
      </div>

      {submissionsList.length === 0 ? (
        <div className="text-center py-10 bg-white shadow-md rounded-lg">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">No submissions yet for this exam.</p>
          <p className="text-sm text-gray-500 mt-2">Ensure students have submitted their answers for this exam.</p>
        </div>
      ) : (
        <div className="bg-white shadow-xl rounded-lg overflow-x-auto"> {/* Added overflow-x-auto for smaller screens */}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade/Class
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted At
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissionsList.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {submission.studentInfo?.name || 'N/A'} {/* Added fallback for studentInfo */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {submission.studentInfo?.section || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {submission.studentInfo?.grade || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {submission.score !== null ? `${submission.score}` : 'N/A'}
                    {/* Consider adding total possible score if available from examDetails or API */}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getStatusChip(submission.status, submission.isFullyGraded)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'Not Yet Submitted'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {submission.status !== 'STARTED' && ( // Only show actions if not just "STARTED"
                        <Link
                        href={`/teacher/submissions/${submission.id}/grade`} // Link to individual grading page
                        className="text-indigo-600 hover:text-indigo-900 inline-flex items-center px-2.5 py-1.5 border border-indigo-500 rounded-md text-xs hover:bg-indigo-50 transition-colors"
                        title="View & Grade Submission"
                        >
                        {(submission.status === "SUBMITTED" && !submission.isFullyGraded) ? <Edit size={14} className="mr-1" /> : <Eye size={14} className="mr-1" />}
                        {(submission.status === "SUBMITTED" && !submission.isFullyGraded) ? 'Grade' : 'View Details'}
                        </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}