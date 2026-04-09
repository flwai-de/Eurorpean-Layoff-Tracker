import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLayoffById } from "@/lib/queries/public";
import { apiGuard, corsPreflightResponse, withRateLimitHeaders } from "@/lib/utils/cors";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = apiGuard(request);
  if (blocked) return blocked;

  const { id } = await params;
  const parsed = paramsSchema.safeParse({ id });
  if (!parsed.success) {
    return withRateLimitHeaders(NextResponse.json({ error: "Invalid ID" }, { status: 400 }), request);
  }

  const layoff = await getLayoffById(parsed.data.id);
  if (!layoff) {
    return withRateLimitHeaders(NextResponse.json({ error: "Not found" }, { status: 404 }), request);
  }

  return withRateLimitHeaders(NextResponse.json({ data: layoff }), request);
}

export function OPTIONS() {
  return corsPreflightResponse();
}
