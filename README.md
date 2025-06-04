# Exam Portal

A comprehensive online examination system built with Next.js, Prisma, and PostgreSQL.

## Features

- 🔐 **Authentication System** - Secure login/register with JWT tokens
- 👥 **Role-based Access** - Admin and Student roles with different permissions
- 📝 **Exam Management** - Create, edit, and manage exams with multiple question types
- ⏱️ **Timed Exams** - Built-in timer functionality for exam sessions
- 📊 **Results & Analytics** - Automatic grading and result tracking
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Prisma Postgres)
- **Authentication**: JWT with HTTP-only cookies
- **UI Components**: shadcn/ui, Radix UI

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Prisma Postgres database (already configured)

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd exam-portal
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install --legacy-peer-deps
   \`\`\`

3. **Environment variables are already configured**
   - The `.env` file contains all production-ready environment variables
   - Database URL, JWT secrets, and NextAuth configuration are set

4. **Generate Prisma client**
   \`\`\`bash
   npm run db:generate
   \`\`\`

5. **Push database schema**
   \`\`\`bash
   npm run db:push
   \`\`\`

6. **Start the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

7. **Open your browser**
   Navigate to `http://localhost:3000`

## Default Admin Credentials

- **Email**: teacher@gmail.com
- **Password**: password123

The admin user will be automatically created on first login attempt.

## Deployment

This application is configured for deployment on Vercel:

1. **Push to GitHub**
2. **Connect to Vercel**
3. **Environment variables are already set in .env file**
4. **Deploy**

The application will automatically handle database migrations and setup.

## Production Environment

The application is configured with:
- **Database**: Prisma Postgres with connection pooling
- **Authentication**: Secure JWT tokens with HTTP-only cookies
- **Deployment**: Optimized for Vercel with proper build configuration
- **Security**: Production-ready environment variables

## Database Schema

The application uses the following main entities:

- **Users** - Admin and Student accounts
- **Exams** - Exam definitions with metadata
- **Questions** - Individual questions with multiple types
- **Options** - Answer choices for multiple-choice questions
- **ExamAttempts** - Student exam sessions
- **Answers** - Student responses to questions

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Exams
- `GET /api/exams` - List all active exams
- `POST /api/exams` - Create new exam (Admin only)
- `POST /api/exams/[id]/attempt` - Start exam attempt
- `POST /api/exams/[id]/submit` - Submit exam answers

### Admin
- `GET /api/admin/exams` - Admin exam management
- `GET /api/admin/stats` - Dashboard statistics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
