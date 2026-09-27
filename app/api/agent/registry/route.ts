import { NextResponse } from "next/server";
import { getPersistenceStatus } from "@/lib/agent-persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const protectedAreas = ["constructor", "production DB", "auth", "payments", "orders"];

export async function GET() {
  const persistence = getPersistenceStatus();

  return NextResponse.json({
    ok: true,
    agents: [{
      id: "printshop-engineer",
      name: "PRINTSHOP Engineer",
      role: "Autonomous web engineer",
      status: "active",
      target: "bekmurodtursunmuxamedov-lab/print-style-uz",
      capabilities: ["inspect", "security", "repair", "preview", "draft-pr"],
      protectedAreas,
    }],
    persistence,
    productionWrites: false,
  });
}
