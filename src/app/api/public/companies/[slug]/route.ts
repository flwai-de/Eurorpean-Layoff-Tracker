import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCompanyBySlug } from "@/lib/queries/public";
import { apiGuard, corsPreflightResponse, withRateLimitHeaders } from "@/lib/utils/cors";

const paramsSchema = z.object({
  slug: z.string().min(1).max(200),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const blocked = apiGuard(request);
  if (blocked) return blocked;

  const { slug } = await params;
  const parsed = paramsSchema.safeParse({ slug });
  if (!parsed.success) {
    return withRateLimitHeaders(NextResponse.json({ error: "Invalid slug" }, { status: 400 }), request);
  }

  const company = await getCompanyBySlug(parsed.data.slug);
  if (!company) {
    return withRateLimitHeaders(NextResponse.json({ error: "Not found" }, { status: 404 }), request);
  }

  return withRateLimitHeaders(NextResponse.json({ data: company }), request);
}

export function OPTIONS() {
  return corsPreflightResponse();
}
