import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTrendChartData } from "@/lib/queries/public";
import { withCors } from "@/lib/utils/cors";

const querySchema = z.object({
  months: z.coerce.number().int().min(1).max(60).default(12),
});

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return withCors(NextResponse.json({ error: "Invalid parameters" }, { status: 400 }));
  }

  const data = await getTrendChartData(parsed.data.months);
  return withCors(NextResponse.json({ data }));
}
