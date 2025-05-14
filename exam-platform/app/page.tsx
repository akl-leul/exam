// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { Megaphone, CalendarDays, LogIn, UserPlus, BookOpen, AlertTriangle } from "lucide-react";
import { Announcement as PrismaAnnouncement, ScheduledExam as PrismaScheduledExam, Teacher } from "@prisma/client"; // Import Prisma types

// Define the expected structure for fetched data, including the teacher's username
type AnnouncementWithAuthor = PrismaAnnouncement & {
  teacher: Pick<Teacher, 'username'>; // Or 'name' if your Teacher model has a name field
};

type ScheduledExamWithAuthor = PrismaScheduledExam & {
  teacher: Pick<Teacher, 'username'>;
};


// Helper function to fetch data - ensure this is defined outside the component or imported
// It needs to use the full URL when fetching from a Server Component if the API is on the same host during build/SSR.
// During development, relative paths might work, but for production builds, absolute URLs are safer.
async function fetchData(url: string) {
  const logPrefix = `HomePage:fetchData(${url}) -`;
  try {
    // For server components fetching their own API routes, use absolute URL during build
    // During dev, relative often works. For robustness:
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const absoluteUrl = new URL(url, baseUrl).toString();
    console.log(`${logPrefix} Fetching from: ${absoluteUrl}`);

    const res = await fetch(absoluteUrl, { 
      next: { revalidate: 60 } // Revalidate data every 60 seconds (ISR) - adjust as needed
    }); 
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`${logPrefix} API Error Status: ${res.status}, Response: ${errorText}`);
      throw new Error(`Failed to fetch ${url}. Status: ${res.status}`);
    }
    const data = await res.json();
    console.log(`${logPrefix} Data fetched successfully.`);
    return data;
  } catch (error: any) {
    console.error(`${logPrefix} Catch Error:`, error.message);
    // Return a structure that indicates an error or empty data
    if (url.includes('announcements')) return { announcements: [] };
    if (url.includes('schedules')) return { schedules: [] };
    return null;
  }
}


export default async function HomePage() {
  console.log("HomePage: Rendering (Server Component).");

  // Fetch announcements and schedules in parallel
  const [announcementsData, scheduleData] = await Promise.all([
    fetchData('/api/teacher/announcements'), // Calls your public API route
    fetchData('/api/teacher/schedules')     // Calls your public API route
  ]);

  const announcements: AnnouncementWithAuthor[] = announcementsData?.announcements || [];
  const examSchedule: ScheduledExamWithAuthor[] = scheduleData?.schedules || [];
  
  console.log(`HomePage: Fetched ${announcements.length} announcements and ${examSchedule.length} schedules.`);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 text-gray-800">
      {/* Header/Navigation Bar */}
      <header className="py-4 px-6 sm:px-10 shadow-md bg-white sticky top-0 z-40">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-indigo-600" />
            <span className="text-2xl font-bold text-indigo-700">ExamPlatform</span>
          </Link>
          <nav className="space-x-3 sm:space-x-4">
            <Link href="/teacher/login" className="text-sm font-medium text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md hover:bg-indigo-50 transition-colors flex items-center">
              <LogIn size={16} className="mr-1.5" /> Teacher Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto p-6 sm:p-10">
        {/* Hero Section */}
        <section className="text-center py-12 sm:py-16 bg-indigo-700 text-white rounded-xl shadow-2xl mb-12 px-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
            Welcome to the Online Exam Platform
          </h1>
          <p className="text-lg sm:text-xl text-indigo-200 mb-8 max-w-2xl mx-auto">
            Access your exams, view schedules, and stay updated with important announcements.
          </p>
          <div className="flex gap-4 items-center justify-center">
            <p className="text-indigo-300 text-sm">
              Teachers: <Link href="/teacher/dashboard" className="font-semibold underline hover:text-white">Access Your Dashboard</Link>
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Announcements Section */}
          <section className="lg:col-span-2">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-700 flex items-center">
              <Megaphone size={28} className="mr-3 text-amber-500" /> Announcements
            </h2>
            {announcements && announcements.length > 0 ? (
              <div className="space-y-6">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="bg-white p-5 rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                    <h3 className="text-xl font-semibold text-indigo-700 mb-2">{announcement.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 whitespace-pre-line">{announcement.content}</p>
                    <div className="text-xs text-gray-400 flex justify-between items-center pt-2 border-t border-gray-100">
                      <span>By: {announcement.teacher?.username || 'System'}</span> {/* Use teacher's username */}
                      <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
                <AlertTriangle size={32} className="mx-auto mb-2 text-gray-400" />
                No current announcements. Check back later!
              </div>
            )}
          </section>

          {/* Exam Schedule Section */}
          <section className="lg:col-span-1">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-700 flex items-center">
              <CalendarDays size={28} className="mr-3 text-teal-500" /> Exam Schedule
            </h2>
            {examSchedule && examSchedule.length > 0 ? (
              <div className="space-y-4 bg-white p-5 rounded-lg shadow-lg border border-gray-200">
                {examSchedule.map((exam) => (
                  <div key={exam.id} className="pb-4 border-b border-gray-200 last:border-b-0">
                    <h4 className="text-md font-semibold text-gray-800">{exam.examTitle}</h4>
                    {exam.course && <p className="text-xs text-indigo-600 font-medium">{exam.course}</p>}
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(exam.examDate).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        at  
                      {new Date(exam.examDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {exam.duration && <p className="text-xs text-gray-400">Duration: {exam.duration}</p>}
                    {exam.location && <p className="text-xs text-gray-400">Location: {exam.location}</p>}
                    {/* In a real app, if exam.examId (from Prisma model) exists, this could link to /take-exam/[examId] */}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
                <AlertTriangle size={32} className="mx-auto mb-2 text-gray-400" />
                No upcoming exams scheduled at this time.
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 mt-16 border-t border-gray-300 bg-gray-100">
        <div className="container mx-auto text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} ExamPlatform. All rights reserved.</p>
          <p className="mt-1">
            Powered by Next.js & Prisma.
          </p>
        </div>
      </footer>
    </div>
  );
}