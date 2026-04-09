import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTrendChartData } from "@/lib/queries/public";
import { apiGuard, corsPreflightResponse, withRateLimitHeaders } from "@/lib/utils/cors";

const querySchema = z.object({
  months: z.coerce.number().int().min(1).max(60).default(12),
});

export async function GET(request: NextRequest) {
  const blocked = apiGuard(request);
  if (blocked) return blocked;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return withRateLimitHeaders(NextResponse.json({ error: "Invalid parameters" }, { status: 400 }), request);
  }

  const data = await getTrendChartData(parsed.data.months);
  return withRateLimitHeaders(NextResponse.json({ data }), request);
}

export function OPTIONS() {
  return corsPreflightResponse();
}
