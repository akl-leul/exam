// app/api/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ message: "Logged out" });

  // Clear the authToken cookie by setting it with an expired date
  response.cookies.set("authToken", "", {
    path: "/",
    expires: new Date(0), // Expire immediately
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
