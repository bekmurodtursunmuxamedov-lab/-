import { NextResponse } from "next/server";
import { getAgent } from "@/lib/agent-registry-store";
import { enqueueTask } from "@/lib/agent-task-queue";
import { runTask } from "@/lib/agent-task-runner";
import { emitEvent } from "@/lib/agent-event-bus.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "printshop-engineer";
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  const targetId = typeof body.targetId === "string" ? body.targetId.trim() : "printshop";

  const agent = getAgent(agentId);
  if (!agent) return NextResponse.json({ ok: false, error: "agent not found" }, { status: 404 });
  if (!summary) return NextResponse.json({ ok: false, error: "summary is required" }, { status: 400 });
  if (agent.status !== "active") return NextResponse.json({ ok: false, error: "agent is not active" }, { status: 409 });

  const task = enqueueTask(agentId, summary);
  emitEvent({ type: "incident.detected", agentId, taskId: task.id, payload: { targetId, summary } });
  emitEvent({ type: "task.queued", agentId, taskId: task.id });
  const result = runTask(task.id);

  return NextResponse.json({
    ok: Boolean(result?.ok),
    cycle: {
      detected: true,
      targetId,
      task: result?.task ?? task,
      stages: result?.stages ?? [],
      nextAction: result?.nextAction ?? "task-queued",
    },
    productionWrites: false,
  }, { status: result?.ok ? 200 : 409 });
}
