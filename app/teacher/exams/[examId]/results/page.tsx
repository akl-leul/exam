"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Submission, StudentInfo, Exam } from "@prisma/client";
import {
  Eye,
  Edit,
  AlertOctagon,
  Loader2,
  ListChecks,
  Users,
  ArrowLeft,
  Search,
  Filter,
} from "lucide-react";

// Types
type SubmissionWithStudentInfo = Submission & {
  studentInfo: Pick<StudentInfo, "id" | "name" | "section" | "grade">;
};
type ExamHeaderDetails = Pick<Exam, "id" | "title">;

const STATUS_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "In Progress", value: "STARTED" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Graded", value: "GRADED" },
];

export default function ExamResultsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [examDetails, setExamDetails] = useState<ExamHeaderDetails | null>(null);
  const [submissionsList, setSubmissionsList] = useState<SubmissionWithStudentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    if (!examId) {
      setErrorMessage("Exam ID is not available. Cannot load results.");
      setIsLoading(false);
      return;
    }

    const fetchExamSubmissions = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await fetch(`/api/teacher/exams/${examId}/submissions`);
        const responseText = await response.text();
        if (!response.ok) {
          let message = `Error ${response.status}: Failed to fetch exam submissions.`;
          try {
            const errData = JSON.parse(responseText);
            message = errData.message || message;
          } catch {
            if (response.status === 404) {
              message = `Error 404: The requested resource (exam submissions for exam ID ${examId}) was not found.`;
            }
          }
          throw new Error(message);
        }
        const data = JSON.parse(responseText);
        if (!data.exam || !data.submissions || !Array.isArray(data.submissions)) {
          throw new Error("Received incomplete or invalid data structure from the server.");
        }
        setExamDetails(data.exam);
        setSubmissionsList(data.submissions as SubmissionWithStudentInfo[]);
      } catch (err: any) {
        setErrorMessage(err.message || "An unexpected error occurred while loading submissions.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchExamSubmissions();
  }, [examId]);

  // Filtered and searched submissions (memoized for performance)
  const filteredSubmissions = useMemo(() => {
    return submissionsList.filter((submission) => {
      // Status filter
      if (statusFilter !== "ALL" && submission.status !== statusFilter) return false;
      // Search filter
      const search = searchTerm.trim().toLowerCase();
      if (!search) return true;
      const student = submission.studentInfo;
      return (
        student?.name?.toLowerCase().includes(search) ||
        student?.section?.toLowerCase().includes(search) ||
        student?.grade?.toLowerCase().includes(search)
      );
    });
  }, [submissionsList, searchTerm, statusFilter]);

  const getStatusChip = (status: string, isFullyGraded: boolean | null | undefined) => {
    const fullyGraded = isFullyGraded === true;
    if (status === "STARTED") {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
          In Progress
        </span>
      );
    }
    if (status === "SUBMITTED") {
      return fullyGraded ? (
        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
          Graded (Auto)
        </span>
      ) : (
        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
          Submitted (Pending Review)
        </span>
      );
    }
    if (status === "GRADED") {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full">
          Fully Graded
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
        {status || "Unknown"}
      </span>
    );
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
          onClick={() => router.push("/teacher/dashboard")}
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
        <Link
          href="/teacher/dashboard"
          className="text-indigo-600 hover:text-indigo-800 flex items-center text-sm mb-2"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center">
          <ListChecks size={30} className="mr-3 text-indigo-600" />
          Results for:{" "}
          <span className="ml-2 text-indigo-700">{examDetails?.title || "Loading exam title..."}</span>
        </h1>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        <div className="flex items-center w-full sm:w-auto">
          <Search className="h-5 w-5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search by name, section, or grade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-72"
          />
        </div>
        <div className="flex items-center">
          <Filter className="h-5 w-5 text-gray-400 mr-2" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredSubmissions.length === 0 ? (
        <div className="text-center py-10 bg-white shadow-md rounded-lg">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">No submissions match your criteria.</p>
          <p className="text-sm text-gray-500 mt-2">
            Try adjusting your search or filter options.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-xl rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade/Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {submission.studentInfo?.name || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {submission.studentInfo?.section || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {submission.studentInfo?.grade || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {submission.score !== null ? `${submission.score}` : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getStatusChip(submission.status, submission.isFullyGraded)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {submission.submittedAt
                      ? new Date(submission.submittedAt).toLocaleString()
                      : "Not Yet Submitted"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {submission.status !== "STARTED" && (
                      <Link
                        href={`/teacher/submissions/${submission.id}/grade`}
                        className="text-indigo-600 hover:text-indigo-900 inline-flex items-center px-2.5 py-1.5 border border-indigo-500 rounded-md text-xs hover:bg-indigo-50 transition-colors"
                        title="View & Grade Submission"
                      >
                        {submission.status === "SUBMITTED" && !submission.isFullyGraded ? (
                          <Edit size={14} className="mr-1" />
                        ) : (
                          <Eye size={14} className="mr-1" />
                        )}
                        {submission.status === "SUBMITTED" && !submission.isFullyGraded
                          ? "Grade"
                          : "View Details"}
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
