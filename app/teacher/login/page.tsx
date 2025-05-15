// app/teacher/login/page.tsx
"use client"; // This page needs client-side interactivity (useState, form handling)

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation'; // For App Router navigation
import { LogIn, AlertTriangle , Loader2 } from 'lucide-react'; // Icons

export default function TeacherLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const logPrefix = "TeacherLoginPage:";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    setIsLoading(true);
    console.log(`${logPrefix} Attempting login for username: ${username}`);

    try {
      const response = await fetch('/api/teacher/login', { // Your login API endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      console.log(`${logPrefix} API response status: ${response.status}`);

      const responseData = await response.json(); // Try to parse JSON even for errors

      if (!response.ok) {
        console.error(`${logPrefix} Login failed. Status: ${response.status}, ResponseData:`, responseData);
        // Use message from responseData if available, otherwise construct one
        throw new Error(responseData.message || `Error ${response.status}: Login failed. Please check your credentials.`);
      }

      // If response.ok is true
      console.log(`${logPrefix} Login successful. ResponseData:`, responseData);
      // The API should set the necessary cookies for authentication.
      // Then redirect to the teacher dashboard.
      router.push('/teacher/dashboard'); 

    } catch (err: any) {
      console.error(`${logPrefix} Catch block - Error during login:`, err);
      setError(err.message || 'An unexpected error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
      console.log(`${logPrefix} Login attempt finished.`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-gray-100 to-stone-200 p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all hover:shadow-3xl">
        <div className="text-center mb-8">
          <LogIn size={48} className="mx-auto text-indigo-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">Teacher Login</h1>
          <p className="text-sm text-gray-500 mt-2">Access your dashboard to manage exams and students.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm flex items-center">
            <AlertTriangle size={18} className="mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
              placeholder="Enter your username"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 font-semibold text-sm disabled:opacity-70 flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
            ) : (
              <LogIn size={18} className="mr-2" />
            )}
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        {/* Optional: Add a link to homepage or registration if applicable */}
        <p className="text-xs text-center text-gray-500 mt-6">
          Not a teacher? <a href="/" className="text-indigo-600 hover:underline">Go to homepage</a>.
        </p>
      </div>
    </div>
  );
}