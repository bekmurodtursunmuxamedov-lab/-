import { NextResponse } from "next/server";
import { listProjectFiles, githubConfigured } from "../../../../lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const riskyNames = ["debug", "backup", "test", ".bak", ".old", "secret", "credential", "key"];

export async function GET() {
  if (!githubConfigured()) {
    return NextResponse.json({ ok: true, mode: "read-only", configured: false, findings: [], productionWrites: false });
  }

  try {
    const files = await listProjectFiles("main");
    const findings = files
      .filter((path: string) => {
        const value = path.toLowerCase();
        return riskyNames.some((term) => value.includes(term));
      })
      .slice(0, 20)
      .map((path: string) => ({
        path,
        severity: path.toLowerCase().includes("secret") || path.toLowerCase().includes("credential") ? "high" : "review",
        type: "filename-review",
      }));

    return NextResponse.json({
      ok: true,
      mode: "read-only",
      configured: true,
      scannedFiles: files.length,
      findings,
      productionWrites: false,
      constructorChanged: false,
      note: "Filename-based screening only. No source contents or production resources were modified.",
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      mode: "read-only",
      productionWrites: false,
      error: error instanceof Error ? error.message : "Security scan failed",
    }, { status: 502 });
  }
}