import { NextResponse } from "next/server";
import { getPersistenceStatus } from "@/lib/agent-persistence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const persistence = await getPersistenceStatus();

  return NextResponse.json({
    ok: true,
    agent: {
      id: "printshop-engineer",
      status: "active",
      target: "bekmurodtursunmuxamedov-lab/print-style-uz",
      mode: "safe-autonomous",
    },
    capabilities: {
      inspect: true,
      securityMonitoring: true,
      planning: true,
      boundedRepair: true,
      previewVerification: true,
      draftPR: true,
      productionDeploy: false,
    },
    scheduler: {
      enabled: true,
      schedule: "0 3 * * *",
      precision: "daily on Vercel Hobby",
      maxRepairAttempts: 2,
    },
    persistence: {
      configured: persistence.configured,
      connected: persistence.connected,
      provider: persistence.provider,
      reason: persistence.reason,
      registry: persistence.configured && persistence.connected ? "durable-ready" : "runtime-only",
      activity: persistence.configured && persistence.connected ? "durable-ready" : "read-only status",
    },
    protectedAreas: ["constructor", "production DB", "auth", "payments", "orders"],
    productionWrites: false,
    constructorChanged: false,
  });
}
