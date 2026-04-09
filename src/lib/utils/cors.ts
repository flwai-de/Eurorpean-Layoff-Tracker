import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "./rate-limit";

export function withCors(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export function corsPreflightResponse(): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }));
}

/**
 * Apply rate limiting and CORS to a public API handler.
 * Returns an error response if rate limited, or null to proceed.
 */
export function apiGuard(request: NextRequest): NextResponse | null {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(ip, { limit: 100, windowMs: 60 * 60 * 1000 });

  if (!rl.success) {
    const res = withCors(
      NextResponse.json(
        { error: "Rate limit exceeded. Max 100 requests per hour." },
        { status: 429 },
      ),
    );
    res.headers.set("X-RateLimit-Limit", "100");
    res.headers.set("X-RateLimit-Remaining", "0");
    return res;
  }

  return null;
}

export function withRateLimitHeaders(
  response: NextResponse,
  request: NextRequest,
): NextResponse {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // Re-check just to get remaining (already passed guard)
  const rl = rateLimit(ip, { limit: 100, windowMs: 60 * 60 * 1000 });
  response.headers.set("X-RateLimit-Limit", "100");
  response.headers.set("X-RateLimit-Remaining", String(rl.remaining));
  return withCors(response);
}
