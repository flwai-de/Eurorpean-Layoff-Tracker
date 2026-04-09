import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const email64 = request.nextUrl.searchParams.get("email");
  if (!email64) {
    return NextResponse.redirect(new URL("/en/newsletter/unsubscribed", "https://dimissio.eu"));
  }

  let email: string;
  try {
    email = Buffer.from(email64, "base64").toString("utf-8");
  } catch {
    return NextResponse.redirect(new URL("/en/newsletter/unsubscribed", "https://dimissio.eu"));
  }

  const subscriber = await db.query.newsletterSubscribers.findFirst({
    where: and(
      eq(newsletterSubscribers.email, email),
      eq(newsletterSubscribers.status, "active"),
    ),
  });

  if (subscriber) {
    await db
      .update(newsletterSubscribers)
      .set({
        status: "unsubscribed",
        unsubscribedAt: new Date(),
      })
      .where(eq(newsletterSubscribers.id, subscriber.id));
  }

  const locale = subscriber?.language === "de" ? "de" : "en";
  return NextResponse.redirect(new URL(`/${locale}/newsletter/unsubscribed`, "https://dimissio.eu"));
}
