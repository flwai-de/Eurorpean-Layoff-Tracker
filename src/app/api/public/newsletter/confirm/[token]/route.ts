import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://dimissio.eu";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token || token.length < 30) {
    console.error("[newsletter-confirm] Invalid token format:", token?.slice(0, 10));
    return NextResponse.redirect(new URL("/de/newsletter/confirmed?error=invalid", SITE_URL));
  }

  const subscriber = await db
    .select({
      id: newsletterSubscribers.id,
      status: newsletterSubscribers.status,
      language: newsletterSubscribers.language,
      confirmedAt: newsletterSubscribers.confirmedAt,
    })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.confirmationToken, token))
    .limit(1);

  if (subscriber.length === 0) {
    console.error("[newsletter-confirm] Token not found in DB:", token.slice(0, 10) + "...");
    return NextResponse.redirect(new URL("/de/newsletter/confirmed?error=invalid", SITE_URL));
  }

  const sub = subscriber[0];
  const locale = sub.language === "de" ? "de" : "en";

  if (sub.status === "active") {
    // Email link scanners (Outlook ATP, Gmail preview, corporate proxies)
    // often prefetch the URL before the user clicks. Treat a just-activated
    // row as still "success" so the real click lands on the welcome banner.
    const justConfirmed =
      sub.confirmedAt != null &&
      Date.now() - sub.confirmedAt.getTime() < 5 * 60_000;
    const flag = justConfirmed ? "success" : "already";
    return NextResponse.redirect(new URL(`/${locale}?confirmed=${flag}`, SITE_URL));
  }

  if (sub.status !== "pending") {
    return NextResponse.redirect(new URL(`/${locale}/newsletter/confirmed?error=invalid`, SITE_URL));
  }

  await db
    .update(newsletterSubscribers)
    .set({
      status: "active",
      confirmedAt: new Date(),
    })
    .where(eq(newsletterSubscribers.id, sub.id));

  console.log("[newsletter-confirm] Subscriber confirmed:", sub.id);
  return NextResponse.redirect(new URL(`/${locale}?confirmed=success`, SITE_URL));
}
