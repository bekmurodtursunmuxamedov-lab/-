import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
      intervalMinutes: 15,
      maxRepairAttempts: 2,
    },
    persistence: {
      registry: "preview-only",
      activity: "read-only status",
    },
    protectedAreas: ["constructor", "production DB", "auth", "payments", "orders"],
    productionWrites: false,
    constructorChanged: false,
  });
}
