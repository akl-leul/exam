// app/api/teacher/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers'; // For App Router

// In a real app, use a proper session library like next-auth
const TEACHER_AUTH_TOKEN = 'teacher-auth-token';
const TEACHER_ID_COOKIE = 'teacher-id'; // To store teacherId

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { username },
    });

    if (!teacher) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, teacher.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Basic session management: Set a cookie
    // WARNING: This is NOT secure for production. Use next-auth.
    const response = NextResponse.json({ message: 'Login successful', teacherId: teacher.id }, { status: 200 });
    
    // Create a "session token" - here, just a placeholder.
    // In a real app, this would be a JWT or a session ID stored in a database.
    const sessionToken = await bcrypt.hash(teacher.id + Date.now(), 5); // Dummy token
    
    response.cookies.set(TEACHER_AUTH_TOKEN, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });
    response.cookies.set(TEACHER_ID_COOKIE, teacher.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24, // 1 day
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}