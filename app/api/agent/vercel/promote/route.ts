import { NextResponse } from "next/server";
import { promoteVercelDeployment } from "@/lib/vercel";
import { productionActionAllowed } from "@/lib/production-action.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const deploymentId = typeof body.deploymentId === "string" ? body.deploymentId.trim() : "";
  const confirmProduction = body.confirmProduction;

  if (!deploymentId) {
    return NextResponse.json({ ok: false, error: "deploymentId is required" }, { status: 400 });
  }

  if (!productionActionAllowed(confirmProduction)) {
    return NextResponse.json({
      ok: false,
      error: "explicit production confirmation is required",
      executed: false,
      productionWrites: false,
    }, { status: 409 });
  }

  try {
    const result = await promoteVercelDeployment(deploymentId);
    return NextResponse.json({
      ok: true,
      executed: true,
      productionWrites: true,
      mode: "production-promotion",
      ...result,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      executed: false,
      productionWrites: false,
      error: error instanceof Error ? error.message : "Vercel production promotion failed",
    }, { status: 502 });
  }
}
