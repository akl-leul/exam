"use client";
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PlusCircle, ListChecks, Megaphone, CalendarDays, LogOut,
  LinkIcon, Check, Copy, Edit3, BarChart3, Loader2, Trash2, AlertTriangle as AlertTriangleIcon, UserCircle,
  Settings, Tag, Clock // Added icons for announcement details
} from "lucide-react";
import Modal from "@/components/Modal";
import { User2 } from "lucide-react";

// Sidebar definition
const SIDEBAR = [
  { key: "profile", label: "Profile", icon: User2 },
  { key: "exams", label: "Exams", icon: ListChecks },
  { key: "announcements", label: "Announcements", icon: Megaphone },
  { key: "schedules", label: "Exam Schedules", icon: CalendarDays },
] as const; // Use 'as const' for stricter key typing

type SidebarKey = typeof SIDEBAR[number]['key'];


// Types
type Exam = {
  id: string;
  title: string;
  header?: string | null;
  instructions?: string | null;
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  expiresAt?: string | null; // ISO string
  isPublished: boolean;      // Important for teacher view
  teacher: { username: string };
};

type ScheduledExam = {
  id: string;
  examTitle: string;
  description?: string | null;
  examDate: string; // ISO string
  duration?: string | null;
  course?: string | null;
  location?: string | null;
  notes?: string | null;
  isPublished: boolean;
  teacher: { username: string };
};

