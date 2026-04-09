import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVerifiedLayoffs } from "@/lib/queries/public";
import { apiGuard, corsPreflightResponse, withRateLimitHeaders } from "@/lib/utils/cors";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  country: z.string().length(2).toUpperCase().optional(),
  industry: z.string().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export async function GET(request: NextRequest) {
  const blocked = apiGuard(request);
  if (blocked) return blocked;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return withRateLimitHeaders(
      NextResponse.json({ error: "Invalid parameters", details: parsed.error.flatten() }, { status: 400 }),
      request,
    );
  }

  const { page, limit, country, industry, from: dateFrom, to: dateTo } = parsed.data;
  const offset = (page - 1) * limit;

  const result = await getVerifiedLayoffs({
    limit,
    offset,
    country,
    industrySlug: industry,
    dateFrom,
    dateTo,
  });

  const totalPages = Math.ceil(result.total / limit);

  return withRateLimitHeaders(
    NextResponse.json({
      data: result.data,
      pagination: { page, limit, total: result.total, totalPages },
    }),
    request,
  );
}

export function OPTIONS() {
  return corsPreflightResponse();
}
