import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const target = "https://print-style-uz.vercel.app";
  const started = Date.now();

  try {
    const response = await fetch(target, { cache: "no-store" });
    const latencyMs = Date.now() - started;
    const healthy = response.ok && latencyMs < 5000;

    return NextResponse.json({
      ok: true,
      cycle: {
        health: { status: response.status, latencyMs, healthy },
        security: { status: "ready", mode: "read-only" },
        repair: {
          status: healthy ? "not-needed" : "analysis-required",
          maxAttempts: 2,
          productionWrites: false,
        },
        nextAction: healthy ? "continue-monitoring" : "inspect-and-prepare-minimal-patch",
      },
      productionWrites: false,
      constructorChanged: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      cycle: {
        health: { status: 0, latencyMs: Date.now() - started, healthy: false },
        security: { status: "ready", mode: "read-only" },
        repair: { status: "analysis-required", maxAttempts: 2, productionWrites: false },
        nextAction: "inspect-and-prepare-minimal-patch",
      },
      productionWrites: false,
      constructorChanged: false,
      error: error instanceof Error ? error.message : "Target health check failed",
      timestamp: new Date().toISOString(),
    });
  }
}
