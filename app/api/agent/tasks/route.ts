import { NextResponse } from "next/server";
import { getAgent } from "@/lib/agent-registry-store";
import { enqueueTask, listTasks, updateTaskStatus } from "@/lib/agent-task-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId") || undefined;
  const tasks = listTasks(agentId);
  return NextResponse.json({ ok: true, tasks, count: tasks.length, persisted: false, productionWrites: false });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "enqueue";

  if (action === "status") {
    const id = typeof body.id === "string" ? body.id : "";
    const status = body.status;
    if (!id || !["queued", "running", "completed", "failed"].includes(status)) {
      return NextResponse.json({ ok: false, error: "id and valid status are required" }, { status: 400 });
    }
    const task = updateTaskStatus(id, status);
    if (!task) return NextResponse.json({ ok: false, error: "task not found" }, { status: 404 });
    return NextResponse.json({ ok: true, task, persisted: false, productionWrites: false });
  }

  const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!agentId || !message) return NextResponse.json({ ok: false, error: "agentId and message are required" }, { status: 400 });
  if (!getAgent(agentId)) return NextResponse.json({ ok: false, error: "agent not found" }, { status: 404 });

  const task = enqueueTask(agentId, message);
  return NextResponse.json({ ok: true, task, persisted: false, productionWrites: false });
}
