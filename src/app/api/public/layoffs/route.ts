import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVerifiedLayoffs } from "@/lib/queries/public";
import { rateLimit } from "@/lib/utils/rate-limit";
import { withCors } from "@/lib/utils/cors";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  country: z.string().length(2).toUpperCase().optional(),
  industry: z.string().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
});

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(ip, { limit: 100, windowMs: 60 * 60 * 1000 });
  if (!rl.success) {
    return withCors(NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 }));
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return withCors(NextResponse.json({ error: "Invalid parameters", details: parsed.error.flatten() }, { status: 400 }));
  }

  const { limit, offset, country, industry, dateFrom, dateTo } = parsed.data;
  const result = await getVerifiedLayoffs({
    limit,
    offset,
    country,
    industrySlug: industry,
    dateFrom,
    dateTo,
  });

  return withCors(NextResponse.json({ ...result, limit, offset }));
}
