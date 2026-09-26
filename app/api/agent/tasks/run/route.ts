import { NextResponse } from "next/server";
import { runTask } from "@/lib/agent-task-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
  if (!taskId) return NextResponse.json({ ok: false, error: "taskId is required" }, { status: 400 });

  const result = runTask(taskId);
  if (!result) return NextResponse.json({ ok: false, error: "task not found" }, { status: 404 });

  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
