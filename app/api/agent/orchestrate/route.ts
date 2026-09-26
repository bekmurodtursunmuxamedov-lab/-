import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const protectedTerms = ["constructor", "production db", "production database", "auth", "payments", "orders"];

function isProtected(task: string) {
  const value = task.toLowerCase();
  return protectedTerms.some((term) => value.includes(term));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const task = typeof body.task === "string" ? body.task.trim() : "";

  if (!task) return NextResponse.json({ ok: false, error: "task is required" }, { status: 400 });

  if (isProtected(task)) {
    return NextResponse.json({
      ok: true,
      status: "blocked",
      stage: "safety",
      task,
      nextAction: "human-review",
      productionWrites: false,
      constructorChanged: false,
      message: "Protected scope detected. Autonomous changes are stopped.",
    });
  }

  return NextResponse.json({
    ok: true,
    status: "ready",
    task,
    stages: [
      { id: "inspect", status: "pending" },
      { id: "review", status: "pending" },
      { id: "diff", status: "pending" },
      { id: "generate", status: "pending" },
      { id: "patch", status: "pending" },
      { id: "tests", status: "pending" },
      { id: "preview", status: "pending" },
      { id: "quality", status: "pending" },
      { id: "draft-pr", status: "pending" },
    ],
    productionWrites: false,
    constructorChanged: false,
    message: "Orchestration plan created. Execution remains gated by verification and Draft PR.",
  });
}