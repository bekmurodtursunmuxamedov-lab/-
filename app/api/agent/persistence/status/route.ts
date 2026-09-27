import { NextResponse } from "next/server";
import { getPersistenceStatus } from "@/lib/agent-persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const persistence = await getPersistenceStatus();

  return NextResponse.json({
    ok: true,
    persistence,
    productionWrites: false,
  });
}
