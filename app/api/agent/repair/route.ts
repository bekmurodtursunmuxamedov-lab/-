import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const failed = Array.isArray(body.failed) ? body.failed.slice(0, 10) : [];
  const attempt = typeof body.attempt === "number" && body.attempt >= 0 ? Math.floor(body.attempt) : 0;

  if (failed.length === 0) {
    return NextResponse.json({
      ok: true,
      mode: "repair-loop",
      status: "not-needed",
      attempt,
      nextAction: "continue",
      productionWrites: false,
    });
  }

  if (attempt >= 2) {
    return NextResponse.json({
      ok: true,
      mode: "repair-loop",
      status: "stopped",
      attempt,
      failed,
      nextAction: "human-review",
      productionWrites: false,
      message: "Repair loop reached its safety limit and stopped instead of repeating changes indefinitely.",
    });
  }

  return NextResponse.json({
    ok: true,
    mode: "repair-loop",
    status: "analysis-required",
    attempt: attempt + 1,
    failed,
    nextAction: "analyze-and-prepare-new-minimal-patch",
    productionWrites: false,
    message: "Failed checks detected. A new minimal patch may be prepared only after analysis.",
  });
}