import { NextResponse } from "next/server";
import { createProjectPullRequest, githubConfigured } from "../../../../lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeBranch(branch: string) {
  return /^agent\/[a-z0-9._-]{1,70}$/.test(branch);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const branch = typeof body.branch === "string" ? body.branch.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const task = typeof body.task === "string" ? body.task.trim() : "";
  const verified = body.verified === true;

  if (!branch || !title || !task) {
    return NextResponse.json({ ok: false, error: "branch, title and task are required" }, { status: 400 });
  }
  if (!safeBranch(branch)) {
    return NextResponse.json({ ok: false, error: "unsafe agent branch name" }, { status: 400 });
  }
  if (!verified) {
    return NextResponse.json({ ok: false, error: "PR creation requires successful verification" }, { status: 409 });
  }
  if (!githubConfigured()) {
    return NextResponse.json({ ok: true, mode: "draft-pr-preview", created: false, productionWrites: false, note: "GitHub write adapter is unavailable in this deployment." });
  }

  try {
    const pr = await createProjectPullRequest(
      title,
      "Automated Agent Hub change.\n\nTask: " + task + "\n\nVerification succeeded before PR creation. This PR is draft-only; production deployment is not performed automatically.",
      branch,
      "main",
    );
    return NextResponse.json({
      ok: true,
      mode: "draft-pr",
      created: true,
      number: pr.number,
      url: pr.html_url,
      branch,
      draft: true,
      productionWrites: false,
      constructorChanged: false,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, mode: "draft-pr", created: false, productionWrites: false, error: error instanceof Error ? error.message : "Draft PR creation failed" }, { status: 502 });
  }
}