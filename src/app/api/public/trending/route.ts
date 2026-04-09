import { NextRequest, NextResponse } from "next/server";
import { getTrendingLayoffs } from "@/lib/queries/public";
import { apiGuard, corsPreflightResponse, withRateLimitHeaders } from "@/lib/utils/cors";

export async function GET(request: NextRequest) {
  const blocked = apiGuard(request);
  if (blocked) return blocked;

  const data = await getTrendingLayoffs(10);
  return withRateLimitHeaders(NextResponse.json({ data }), request);
}

export function OPTIONS() {
  return corsPreflightResponse();
}
