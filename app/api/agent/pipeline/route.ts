import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const protectedTerms = ["constructor", "production database", "auth", "payments", "orders"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const task = typeof body.task === "string" ? body.task.trim() : "";

  if (!task) return NextResponse.json({ ok: false, error: "task is required" }, { status: 400 });

  const normalized = task.toLowerCase();
  const protectedRequest = protectedTerms.filter((term) => normalized.includes(term));

  return NextResponse.json({
    ok: true,
    mode: "orchestrator-preview",
    task,
    stages: [
      { id: "inspect", status: "ready", writes: false },
      { id: "review", status: "ready", writes: false },
      { id: "diff", status: "ready", writes: false },
      { id: "generate", status: protectedRequest.length ? "blocked" : "awaiting-files", writes: false },
      { id: "patch", status: "not-started", writes: false },
      { id: "tests", status: "not-started", writes: false },
      { id: "draft-pr", status: "not-started", writes: false },
    ],
    protectedRequest,
    productionWrites: false,
    constructorChanged: false,
    message: protectedRequest.length
      ? "The requested task touches a protected area. The pipeline stops before generation."
      : "Pipeline is ready to consume inspected files. No source or production resources were changed.",
  });
}