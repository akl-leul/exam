// lib/auth.ts
import { cookies } from "next/headers";
import prisma from "./prisma"; // your Prisma client instance

// Define your cookie names (adjust if needed)
export const TEACHER_AUTH_TOKEN = "teacherAuthToken";
export const TEACHER_ID_COOKIE = "teacherId";

/**
 * Validates the teacher auth token and returns the teacher ID if authenticated.
 * @param req NextRequest (optional, not used here because cookies() reads current cookies)
 * @returns teacher ID string or null if not authenticated
 */
export async function getAuthenticatedTeacherId(): Promise<string | null> {
  try {
    const cookieStore = cookies();

    const authToken = cookieStore.get(TEACHER_AUTH_TOKEN)?.value;
    const teacherIdFromCookie = cookieStore.get(TEACHER_ID_COOKIE)?.value;

    console.log("AuthCheck: Token:", authToken, "TeacherIDCookie:", teacherIdFromCookie);

    if (!authToken || !teacherIdFromCookie) {
      console.warn("Auth: Missing auth token or teacher ID cookie.");
      return null;
    }

    // Query your database to verify the teacher and token
    // Assuming you store tokens in your teacher table or a separate session table
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherIdFromCookie },
      select: { id: true, authToken: true }, // Adjust field names accordingly
    });

    if (!teacher) {
      console.warn(`Auth: Teacher with ID ${teacherIdFromCookie} not found.`);
      return null;
    }

    // Verify token matches (adjust if you hash tokens)
    if (teacher.authToken !== authToken) {
      console.warn(`Auth: Invalid token for teacher ID ${teacherIdFromCookie}.`);
      return null;
    }

    console.log(`Auth: Authenticated teacher ID: ${teacher.id}`);
    return teacher.id;
  } catch (error) {
    console.error("Auth: Error validating teacher authentication:", error);
    return null;
  }
}
