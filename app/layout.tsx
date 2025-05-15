// app/layout.tsx
import './globals.css';

export const metadata = {
 title: 'ExamPortal',
 description: 'An online platform for creating, managing, and taking exams with real-time results and analytics.'

};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Add any global scripts or meta tags here */}
      </head>
      <body className='overflow-x-hidden'>{children}</body>
    </html>
  );
}
