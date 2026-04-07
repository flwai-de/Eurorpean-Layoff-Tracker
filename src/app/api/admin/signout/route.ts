import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  // Delete all NextAuth cookies
  cookieStore.getAll().forEach((cookie) => {
    if (cookie.name.includes("authjs") || cookie.name.includes("next-auth")) {
      cookieStore.delete(cookie.name);
    }
  });
  return NextResponse.redirect(new URL("/admin/login", process.env.NEXTAUTH_URL ?? "https://dimissio.eu"));
}
