import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCompanyBySlug } from "@/lib/queries/public";
import { withCors } from "@/lib/utils/cors";

const paramsSchema = z.object({
  slug: z.string().min(1).max(200),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const parsed = paramsSchema.safeParse({ slug });
  if (!parsed.success) {
    return withCors(NextResponse.json({ error: "Invalid slug" }, { status: 400 }));
  }

  const company = await getCompanyBySlug(parsed.data.slug);
  if (!company) {
    return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }));
  }

  return withCors(NextResponse.json({ data: company }));
}
