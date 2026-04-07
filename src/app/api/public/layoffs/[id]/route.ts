import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getLayoffById } from "@/lib/queries/public";
import { withCors } from "@/lib/utils/cors";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = paramsSchema.safeParse({ id });
  if (!parsed.success) {
    return withCors(NextResponse.json({ error: "Invalid ID" }, { status: 400 }));
  }

  const layoff = await getLayoffById(parsed.data.id);
  if (!layoff) {
    return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }));
  }

  return withCors(NextResponse.json({ data: layoff }));
}
