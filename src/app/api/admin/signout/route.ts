import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL("/admin/login", request.url);
  const response = NextResponse.redirect(url);

  // Get all cookies from the request
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieNames = cookieHeader
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter((name) => name.includes("authjs") || name.includes("next-auth") || name.includes("csrf"));

  // Expire each cookie with all possible path combinations
  for (const name of cookieNames) {
    response.cookies.set(name, "", { maxAge: 0, path: "/" });
    response.cookies.set(name, "", { maxAge: 0, path: "/admin" });
    response.cookies.set(name, "", { maxAge: 0, path: "/api" });
  }

  // Also try the known NextAuth v5 cookie names explicitly
  const knownCookies = [
    "authjs.session-token",
    "authjs.callback-url",
    "authjs.csrf-token",
    "__Secure-authjs.session-token",
    "__Secure-authjs.callback-url",
    "__Secure-authjs.csrf-token",
    "__Host-authjs.csrf-token",
  ];

  for (const name of knownCookies) {
    response.cookies.set(name, "", { maxAge: 0, path: "/" });
  }

  return response;
}
