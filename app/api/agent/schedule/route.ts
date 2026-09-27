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
      action: "inspect-dispatch-and-report",
      dispatchEndpoint: "/api/agent/scheduler",
      productionWrites: false,
    },
    autonomousRepair: {
      enabled: true,
      maxAttempts: 2,
      requiresVerification: true,
    },
    queue: {
      enabled: true,
      runner: "safe-task-runner",
      persistence: "runtime-only",
    },
    message: "Scheduled monitoring can dispatch observations into the safe task runner; production changes remain gated by verification and Draft PR.",
  });
}