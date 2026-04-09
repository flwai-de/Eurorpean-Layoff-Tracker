import { NextRequest, NextResponse } from "next/server";
import { getHeroStats } from "@/lib/queries/public";
import { apiGuard, corsPreflightResponse, withRateLimitHeaders } from "@/lib/utils/cors";

export async function GET(request: NextRequest) {
  const blocked = apiGuard(request);
  if (blocked) return blocked;

  const stats = await getHeroStats();
  return withRateLimitHeaders(NextResponse.json({ data: stats }), request);
}

export function OPTIONS() {
  return corsPreflightResponse();
}
