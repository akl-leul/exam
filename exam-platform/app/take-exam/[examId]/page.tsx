// app/take-exam/[examId]/page.tsx
"use client";
import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { z } from 'zod';
import { AlertTriangle, CheckCircle, Loader2, BookOpen, Home } from 'lucide-react';

const studentInfoSchemaClient = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  section: z.string().min(1, "Section is required."),
  grade: z.string().min(1, "Grade/Class is required."),
});

type PublicExamDetails = {
  id: string;
  title: string;
  header?: string | null;
  instructions?: string | null;
};

export default function StartExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const logPrefix = "StartExamPage:";

  const [publicExamDetails, setPublicExamDetails] = useState<PublicExamDetails | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentSection, setStudentSection] = useState('');
  const [studentGrade, setStudentGrade] = useState('');
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string[] | undefined>>({});
  const [apiFormError, setApiFormError] = useState('');
  
  const [isFetchingExamInfo, setIsFetchingExamInfo] = useState(true);
  const [isSubmittingStudentInfo, setIsSubmittingStudentInfo] = useState(false);

  useEffect(() => {
    console.log(`${logPrefix} useEffect triggered. examId:`, examId);
    if (!examId) {
      console.error(`${logPrefix} No examId in params.`);
      setApiFormError("Exam ID is missing from the URL. Cannot load exam details.");
      setIsFetchingExamInfo(false);
      return;
    }

    setIsFetchingExamInfo(true);
    setApiFormError('');
    fetch(`/api/exams/${examId}/public`) // Absolute path, correct
      .then(async (res) => {
        console.log(`${logPrefix} Fetch public exam details - Status: ${res.status}`);
        const resText = await res.text();
        if (!res.ok) {
          let msg = `Error ${res.status}: Could not load exam information.`;
          try { 
            const errData = JSON.parse(resText); msg = errData.message || msg; 
            console.error(`${logPrefix} API error object:`, errData);
          } 
          catch (e) { 
            if (res.status === 404) msg = `The requested exam (ID: "${examId}") was not found. Please verify the link.`;
            console.warn(`${logPrefix} Could not parse error response as JSON. Raw response:`, resText);
          }
          throw new Error(msg);
        }
        return JSON.parse(resText);
      })
      .then(data => {
        console.log(`${logPrefix} Public exam details fetched successfully:`, data);
        if (!data.exam) {
          console.error(`${logPrefix} 'exam' property missing in API response.`);
          throw new Error("Exam details structure from API is incorrect.");
        }
        setPublicExamDetails(data.exam);
      })
      .catch(err => {
        console.error(`${logPrefix} Catch block for fetching public exam details -`, err);
        setApiFormError(err.message || "Failed to load exam information. Please try refreshing.");
      })
      .finally(() => {
        setIsFetchingExamInfo(false);
        console.log(`${logPrefix} Fetching public exam details finished.`);
      });
  }, [examId]);

  const handleStartExamSubmit = async (e: FormEvent) => {
    e.preventDefault();
    console.log(`${logPrefix} handleStartExamSubmit called.`);
    setValidationErrors({});
    setApiFormError('');
    setIsSubmittingStudentInfo(true);

    const clientValidationResult = studentInfoSchemaClient.safeParse({
      name: studentName,
      section: studentSection,
      grade: studentGrade,
    });

    if (!clientValidationResult.success) {
      const fieldErrors = clientValidationResult.error.flatten().fieldErrors;
      console.warn(`${logPrefix} Client-side Zod validation failed:`, fieldErrors);
      setValidationErrors(fieldErrors as Record<string, string[] | undefined>); 
      setApiFormError("Please correct the highlighted fields."); 
      setIsSubmittingStudentInfo(false);
      return;
    }
    console.log(`${logPrefix} Client-side validation passed. Submitting info for examId: ${examId}`);

    try {
      // ----------------- THE FIX IS HERE -----------------
      const response = await fetch('/api/submissions/start', { // Changed from './api/...' to '/api/...'
      // ---------------------------------------------------
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentName,
          section: studentSection,
          grade: studentGrade,
          examId: examId,
        }),
      });
      console.log(`${logPrefix} API POST /api/submissions/start - Status: ${response.status}`);
      
      let responseData;
      try {
        responseData = await response.json();
      } catch (jsonError: any) {
        console.error(`${logPrefix} Failed to parse API response from /start as JSON. Status: ${response.status}. Error:`, jsonError);
        const genericMessage = `Error ${response.status}: Could not process your request. The server's response was not in the expected JSON format.`;
        setApiFormError(genericMessage);
        throw new Error(genericMessage);
      }
      console.log(`${logPrefix} Parsed API response data from /start:`, responseData);

      if (!response.ok) {
        console.error(`${logPrefix} API error starting submission. Status: ${response.status}. ResponseData:`, responseData);
        
        let message = `Error ${response.status}: Could not start the exam.`;
        if (responseData && responseData.message) {
            message = responseData.message;
        } else if (responseData && responseData.detail) {
            message = typeof responseData.detail === 'string' ? responseData.detail : JSON.stringify(responseData.detail);
        }
        
        const errorsFromServer = responseData?.errors;

        if (errorsFromServer && typeof errorsFromServer === 'object' && Object.keys(errorsFromServer).length > 0) {
            setValidationErrors(errorsFromServer as Record<string, string[] | undefined>);
            setApiFormError(responseData.message || "Please review the fields based on server feedback.");
        } else {
            setApiFormError(message);
        }
        throw new Error(message);
      }

      console.log(`${logPrefix} Submission started successfully. API response:`, responseData);
      if (!responseData.submission || !responseData.submission.id) {
        console.error(`${logPrefix} API response for start submission is missing 'submission.id'.`);
        throw new Error("The server did not return a valid submission ID. Please contact support.");
      }
      
      router.push(`/exam/${responseData.submission.id}`);

    } catch (error: any) {
      console.error(`${logPrefix} Catch block for starting submission - Final error message:`, error.message);
      if (!apiFormError && !Object.keys(validationErrors).length) { 
        setApiFormError(error.message || 'An unexpected network error occurred. Please check your connection and try again.');
      }
    } finally {
      setIsSubmittingStudentInfo(false);
      console.log(`${logPrefix} Submitting student info process finished.`);
    }
  };
  
  // --- JSX Rendering ---
  if (isFetchingExamInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
        <p className="text-lg text-gray-700">Loading Exam Information...</p>
      </div>
    );
  }

  if (!publicExamDetails && apiFormError) { 
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
        <AlertTriangle size={48} className="text-red-600 mb-4" />
        <h1 className="text-2xl font-bold text-red-700 mb-3">Exam Not Available</h1>
        <p className="text-red-600 mb-6">{apiFormError}</p>
        <button 
            onClick={() => router.push('/')} 
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
        >
            <Home size={16} className="mr-2"/> Go to Homepage
        </button>
      </div>
    );
  }

  if (!publicExamDetails) {
    return (
         <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
            <AlertTriangle size={48} className="text-yellow-500 mb-4" />
            <p className="text-lg text-yellow-700">Could not load exam details. The exam might not exist or there was a problem.</p>
             <button 
                onClick={() => router.refresh()}
                className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
                Try Reloading Page
            </button>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all hover:shadow-3xl">
        <div className="text-center mb-6">
            <BookOpen size={48} className="mx-auto text-indigo-600 mb-3" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              {publicExamDetails.title}
            </h1>
            {publicExamDetails.header && (
            <p className="text-sm text-gray-500 mt-1">{publicExamDetails.header}</p>
            )}
        </div>

        {publicExamDetails.instructions && (
            <div className="my-4 p-3 bg-indigo-50 border-l-4 border-indigo-500 text-indigo-800 rounded-md">
                <h3 className="font-semibold text-sm">Instructions:</h3>
                <p className="text-xs whitespace-pre-wrap">{publicExamDetails.instructions}</p>
            </div>
        )}
        
        <p className="text-gray-700 mb-5 text-sm text-center">Please fill in your details to begin.</p>

        {apiFormError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm flex items-center">
            <AlertTriangle size={18} className="mr-2 flex-shrink-0" />
            <span>{apiFormError}</span>
          </div>
        )}
        
        <form onSubmit={handleStartExamSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text" id="name" value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className={`w-full px-3 py-2 text-sm border ${validationErrors.name ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 ${validationErrors.name ? 'focus:ring-red-500' : 'focus:ring-indigo-500'}`}
              required placeholder="e.g., Jane Doe"
            />
            {validationErrors.name && <p className="text-red-600 text-xs mt-1">{validationErrors.name[0]}</p>}
          </div>
          <div>
            <label htmlFor="section" className="block text-xs font-medium text-gray-700 mb-1">Section</label>
            <input
              type="text" id="section" value={studentSection}
              onChange={(e) => setStudentSection(e.target.value)}
              className={`w-full px-3 py-2 text-sm border ${validationErrors.section ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 ${validationErrors.section ? 'focus:ring-red-500' : 'focus:ring-indigo-500'}`}
              required placeholder="e.g., Section A"
            />
            {validationErrors.section && <p className="text-red-600 text-xs mt-1">{validationErrors.section[0]}</p>}
          </div>
          <div>
            <label htmlFor="grade" className="block text-xs font-medium text-gray-700 mb-1">Grade / Class</label>
            <input
              type="text" id="grade" value={studentGrade}
              onChange={(e) => setStudentGrade(e.target.value)}
              className={`w-full px-3 py-2 text-sm border ${validationErrors.grade ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 ${validationErrors.grade ? 'focus:ring-red-500' : 'focus:ring-indigo-500'}`}
              required placeholder="e.g., Grade 10"
            />
            {validationErrors.grade && <p className="text-red-600 text-xs mt-1">{validationErrors.grade[0]}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmittingStudentInfo || isFetchingExamInfo || !publicExamDetails}
            className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 disabled:opacity-60 flex items-center justify-center text-sm font-semibold"
          >
            {isSubmittingStudentInfo ? (
              <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Starting Exam...</>
            ) : (
              <><CheckCircle size={16} className="mr-2" /> Start Exam</>
            )}
          </button>
        </form>
      </div>
      <p className="text-xs text-gray-500 mt-6 text-center">Ensure all details are correct before starting.</p>
    </div>
  );
}