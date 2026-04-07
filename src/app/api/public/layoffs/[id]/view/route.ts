import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { layoffViews } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { withCors } from "@/lib/utils/cors";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = paramsSchema.safeParse({ id });
  if (!parsed.success) {
    return withCors(NextResponse.json({ error: "Invalid ID" }, { status: 400 }));
  }

  const today = new Date().toISOString().split("T")[0];

  await db
    .insert(layoffViews)
    .values({ layoffId: parsed.data.id, viewedAt: today, viewCount: 1 })
    .onConflictDoUpdate({
      target: [layoffViews.layoffId, layoffViews.viewedAt],
      set: { viewCount: sql`${layoffViews.viewCount} + 1` },
    });

  return withCors(NextResponse.json({ success: true }));
}
