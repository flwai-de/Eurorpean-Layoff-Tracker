import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://dimissio.eu";
  const response = NextResponse.redirect(`${baseUrl}/admin/login`);

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
