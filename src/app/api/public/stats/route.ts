import { NextResponse } from "next/server";
import { getHeroStats } from "@/lib/queries/public";
import { withCors } from "@/lib/utils/cors";

export async function GET() {
  const stats = await getHeroStats();
  return withCors(NextResponse.json(stats));
}
