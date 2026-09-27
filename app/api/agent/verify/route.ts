import { NextResponse } from "next/server";
import { getProjectFile, githubConfigured } from "../../../../lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const path = typeof body.path === "string" ? body.path.trim() : "";
  const branch = typeof body.branch === "string" ? body.branch.trim() : "";
  const expectedContent = typeof body.expectedContent === "string" ? body.expectedContent : "";

  if (!path || !branch || !expectedContent) {
    return NextResponse.json({ ok: false, error: "path, branch and expectedContent are required" }, { status: 400 });
  }
  if (!/^agent\/[a-z0-9._-]{1,70}$/.test(branch)) {
    return NextResponse.json({ ok: false, error: "unsafe agent branch name" }, { status: 400 });
  }
  if (!githubConfigured()) {
    return NextResponse.json({ ok: true, mode: "verification-preview", verified: false, productionWrites: false, note: "GitHub inspection is unavailable in this deployment." });
  }

  try {
    const current = await getProjectFile(path, branch);
    const verified = current.content === expectedContent;
    return NextResponse.json({
      ok: true,
      mode: "verification",
      verified,
      path,
      branch,
      sha: current.sha,
      contentLength: current.content.length,
      productionWrites: false,
      constructorChanged: false,
      message: verified ? "Agent-branch file matches the expected patch." : "Agent-branch file differs from the expected patch.",
    });
  } catch (error) {
    return NextResponse.json({ ok: false, mode: "verification", verified: false, productionWrites: false, error: error instanceof Error ? error.message : "Verification failed" }, { status: 502 });
  }
}