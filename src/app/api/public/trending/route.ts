import { NextResponse } from "next/server";
import { getTrendingLayoffs } from "@/lib/queries/public";
import { withCors } from "@/lib/utils/cors";

export async function GET() {
  const data = await getTrendingLayoffs(5);
  return withCors(NextResponse.json({ data }));
}
