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

  // Look up by token only — don't require status=pending so we can distinguish
  // "already confirmed" from "truly invalid"
  const subscriber = await db
    .select({
      id: newsletterSubscribers.id,
      status: newsletterSubscribers.status,
      language: newsletterSubscribers.language,
    })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.confirmationToken, token))
    .limit(1);

  if (subscriber.length === 0) {
    // Token not found — could be already confirmed (token set to null) or truly invalid
    console.error("[newsletter-confirm] Token not found in DB:", token.slice(0, 10) + "...");
    return NextResponse.redirect(new URL("/de/newsletter/confirmed?error=invalid", SITE_URL));
  }

  const sub = subscriber[0];
  const locale = sub.language === "de" ? "de" : "en";

  if (sub.status === "active") {
    // Already confirmed — just redirect to success
    return NextResponse.redirect(new URL(`/${locale}/newsletter/confirmed`, SITE_URL));
  }

  // Confirm the subscriber
  await db
    .update(newsletterSubscribers)
    .set({
      status: "active",
      confirmedAt: new Date(),
      confirmationToken: null,
    })
    .where(eq(newsletterSubscribers.id, sub.id));

  console.log("[newsletter-confirm] Subscriber confirmed:", sub.id);
  return NextResponse.redirect(new URL(`/${locale}/newsletter/confirmed`, SITE_URL));
}
