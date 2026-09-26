import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: "scheduler-status",
    heartbeat: {
      enabled: true,
      intervalMinutes: 15,
      action: "inspect-and-report",
      productionWrites: false,
    },
    autonomousRepair: {
      enabled: true,
      maxAttempts: 2,
      requiresVerification: true,
    },
    message: "Scheduled monitoring is enabled; changes remain gated by verification and Draft PR.",
  });
}