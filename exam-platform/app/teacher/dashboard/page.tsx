// app/teacher/dashboard/page.tsx
"use client";
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Exam } from '@prisma/client';
import { PlusCircle, LinkIcon, Check, Copy, Edit3, BarChart3, Loader2, ListChecks, Users, Trash2, AlertTriangle as AlertTriangleIcon } from 'lucide-react';
import Modal from '@/components/Modal'; // Assuming Modal.tsx is in components/

export default function TeacherDashboardPage() {
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [header, setHeader] = useState('');
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'error' | 'success' | 'confirmDelete';
    title: string;
    message: string | React.ReactNode;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'error', title: '', message: '' });

  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [isDeletingExam, setIsDeletingExam] = useState<string | null>(null); // examId being deleted
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const router = useRouter();

  const getBaseUrl = () => { /* ... same as before ... */ 
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  };

  const openModal = (
    type: 'error' | 'success' | 'confirmDelete', 
    title: string, 
    message: string | React.ReactNode, 
    onConfirmAction?: () => void
  ) => {
    setModalState({ isOpen: true, type, title, message, onConfirm: onConfirmAction });
  };
  const closeModal = () => setModalState(prevState => ({ ...prevState, isOpen: false }));


  useEffect(() => {
    // ... (fetchExams logic, but use openModal for errors) ...
    const logPrefix = "TeacherDashboardPage:fetchExams -";
    console.log(`${logPrefix} Fetching exams.`);
    setIsLoadingExams(true);
    fetch('/api/teacher/exams')
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: 'Failed to parse server error.' }));
          throw new Error(errData.message || 'Failed to fetch exams.');
        }
        return res.json();
      })
      .then(data => {
        if (!data.exams || !Array.isArray(data.exams)) {
          throw new Error("Invalid exam data from server.");
        }
        setExams(data.exams);
      })
      .catch((err: any) => {
        console.error(`${logPrefix} Error:`, err);
        openModal('error', 'Error Loading Exams', err.message || 'Could not load your exams. Please try refreshing.');
      })
      .finally(() => setIsLoadingExams(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    // ... (handleSubmit logic, but use openModal for errors/success) ...
    e.preventDefault();
    const logPrefix = "TeacherDashboardPage:handleSubmit -";
    setIsCreatingExam(true);
    closeModal(); // Close any existing general error/success modals

    if (!title.trim()) {
      openModal('error', 'Validation Error', 'Exam Title is required.');
      setIsCreatingExam(false);
      return;
    }

    try {
        const response = await fetch('/api/teacher/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, instructions, header }),
        });
        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.message || `Error ${response.status}`);
        if (!responseData.exam || !responseData.exam.id) throw new Error("Server didn't return valid exam data.");

        openModal('success', 'Exam Created!', 
            <span>Exam "<strong>{responseData.exam.title}</strong>" created. Redirecting to add questions...</span>);
        setTitle(''); setInstructions(''); setHeader('');
        // Update exams list immediately for better UX before redirect
        setExams(prevExams => [responseData.exam, ...prevExams]); 
        
        setTimeout(() => {
            closeModal();
            router.push(`/teacher/exams/${responseData.exam.id}/edit`);
        }, 2000);

    } catch (err: any) {
        console.error(`${logPrefix} Error:`, err);
        openModal('error', 'Creation Failed', err.message || 'Could not create the exam.');
    } finally {
        setIsCreatingExam(false);
    }
  };

  const handleCopyLink = (examId: string) => { /* ... same as before ... */ 
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
        openModal('error', 'Copy Link Failed', "Could not determine the application's base URL.");
        return;
    }
    const link = `${baseUrl}/take-exam/${examId}`;
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopiedLinkId(examId);
        setTimeout(() => setCopiedLinkId(null), 2000);
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        openModal('error', 'Copy Link Failed', 'Could not copy link to clipboard. You may need to do it manually.');
      });
  };

  const requestDeleteExam = (exam: Exam) => {
    openModal(
      'confirmDelete', 
      'Confirm Delete Exam', 
      <span>Are you sure you want to delete the exam "<strong>{exam.title}</strong>"? This action will also delete all associated questions and student submissions. This cannot be undone.</span>,
      () => handleDeleteExam(exam.id) // Pass the actual delete function to onConfirm
    );
  };

  const handleDeleteExam = async (examId: string) => {
    const logPrefix = `TeacherDashboardPage:handleDeleteExam (ID: ${examId}) -`;
    console.log(`${logPrefix} Attempting to delete exam.`);
    setIsDeletingExam(examId); // Show spinner on specific delete button
    closeModal(); // Close confirmation modal

    try {
        const response = await fetch(`/api/teacher/exams/${examId}`, {
            method: 'DELETE',
        });
        const responseData = await response.json(); // Try to parse JSON even for errors

        if (!response.ok) {
            console.error(`${logPrefix} Failed. Status: ${response.status}, ResponseData:`, responseData);
            throw new Error(responseData.message || `Error ${response.status}: Failed to delete the exam.`);
        }
        
        console.log(`${logPrefix} Success. ResponseData:`, responseData);
        setExams(prevExams => prevExams.filter(exam => exam.id !== examId));
        openModal('success', 'Exam Deleted', responseData.message || 'The exam has been successfully deleted.');
        setTimeout(closeModal, 2000);

    } catch (err: any) {
        console.error(`${logPrefix} Catch block error:`, err);
        openModal('error', 'Deletion Failed', err.message || 'An unexpected error occurred while deleting the exam.');
    } finally {
        setIsDeletingExam(null);
    }
  };


  return (
    <> {/* Fragment to wrap page content and modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        onConfirm={modalState.onConfirm}
        confirmText={modalState.type === 'confirmDelete' ? 'Delete Exam' : 'OK'}
        isDestructive={modalState.type === 'confirmDelete'}
        confirmButtonClass={
            modalState.type === 'confirmDelete' ? "bg-red-600 hover:bg-red-700" :
            modalState.type === 'success' ? "bg-green-600 hover:bg-green-700" :
            "bg-indigo-600 hover:bg-indigo-700" // Default or for error 'OK'
        }
      >
        {/* Modal children (message) */}
        {modalState.message}
      </Modal>

      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8 pb-4 border-b border-gray-200">
          {/* ... header content ... */}
            <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
            <p className="text-sm text-gray-500">Manage your exams and view student results.</p>
        </header>

        {/* Inline errors/success are now handled by the modal, but you can keep them if preferred for non-critical feedback */}
        {/* {error && <p className="bg-red-100 ...">{error}</p>} */}
        {/* {success && <p className="bg-green-100 ...">{success}</p>} */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create New Exam Form */}
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-xl border border-gray-200">
            {/* ... form content (same as before) ... */}
            <h2 className="text-xl font-semibold mb-5 text-gray-700 border-b pb-3 flex items-center">
                <PlusCircle size={22} className="mr-2 text-indigo-600" /> Create New Exam
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title, Header, Instructions inputs */}
                <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Title <span className="text-red-500">*</span>
                </label>
                <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" required />
                </div>
                <div>
                <label htmlFor="header" className="block text-sm font-medium text-gray-700 mb-1">
                    Exam Header <span className="text-xs text-gray-500">(Optional)</span>
                </label>
                <input type="text" id="header" value={header} onChange={(e) => setHeader(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
                    Instructions <span className="text-xs text-gray-500">(Optional)</span>
                </label>
                <textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <button type="submit" disabled={isCreatingExam} className="w-full flex items-center justify-center bg-indigo-600 text-white py-2.5 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 font-semibold text-sm disabled:opacity-70">
                {isCreatingExam ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <PlusCircle size={18} className="mr-2" />}
                {isCreatingExam ? 'Creating...' : 'Create Exam & Add Questions'}
                </button>
            </form>
          </div>

          {/* Existing Exams List */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-xl border border-gray-200">
            {/* ... exams list header (same as before) ... */}
            <h2 className="text-xl font-semibold mb-5 text-gray-700 border-b pb-3 flex items-center">
                <ListChecks size={22} className="mr-2 text-teal-600" /> My Exams
            </h2>
            {isLoadingExams ? ( /* ... loading state ... */ 
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <p className="ml-3 text-gray-500">Loading your exams...</p>
                </div>
            ) : exams.length > 0 ? (
              <ul className="space-y-4">
                {exams.map((exam) => {
                  const sharableLink = `${getBaseUrl()}/take-exam/${exam.id}`;
                  return (
                    <li key={exam.id} className="border border-gray-200 p-4 rounded-lg hover:shadow-lg transition-shadow bg-slate-50/50">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-2">
                        <div className="flex-grow mb-2 sm:mb-0">
                          <h3 className="text-lg font-semibold text-gray-800 hover:text-indigo-600 transition-colors">
                              <Link href={`/teacher/exams/${exam.id}/edit`}>{exam.title}</Link>
                          </h3>
                          {exam.header && <p className="text-xs text-gray-500">{exam.header}</p>}
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <Link 
                              href={`/teacher/exams/${exam.id}/edit`} 
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium py-1 px-2.5 rounded-md border border-blue-400 hover:bg-blue-50 flex items-center"
                              title="Edit Exam Questions"
                          > <Edit3 size={14} className="mr-1" /> Edit </Link>
                          <Link 
                              href={`/teacher/exams/${exam.id}/results`} 
                              className="text-xs text-green-600 hover:text-green-800 font-medium py-1 px-2.5 rounded-md border border-green-400 hover:bg-green-50 flex items-center"
                              title="View Student Results"
                          > <BarChart3 size={14} className="mr-1" /> Results </Link>
                          <button
                            onClick={() => requestDeleteExam(exam)}
                            disabled={isDeletingExam === exam.id}
                            className="text-xs text-red-600 hover:text-red-800 font-medium py-1 px-2.5 rounded-md border border-red-400 hover:bg-red-50 flex items-center disabled:opacity-50"
                            title="Delete Exam"
                          >
                            {isDeletingExam === exam.id ? <Loader2 className="animate-spin h-4 w-4 mr-1" /> : <Trash2 size={14} className="mr-1" />}
                            Delete
                          </button>
                        </div>
                      </div>
                      {/* Sharable Link Section */}
                      <div className="mt-3 pt-3 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                          {/* ... sharable link and copy button (same as before) ... */}
                          <div className="flex items-center text-xs text-gray-600 mb-2 sm:mb-0 overflow-hidden">
                                <LinkIcon size={14} className="mr-1.5 text-gray-400 flex-shrink-0" />
                                <span className="font-medium mr-1 flex-shrink-0">Share Link:</span> 
                                <a href={sharableLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate block" title={sharableLink}>
                                    {sharableLink}
                                </a>
                            </div>
                            <button onClick={() => handleCopyLink(exam.id)} className={`text-xs py-1 px-2.5 rounded-md border flex items-center transition-all ${ copiedLinkId === exam.id ? 'bg-green-500 text-white border-green-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300' }`} title="Copy exam link">
                                {copiedLinkId === exam.id ? <Check size={14} className="mr-1" /> : <Copy size={14} className="mr-1" />}
                                {copiedLinkId === exam.id ? 'Copied!' : 'Copy Link'}
                            </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : ( /* ... no exams yet message ... */ 
                 <div className="text-center py-10">
                    <Users size={40} className="mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-500">You haven't created any exams yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Use the form on the left to get started.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}