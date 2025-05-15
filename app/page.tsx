// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import {
  Megaphone,
  CalendarDays,
  LogIn,
  BookOpen,
  AlertTriangle,
  UserCircle,
  ArrowRight,
  Clock3,
  MapPin,
  User,
  ListChecks,
  BookCopy,
  CalendarClock,
  UserCog, // For teacher in schedule
  MessageSquareText, // For announcement item
} from "lucide-react";
import { Announcement as PrismaAnnouncement, ScheduledExam as PrismaScheduledExam, Teacher } from "@prisma/client";
import { notFound } from "next/navigation";

type AnnouncementWithAuthor = PrismaAnnouncement & {
  teacher: Pick<Teacher, 'username'>;
};
type ScheduledExamWithAuthor = PrismaScheduledExam & {
  teacher: Pick<Teacher, 'username'>;
  // Ensure duration is part of the type if it's optional in Prisma model
  duration?: number | null; 
};
 
async function fetchData(url: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000');
  const absoluteUrl = new URL(url, baseUrl).toString();
  console.log(`Fetching data from: ${absoluteUrl}`);
  try {
    const res = await fetch(absoluteUrl, { next: { revalidate: 60 } }); // Revalidate every 60 seconds
    if (!res.ok) {
      console.error(`Failed to fetch ${url}. Status: ${res.status}, Response: ${await res.text()}`);
      // Return default structure on error to prevent build/render failures
      if (url.includes('announcements')) return { announcements: [] };
      if (url.includes('schedules')) return { schedules: [] };
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    if (url.includes('announcements')) return { announcements: [] };
    if (url.includes('schedules')) return { schedules: [] };
    return null;
  }
}

export default async function HomePage() {
  const [announcementsData, scheduleData] = await Promise.all([
    fetchData('/api/teacher/announcements'),
    fetchData('/api/teacher/schedules')
  ]);

  const announcements: AnnouncementWithAuthor[] = announcementsData?.announcements || [];
  const examSchedule: ScheduledExamWithAuthor[] = scheduleData?.schedules || [];

  const now = new Date();
  // Sort exams by date to reliably find the next one
  const sortedExams = examSchedule
    .filter(e => e.examDate) // Ensure examDate exists
    .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
  const nextExam = sortedExams.find(e => new Date(e.examDate) > now);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-100 to-slate-200 text-gray-800 font-sans">
      {/* Header */}
      <header className="py-4 px-6 sm:px-10 shadow-sm bg-white sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <BookOpen className="h-8 w-8 text-indigo-600 group-hover:text-indigo-700 transition-colors" />
            <span className="text-2xl font-bold text-indigo-700 group-hover:text-indigo-800 tracking-tight transition-colors">ExamPortal</span>
          </Link>
          <nav className="flex gap-3">
            <Link href="/teacher/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-all duration-200">
              <LogIn size={16} /> Teacher Login
            </Link>
            {/* Add Student Login if available */}
            {/* <Link href="/student/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-all duration-200">
              <UserCircle size={16} /> Student Login
            </Link> */}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto p-6 sm:p-10">
        <section className="relative flex items-center flex-col overflow-hidden rounded-2xl shadow-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 text-white py-16 sm:py-20 px-6 sm:px-12 mb-12 sm:mb-16 animate-fade-in">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
          <div className="relative z-10 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-5 tracking-tight">
              Your Gateway to Seamless Examinations
            </h1>
            <p className="text-lg sm:text-xl text-indigo-100 mb-10 max-w-3xl mx-auto">
              Access exam schedules, important announcements, and manage your academic assessments with ease.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/teacher/login" // Or a general dashboard if students also log in
                className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 px-8 py-3.5 rounded-lg font-semibold shadow-md hover:bg-indigo-50 transition-transform hover:scale-105 text-base"
              >
                Access Dashboard <ArrowRight size={18} />
              </Link>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full filter blur-3xl opacity-70 animate-pulse-slow"></div>
          <div className="absolute -bottom-20 -right-10 w-80 h-80 bg-pink-400/10 rounded-full filter blur-3xl opacity-60 animate-pulse-slow animation-delay-2000"></div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
          {/* Announcements Section */}
          <section className="lg:col-span-2">
            <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
              <Megaphone size={32} className="text-amber-500" /> Latest Announcements
            </h2>
            {announcements.length > 0 ? (
              <div className="space-y-6">
                {announcements.map((a) => (
                  <article
                    key={a.id}
                    className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-indigo-300 group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                      <h3 className="text-xl font-semibold text-indigo-700 group-hover:text-indigo-800 mb-1 sm:mb-0 flex items-center gap-2">
                         <MessageSquareText size={22} className="text-indigo-500"/> {a.title}
                      </h3>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5">
                        <CalendarDays size={14} />
                        <span>{new Date(a.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line mb-4">{a.content}</p>
                    <div className="text-xs text-gray-500 flex items-center gap-1.5 pt-3 border-t border-gray-100">
                      <User size={14} />
                      <span>Posted by: {a.teacher?.username || "System Admin"}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="bg-white p-10 rounded-xl shadow-lg text-center text-gray-500 border border-gray-200">
                <Megaphone size={48} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Announcements Yet</h3>
                <p>Stay tuned for updates and important information.</p>
              </div>
            )}
          </section>

          {/* Exam Schedule Section */}
          <section className="lg:col-span-1">
            <h2 className="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
              <CalendarClock size={32} className="text-teal-500" /> Exam Schedule
            </h2>
            {sortedExams.length > 0 ? (
              <div className="space-y-5">
                {sortedExams.map((exam) => {
                  const isNext = nextExam && exam.id === nextExam.id;
                  const examDate = new Date(exam.examDate);
                  return (
                    <article
                      key={exam.id}
                      className={`bg-white p-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border ${
                        isNext
                          ? "border-teal-400 ring-2 ring-teal-300/50"
                          : "border-gray-200 hover:border-teal-200"
                      } relative overflow-hidden`}
                    >
                      {isNext && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-teal-500 text-white text-xs font-semibold rounded-bl-lg">
                          Next Up!
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-2">
                        <BookCopy size={20} className="text-indigo-500 flex-shrink-0" />
                        <h3 className="text-lg font-semibold text-indigo-700">{exam.examTitle}</h3>
                      </div>
                      
                      {exam.course && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3 ml-1">
                          <ListChecks size={16} className="text-gray-400" />
                          <span>{exam.course}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-gray-700 font-medium mb-3">
                        <CalendarDays size={16} className="text-gray-400" />
                        <span>
                          {examDate.toLocaleDateString(undefined, {
                            weekday: "long", month: "short", day: "numeric", year: "numeric"
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700 font-medium mb-4">
                        <Clock3 size={16} className="text-gray-400" />
                        <span>
                          {examDate.toLocaleTimeString(undefined, {
                            hour: "2-digit", minute: "2-digit", hour12: true
                          })}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-xs pt-3 border-t border-gray-100">
                        {exam.duration && (
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <Clock3 size={14} /> Duration: {exam.duration} minutes
                          </div>
                        )}
                        {exam.location && (
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <MapPin size={14} /> Location: {exam.location}
                          </div>
                        )}
                         {exam.teacher?.username && (
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <UserCog size={14} /> Teacher: {exam.teacher.username}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white p-10 rounded-xl shadow-lg text-center text-gray-500 border border-gray-200">
                <CalendarDays size={48} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Exams Scheduled</h3>
                <p>Please check back later for upcoming exam dates.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-10 mt-16 sm:mt-20 border-t border-gray-200 bg-slate-100">
        <div className="container mx-auto text-center text-sm text-gray-600">
          <p>© {new Date().getFullYear()} ExamPortal. All rights reserved.</p>
          <p className="mt-1">
            <Link href="#" className="hover:text-indigo-600">Privacy Policy</Link> | 
            <Link href="#" className="hover:text-indigo-600 ml-1">Terms of Service</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

// Add custom animation to tailwind.config.js if you want 'animate-pulse-slow' or 'animate-fade-in'
// Example for tailwind.config.js:

module.exports = {
  // ...
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 1s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
  },
  // ...
}
