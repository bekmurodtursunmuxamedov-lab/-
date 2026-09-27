import { NextResponse } from "next/server";
import { getVercelStatus } from "@/lib/vercel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getVercelStatus();
    return NextResponse.json({ ok: true, configured: true, ...status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vercel adapter failed";
    const configured = Boolean(process.env.VERCEL_TOKEN);
    return NextResponse.json({
      ok: false,
      configured,
      connected: false,
      error: message,
      projectId: process.env.VERCEL_PROJECT_ID || "prj_rHne86ZngMz39BzCFqBvs9mIcdLh",
    }, { status: configured ? 502 : 200 });
  }
}
