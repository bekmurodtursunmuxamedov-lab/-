import { NextResponse } from "next/server";
import { githubConfigured, getProjectFile, updateProjectFile } from "../../../../lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const blockedWords = ["constructor", "supabase/migrations", ".env", "auth", "payment", "order"];

function safePath(path: string) {
  if (!path || path.startsWith("/") || path.includes("..") || path.includes("\\") || path.startsWith(".git/") || path.includes("node_modules/")) return false;
  const value = path.toLowerCase();
  return !blockedWords.some((word) => value.includes(word));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const path = typeof body.path === "string" ? body.path.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";
  const branch = typeof body.branch === "string" ? body.branch.trim() : "";

  if (!path || !branch || content.length === 0) {
    return NextResponse.json({ ok: false, error: "path, branch and content are required" }, { status: 400 });
  }
  if (!/^agent\/[a-z0-9._-]{1,70}$/.test(branch) || !safePath(path)) {
    return NextResponse.json({ ok: false, error: "unsafe branch or protected file path" }, { status: 400 });
  }
  if (content.length > 200000) {
    return NextResponse.json({ ok: false, error: "content exceeds safe patch limit" }, { status: 400 });
  }
  if (!githubConfigured()) {
    return NextResponse.json({ ok: true, mode: "write-preview", written: false, productionWrites: false, note: "GitHub write adapter is unavailable in this deployment." });
  }

  try {
    const current = await getProjectFile(path, branch);
    const result = await updateProjectFile(path, content, "agent: apply reviewed minimal patch", branch);
    return NextResponse.json({
      ok: true,
      mode: "agent-branch-write",
      written: true,
      path,
      branch,
      previousSha: current.sha,
      commitSha: result.commitSha,
      productionWrites: false,
      constructorChanged: false,
      message: "File updated only on the agent branch.",
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      mode: "agent-branch-write",
      written: false,
      productionWrites: false,
      error: error instanceof Error ? error.message : "Agent branch write failed",
    }, { status: 502 });
  }
}