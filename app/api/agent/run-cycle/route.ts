import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const target = "https://print-style-uz.vercel.app";

async function checkTarget() {
  const started = Date.now();
  try {
    const response = await fetch(target, { cache: "no-store" });
    return { ok: response.ok, httpStatus: response.status, latencyMs: Date.now() - started };
  } catch {
    return { ok: false, httpStatus: 0, latencyMs: Date.now() - started };
  }
}

export async function GET() {
  const health = await checkTarget();
  const healthy = health.ok && health.latencyMs < 5000;

  return NextResponse.json({
    ok: true,
    cycleId: `cycle-${Date.now()}`,
    target,
    stages: {
      health: { status: healthy ? "passed" : "failed", ...health },
      security: { status: "ready", mode: "read-only" },
      repair: { status: healthy ? "not-needed" : "analysis-required", maxAttempts: 2 },
      verification: { status: healthy ? "ready" : "waiting-for-patch" },
    },
    nextAction: healthy ? "continue-monitoring" : "inspect-and-prepare-minimal-patch",
    productionWrites: false,
    constructorChanged: false,
  });
}