export default function TeacherDashboardPage() {
  // Sidebar state - updated to include "profile" and default to it
  const [tab, setTab] = useState<SidebarKey>("profile");
  const [user, setUser] = useState<{ username: string; password: string } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Modal
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "error" | "success" | "confirmDelete";
    title: string;
    message: string | React.ReactNode;
    onConfirm?: () => void;
  }>({ isOpen: false, type: "error", title: "", message: "" });
  const openModal = (
    type: "error" | "success" | "confirmDelete",
    title: string,
    message: string | React.ReactNode,
    onConfirmAction?: () => void
  ) => setModalState({ isOpen: true, type, title, message, onConfirm: onConfirmAction });
  const closeModal = () => setModalState((prev) => ({ ...prev, isOpen: false }));

  // Exams
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [isDeletingExam, setIsDeletingExam] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [header, setHeader] = useState("");

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annExpiresAt, setAnnExpiresAt] = useState("");
  // Add state for isPublished if you want a checkbox in the form
  const [annIsPublished, setAnnIsPublished] = useState(true);


  // Schedules
  const [scheduledExams, setScheduledExams] = useState<ScheduledExam[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);
  const [schedTitle, setSchedTitle] = useState("");
  const [schedDescription, setSchedDescription] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [schedDuration, setSchedDuration] = useState("");
  const [schedCourse, setSchedCourse] = useState("");
  const [schedLocation, setSchedLocation] = useState("");
  const [schedNotes, setSchedNotes] = useState("");

  const router = useRouter();

  // Helper to get base URL (client side)
  const getBaseUrl = () => (typeof window !== "undefined" ? window.location.origin : "");

  // Fetch all data on mount
  useEffect(() => {
    // Fetch user profile
    setIsLoadingUser(true);
    fetch("/api/teacher/me")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.username) { // Check if data is valid
          setUser(data);
        } else {
          setUser(null); // Or handle error e.g. redirect to login
        }
      })
      .catch(() => {
        setUser(null);
        // Potentially redirect to login if profile fetch fails critically
        // router.push("/teacher/login");
      })
      .finally(() => setIsLoadingUser(false));

    setIsLoadingExams(true);
    fetch("/api/teacher/exams")
      .then((res) => res.json())
      .then((data) => setExams(data.exams || []))
      .catch(() => openModal("error", "Error", "Could not load exams."))
      .finally(() => setIsLoadingExams(false));

    // Fetch ALL announcements for the teacher dashboard
    setIsLoadingAnnouncements(true);
    fetch("/api/teacher/announcements") // This should get all announcements for the teacher
      .then((res) => res.json())
      .then((data) => {
        setAnnouncements(data.announcements || []); // Store all announcements
      })
      .catch(() => openModal("error", "Error", "Could not load announcements."))
      .finally(() => setIsLoadingAnnouncements(false));

    setIsLoadingSchedules(true);
    fetch("/api/teacher/schedules")
      .then((res) => res.json())
      .then((data) => {
        // For schedules, you might still want to filter for published ones,
        // or show all and indicate status like with announcements.
        // For now, keeping the original filter, adjust if needed.
        setScheduledExams(
          (data.schedules || []).filter((s: ScheduledExam) => s.isPublished)
        );
      })
      .catch(() => openModal("error", "Error", "Could not load exam schedules."))
      .finally(() => setIsLoadingSchedules(false));
  }, []); // Removed router from dependencies unless specifically needed for re-fetch on route change

  // Exams logic
  const filteredExams = exams.filter(
    (exam) =>
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exam.header && exam.header.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exam.instructions && exam.instructions.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleExamSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsCreatingExam(true);
    closeModal();
    if (!title.trim()) {
      openModal("error", "Validation Error", "Exam Title is required.");
      setIsCreatingExam(false);
      return;
    }
    try {
      const response = await fetch("/api/teacher/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, instructions, header }),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.message || `Error ${response.status}`);
      setTitle("");
      setInstructions("");
      setHeader("");
      setExams((prev) => [responseData.exam, ...prev]);
      openModal("success", "Exam Created!", "Exam created successfully.");
    } catch (err: any) {
      openModal("error", "Creation Failed", err.message || "Could not create the exam.");
    } finally {
      setIsCreatingExam(false);
    }
  };

  const handleCopyLink = (examId: string) => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      openModal("error", "Copy Link Failed", "Could not determine the application's base URL.");
      return;
    }
    const link = `${baseUrl}/take-exam/${examId}`;
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setCopiedLinkId(examId);
        setTimeout(() => setCopiedLinkId(null), 2000);
      })
      .catch(() => {
        openModal("error", "Copy Link Failed", "Could not copy link to clipboard.");
      });
  };

  const requestDeleteExam = (exam: Exam) => {
    openModal(
      "confirmDelete",
      "Confirm Delete Exam",
      <span>
        Are you sure you want to delete the exam "<strong>{exam.title}</strong>"? This action cannot be undone.
      </span>,
      () => handleDeleteExam(exam.id)
    );
  };

  const handleDeleteExam = async (examId: string) => {
    setIsDeletingExam(examId);
    closeModal();
    try {
      const response = await fetch(`/api/teacher/exams/${examId}`, {
        method: "DELETE",
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.message || "Failed to delete exam.");
      setExams((prev) => prev.filter((e) => e.id !== examId));
      openModal("success", "Exam Deleted", "The exam has been deleted.");
    } catch (err: any) {
      openModal("error", "Deletion Failed", err.message || "An unexpected error occurred.");
    } finally {
      setIsDeletingExam(null);
    }
  };

  // Announcements logic
  const handleAnnouncementSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) {
      openModal("error", "Validation Error", "Title and content are required.");
      return;
    }
    try {
      const payload = {
        title: annTitle,
        content: annContent,
        expiresAt: annExpiresAt ? new Date(annExpiresAt).toISOString() : null,
        // isPublished: annIsPublished, // Include if you add a checkbox for this
      };
      const response = await fetch("/api/teacher/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not create announcement.");
      // Add the new announcement to the top of the list
      // Make sure the 'data.announcement' from API includes 'isPublished' and 'teacher'
      setAnnouncements((prev) => [data.announcement, ...prev].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setAnnTitle("");
      setAnnContent("");
      setAnnExpiresAt("");
      // setAnnIsPublished(true); // Reset if using
      openModal("success", "Announcement Created!", "Announcement created successfully.");
    } catch (err: any) {
      openModal("error", "Creation Failed", err.message || "Could not create the announcement.");
    }
  };

  // Schedules logic
  const handleScheduleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!schedTitle.trim() || !schedDate || !schedTime) {
      openModal("error", "Validation Error", "Title, date, and time are required.");
      return;
    }
    try {
      const examDate = new Date(`${schedDate}T${schedTime}`);
      const response = await fetch("/api/teacher/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examTitle: schedTitle,
          description: schedDescription,
          examDate: examDate.toISOString(),
          duration: schedDuration,
          course: schedCourse,
          location: schedLocation,
          notes: schedNotes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not create schedule.");
      setScheduledExams((prev) => [data.scheduledExam, ...prev].sort((a,b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime()));
      setSchedTitle("");
      setSchedDescription("");
      setSchedDate("");
      setSchedTime("");
      setSchedDuration("");
      setSchedCourse("");
      setSchedLocation("");
      setSchedNotes("");
      openModal("success", "Exam Schedule Created!", "Exam schedule created successfully.");
    } catch (err: any) {
      openModal("error", "Creation Failed", err.message || "Could not create the exam schedule.");
    }
  };

  // Logout
  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/teacher/login");
  };

  // Find next upcoming scheduled exam (from potentially filtered list)
  const now = new Date();
  const nextScheduledExam = scheduledExams // Uses the state `scheduledExams` which is already filtered
    .filter((e) => new Date(e.examDate) > now)
    .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())[0];

  // Sort announcements by creation date (newest first) for display
  const sortedAnnouncements = [...announcements].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <>
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        onConfirm={modalState.onConfirm}
        confirmText={modalState.type === "confirmDelete" ? "Delete Exam" : "OK"}
        isDestructive={modalState.type === "confirmDelete"}
        confirmButtonClass={
          modalState.type === "confirmDelete"
            ? "bg-red-600 hover:bg-red-700"
            : modalState.type === "success"
            ? "bg-green-600 hover:bg-green-700"
            : "bg-indigo-600 hover:bg-indigo-700"
        }
      >
        {modalState.message}
      </Modal>

      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="flex flex-1">
          {/* Sidebar */}
         <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-bold text-lg text-indigo-700">Teacher Panel</span>
              <button
                className="text-gray-400 hover:text-red-500"
                title="Logout"
                onClick={handleLogout}
              >
                <LogOut size={22} />
              </button>
            </div>
            <nav className="flex-1 py-4">
              {SIDEBAR.map((item) => (
                <button
                  key={item.key}
                  className={`w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-indigo-50 transition ${
                    tab === item.key ? "bg-indigo-100 text-indigo-700 font-semibold" : "text-gray-700"
                  }`}
                  onClick={() => setTab(item.key)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Mobile Sidebar */}
          <div className="md:hidden bg-white border-b fixed bottom-0 left-0 right-0 z-50 shadow-top">
            <div className="flex overflow-x-auto">
              {SIDEBAR.map((item) => (
                <button
                  key={item.key}
                  className={`flex-1 py-3 px-2 text-xs flex flex-col items-center justify-center gap-1 ${
                    tab === item.key ? "text-indigo-700 font-semibold" : "text-gray-600"
                  }`}
                  onClick={() => setTab(item.key)}
                >
                  <item.icon className={`w-5 h-5 ${tab === item.key ? "text-indigo-600" : "text-gray-400"}`} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 p-4 sm:p-8 md:pb-20"> {/* Add padding-bottom for mobile nav */}
            <header className="mb-6 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800 capitalize">
                {SIDEBAR.find((s) => s.key === tab)?.label}
              </h1>
              <button
                className="md:hidden text-gray-500 hover:text-red-600"
                title="Logout"
                onClick={handleLogout}
              >
                <LogOut size={24} />
              </button>
            </header>

            {/* Profile Tab */}
            {tab === "profile" && (
              <section className="max-w-lg mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-200">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <User2 className="text-indigo-600" size={24} />
                  My Profile
                </h2>
                {isLoadingUser ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <p className="ml-3 text-gray-500">Loading profile...</p>
                  </div>
                ) : user ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-lg">
                      <UserCircle size={60} className="text-indigo-500" />
                      <div>
                        <div className="text-2xl font-bold text-indigo-800">{user.username}</div>
                        <div className="text-sm text-indigo-600">Teacher Account</div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                       <input
                        type="text"
                        value={user.username}
                        readOnly
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input
                        type="password"
                        value={user.password} // Displaying password is a security risk. Consider removing or masking.
                        readOnly
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-100"
                        placeholder="********" // Show placeholder instead of actual password
                        // style={{ letterSpacing: "0.2em" }} // Masking effect if you show dots
                      />
                       <p className="text-xs text-gray-500 mt-1">For security reasons, your password is not fully displayed.</p>
                    </div>
                    {/* Add button to change password if functionality exists */}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-10">
                     <AlertTriangleIcon className="mx-auto h-10 w-10 text-red-400 mb-2" />
                     Could not load user profile. Please try logging in again.
                  </div>
                )}
              </section>
            )}
            {/* Exams Tab (Content as before) */}
            {tab === "exams" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create Exam */}
                <section className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <PlusCircle size={20} className="text-indigo-600" /> Create New Exam
                  </h2>
                  <form onSubmit={handleExamSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exam Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exam Header <span className="text-xs text-gray-500">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => setHeader(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Instructions <span className="text-xs text-gray-500">(Optional)</span>
                      </label>
                      <textarea
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isCreatingExam}
                      className="w-full flex items-center justify-center bg-indigo-600 text-white py-2.5 px-4 rounded-md hover:bg-indigo-700 font-semibold text-sm disabled:opacity-70"
                    >
                      {isCreatingExam ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <PlusCircle size={18} className="mr-2" />}
                      {isCreatingExam ? "Creating..." : "Create Exam"}
                    </button>
                  </form>
                </section>
                {/* List Exams */}
                <section className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <h2 className="text-lg font-semibold text-gray-700 flex items-center">
                      <ListChecks size={20} className="mr-2 text-teal-600" /> My Exams
                    </h2>
                    <input
                      type="text"
                      placeholder="Search exams..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      aria-label="Search exams"
                    />
                  </div>
                  {isLoadingExams ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                      <p className="ml-3 text-gray-500">Loading your exams...</p>
                    </div>
                  ) : filteredExams.length > 0 ? (
                    <ul className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                      {filteredExams.map((exam) => {
                        const sharableLink = `${getBaseUrl()}/take-exam/${exam.id}`;
                        return (
                          <li key={exam.id} className="border border-gray-200 p-4 rounded-lg hover:shadow-md bg-gray-50/70 transition-shadow">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-2">
                              <div className="flex-grow mb-2 sm:mb-0">
                                <h3 className="text-lg font-semibold text-gray-800 hover:text-indigo-600 transition-colors">
                                  <Link href={`/teacher/exams/${exam.id}/edit`}>{exam.title}</Link>
                                </h3>
                                {exam.header && <p className="text-xs text-gray-500 mt-0.5">{exam.header}</p>}
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <Link
                                  href={`/teacher/exams/${exam.id}/edit`}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium py-1 px-2.5 rounded-md border border-blue-400 hover:bg-blue-50 flex items-center"
                                  title="Edit Exam Questions"
                                >
                                  <Edit3 size={14} className="mr-1" /> Edit
                                </Link>
                                <Link
                                  href={`/teacher/exams/${exam.id}/results`}
                                  className="text-xs text-green-600 hover:text-green-800 font-medium py-1 px-2.5 rounded-md border border-green-400 hover:bg-green-50 flex items-center"
                                  title="View Student Results"
                                >
                                  <BarChart3 size={14} className="mr-1" /> Results
                                </Link>
                                <button
                                  onClick={() => requestDeleteExam(exam)}
                                  disabled={isDeletingExam === exam.id}
                                  className="text-xs text-red-600 hover:text-red-800 font-medium py-1 px-2.5 rounded-md border border-red-400 hover:bg-red-50 flex items-center disabled:opacity-50"
                                  title="Delete Exam"
                                >
                                  {isDeletingExam === exam.id ? (
                                    <Loader2 className="animate-spin h-4 w-4 mr-1" />
                                  ) : (
                                    <Trash2 size={14} className="mr-1" />
                                  )}
                                  Delete
                                </button>
                              </div>
                            </div>
                            {/* Sharable Link Section */}
                            <div className="mt-3 pt-3 border-t border-gray-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                              <div className="flex items-center text-xs text-gray-600 mb-2 sm:mb-0 overflow-hidden">
                                <LinkIcon size={14} className="mr-1.5 text-gray-400 flex-shrink-0" />
                                <span className="font-medium mr-1 flex-shrink-0">Share Link:</span>
                                <a
                                  href={sharableLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:underline truncate block"
                                  title={sharableLink}
                                >
                                  {sharableLink}
                                </a>
                              </div>
                              <button
                                onClick={() => handleCopyLink(exam.id)}
                                className={`text-xs py-1 px-2.5 rounded-md border flex items-center transition-all ${
                                  copiedLinkId === exam.id
                                    ? "bg-green-500 text-white border-green-500"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
                                }`}
                                title="Copy exam link"
                              >
                                {copiedLinkId === exam.id ? (
                                  <Check size={14} className="mr-1" />
                                ) : (
                                  <Copy size={14} className="mr-1" />
                                )}
                                {copiedLinkId === exam.id ? "Copied!" : "Copy Link"}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <ListChecks size={32} className="mb-2" />
                      {searchTerm ? "No exams match your search." : "No exams created yet."}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* Announcements Tab - Updated Display */}
            {tab === "announcements" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create Announcement */}
                <section className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <PlusCircle size={20} className="text-amber-600" /> Add Announcement
                  </h2>
                  <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={annTitle}
                        onChange={(e) => setAnnTitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Content <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={annContent}
                        onChange={(e) => setAnnContent(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expires At <span className="text-xs text-gray-500">(Optional)</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={annExpiresAt}
                        min={new Date().toISOString().slice(0, 16)} // Prevent selecting past dates
                        onChange={(e) => setAnnExpiresAt(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    {/* Optional: Add a checkbox for isPublished */}
                    <div className="flex items-center">
                       <input id="annIsPublished" type="checkbox" checked={annIsPublished} onChange={(e) => setAnnIsPublished(e.target.checked)} className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500" />
                       <label htmlFor="annIsPublished" className="ml-2 block text-sm text-gray-900">Publish immediately</label>
                    </div>
                   
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center bg-amber-600 text-white py-2.5 px-4 rounded-md hover:bg-amber-700 font-semibold text-sm"
                    >
                      <PlusCircle size={18} className="mr-2" />
                      Add Announcement
                    </button>
                  </form>
                </section>
                {/* List Announcements - Updated to show all details */}
                <section className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-4">
                    <Megaphone size={20} className="text-amber-500" /> My Announcements
                  </h2>
                  {isLoadingAnnouncements ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                      <p className="ml-3 text-gray-500">Loading announcements...</p>
                    </div>
                  ) : sortedAnnouncements.length > 0 ? (
                     <ul className="space-y-5 max-h-[500px] overflow-y-auto pr-2">
                      {sortedAnnouncements.map((a) => (
                        <li
                          key={a.id}
                          className={`group bg-gray-50 p-4 rounded-lg shadow-sm border ${a.isPublished ? 'border-gray-200' : 'border-amber-300 bg-amber-50/30'} hover:shadow-md transition-shadow`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1.5">
                            <h3 className="text-md font-semibold text-gray-800 mb-1 sm:mb-0">{a.title}</h3>
                            <time className="text-xs text-gray-500" dateTime={a.createdAt}>
                              Created: {new Date(a.createdAt).toLocaleDateString()}
                            </time>
                          </div>
                          <p className="text-gray-600 text-sm whitespace-pre-line mb-3">{a.content}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs pt-2 border-t border-gray-200/80">
                             <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                a.isPublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                <Tag size={12}/> {a.isPublished ? "Published" : "Draft"}
                             </span>
                             {a.expiresAt && (
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Clock size={12}/> Expires: {new Date(a.expiresAt).toLocaleDateString()} {new Date(a.expiresAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-gray-500">
                                <UserCircle size={12}/> By: {a.teacher?.username || "System"}
                              </span>
                          </div>
                           {/* TODO: Add Edit/Delete buttons here if needed */}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <Megaphone size={32} className="mb-2"/>
                      No announcements created yet.
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* Schedules Tab (Content as before) */}
            {tab === "schedules" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create Schedule */}
                <section className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <PlusCircle size={20} className="text-teal-600" /> Add Exam Schedule
                  </h2>
                  <form onSubmit={handleScheduleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Exam Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={schedTitle}
                        onChange={(e) => setSchedTitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description <span className="text-xs text-gray-500">(Optional)</span>
                      </label>
                      <textarea
                        value={schedDescription}
                        onChange={(e) => setSchedDescription(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={schedDate}
                           min={new Date().toISOString().split('T')[0]} // Prevent past dates
                          onChange={(e) => setSchedDate(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="time"
                          value={schedTime}
                          onChange={(e) => setSchedTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                          required
                        />
                      </div>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Duration <span className="text-xs text-gray-500">(e.g., 90m or 1h 30m)</span>
                          </label>
                          <input
                            type="text"
                            value={schedDuration}
                            onChange={(e) => setSchedDuration(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                            placeholder="e.g. 1h 30m"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Course <span className="text-xs text-gray-500">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={schedCourse}
                            onChange={(e) => setSchedCourse(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                          />
                        </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location <span className="text-xs text-gray-500">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={schedLocation}
                        onChange={(e) => setSchedLocation(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Notes <span className="text-xs text-gray-500">(Optional)</span>
                      </label>
                      <textarea
                        value={schedNotes}
                        onChange={(e) => setSchedNotes(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center bg-teal-600 text-white py-2.5 px-4 rounded-md hover:bg-teal-700 font-semibold text-sm"
                    >
                      <PlusCircle size={18} className="mr-2" />
                      Add Exam Schedule
                    </button>
                  </form>
                </section>
                {/* List Schedules */}
                <section className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2 mb-4">
                    <CalendarDays size={20} className="text-teal-500" /> Exam Schedules
                  </h2>
                  {isLoadingSchedules ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                      <p className="ml-3 text-gray-500">Loading exam schedules...</p>
                    </div>
                  ) : scheduledExams.length > 0 ? (
                    <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2">
                      {scheduledExams.map((exam) => {
                        const isNext = nextScheduledExam && exam.id === nextScheduledExam.id;
                        return (
                          <div
                            key={exam.id}
                            className={`relative bg-gray-50 p-4 rounded-lg shadow-sm border ${
                              isNext ? "border-teal-400 ring-1 ring-teal-300 animate-pulse-short" : "border-gray-200"
                            }`}
                          >
                             <div className="flex items-start justify-between mb-1">
                                <h4 className="text-md font-semibold text-gray-800">{exam.examTitle}</h4>
                                {isNext && (
                                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-100 text-teal-700 animate-bounce flex-shrink-0">
                                    Next Up
                                  </span>
                                )}
                              </div>
                            
                            {exam.course && (
                              <div className="text-xs text-teal-700 font-medium mb-1.5">{exam.course}</div>
                            )}
                            {exam.description && <p className="text-sm text-gray-600 mb-2">{exam.description}</p>}
                            
                            <div className="text-sm text-gray-500 mb-2">
                              <span className="font-medium text-gray-700">
                                {new Date(exam.examDate).toLocaleDateString(undefined, {
                                  weekday: "long", month: "short", day: "numeric",
                                })}
                              </span>
                               at 
                              {new Date(exam.examDate).toLocaleTimeString(undefined, {
                                hour: "2-digit", minute: "2-digit", hour12: true
                              })}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pt-2 border-t border-gray-200/80">
                              {exam.duration && <span className="flex items-center gap-1"><Clock size={12}/>{exam.duration}</span>}
                              {exam.location && <span className="flex items-center gap-1"><MapPin size={12}/>{exam.location}</span>}
                            </div>
                             {exam.notes && <p className="text-xs text-gray-500 mt-2 italic">Note: {exam.notes}</p>}
                            <div className="absolute top-2 right-2 text-xs text-gray-400 select-none">
                              {exam.teacher?.username}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                     <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <CalendarDays size={32} className="mb-2"/>
                      No exam schedules posted yet.
                    </div>
                  )}
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}