import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const subscriber = await db.query.newsletterSubscribers.findFirst({
    where: and(
      eq(newsletterSubscribers.confirmationToken, token),
      eq(newsletterSubscribers.status, "pending"),
    ),
  });

  if (!subscriber) {
    return NextResponse.redirect(new URL("/en/newsletter/confirmed?error=invalid", "https://dimissio.eu"));
  }

  await db
    .update(newsletterSubscribers)
    .set({
      status: "active",
      confirmedAt: new Date(),
      confirmationToken: null,
    })
    .where(eq(newsletterSubscribers.id, subscriber.id));

  const locale = subscriber.language === "de" ? "de" : "en";
  return NextResponse.redirect(new URL(`/${locale}/newsletter/confirmed`, "https://dimissio.eu"));
}
