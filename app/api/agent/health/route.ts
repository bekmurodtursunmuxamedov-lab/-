import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    const response = await fetch("https://print-style-uz.vercel.app", { cache: "no-store" });
    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - started,
      target: "https://print-style-uz.vercel.app",
      productionWrites: false,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      status: 0,
      latencyMs: Date.now() - started,
      target: "https://print-style-uz.vercel.app",
      productionWrites: false,
      error: error instanceof Error ? error.message : "Health check failed",
    }, { status: 502 });
  }
}
