import { NextResponse } from "next/server";
import { createProjectBranch, githubConfigured } from "../../../../lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeBranch(value: string) {
  return /^agent\/[a-z0-9._-]{1,70}$/.test(value);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const requested = typeof body.branch === "string" ? body.branch.trim().toLowerCase() : "";
  const branch = requested || "agent/auto-change";

  if (!safeBranch(branch)) {
    return NextResponse.json({ ok: false, error: "unsafe agent branch name" }, { status: 400 });
  }

  if (!githubConfigured()) {
    return NextResponse.json({
      ok: true,
      mode: "prepare-only",
      branch,
      created: false,
      productionWrites: false,
      note: "GitHub write adapter is unavailable in this deployment.",
    });
  }

  try {
    const result = await createProjectBranch(branch, "main");
    return NextResponse.json({
      ok: true,
      mode: "prepare-only",
      branch: result.branch,
      baseSha: result.baseSha,
      created: true,
      productionWrites: false,
      constructorChanged: false,
      message: "Agent branch created from main. No production branch was modified.",
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      mode: "prepare-only",
      branch,
      created: false,
      productionWrites: false,
      error: error instanceof Error ? error.message : "Branch creation failed",
    }, { status: 502 });
  }
}