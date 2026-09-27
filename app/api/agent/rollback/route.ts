import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const confirmed = body.confirmed === true;
  const deployment = typeof body.deployment === "string" ? body.deployment.trim() : "";

  if (!deployment) return NextResponse.json({ ok: false, error: "deployment is required" }, { status: 400 });

  return NextResponse.json({
    ok: true,
    mode: "rollback-preview",
    deployment,
    confirmed,
    executed: false,
    productionWrites: false,
    message: confirmed
      ? "Rollback is acknowledged but execution remains disabled in this safety stage."
      : "Rollback requires explicit confirmation and is not executed automatically.",
  });
}