import { NextResponse } from "next/server";
import { getAgent } from "@/lib/agent-registry-store";
import { enqueueTask } from "@/lib/agent-task-queue";
import { runTask } from "@/lib/agent-task-runner";
import { emitEvent } from "@/lib/agent-event-bus.mjs";
import { isAuthorizedCronRequest } from "@/lib/cron-auth.mjs";
import { persistAgent, persistEvent, persistTask } from "@/lib/agent-persistence-runtime.mjs";

type Incident = {
  id: string;
  agentId: string;
  targetId: string;
  kind: "availability" | "latency";
  severity: "high" | "medium";
  status: "detected";
  summary: string;
  detectedAt: string;
};

const targets = [{ id: "printshop", name: "PRINTSHOP", url: "https://print-style-uz.vercel.app" }];

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({
      ok: false,
      error: "Unauthorized cron request.",
      productionWrites: false,
      constructorChanged: false,
    }, { status: 401 });
  }

  const checkedAt = new Date().toISOString();
  const incidents: Incident[] = [];

  const results = await Promise.all(targets.map(async (target) => {
    const started = Date.now();
    try {
      const response = await fetch(target.url, {
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const latencyMs = Date.now() - started;

      if (!response.ok) {
        incidents.push({
          id: `inc_${Date.now()}_${target.id}`,
          agentId: "printshop-engineer",
          targetId: target.id,
          kind: "availability",
          severity: "high",
          status: "detected",
          summary: `${target.name} returned HTTP ${response.status}`,
          detectedAt: checkedAt,
        });
      } else if (latencyMs >= 5000) {
        incidents.push({
          id: `inc_${Date.now()}_${target.id}`,
          agentId: "printshop-engineer",
          targetId: target.id,
          kind: "latency",
          severity: "medium",
          status: "detected",
          summary: `${target.name} responded slowly (${latencyMs}ms)`,
          detectedAt: checkedAt,
        });
      }

      return { id: target.id, name: target.name, url: target.url, ok: response.ok, status: response.status, latencyMs };
    } catch (error) {
      incidents.push({
        id: `inc_${Date.now()}_${target.id}`,
        agentId: "printshop-engineer",
        targetId: target.id,
        kind: "availability",
        severity: "high",
        status: "detected",
        summary: `${target.name} health check failed`,
        detectedAt: checkedAt,
      });
      return {
        id: target.id,
        name: target.name,
        url: target.url,
        ok: false,
        status: 0,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : "health check failed",
      };
    }
  }));

  const agent = getAgent("printshop-engineer");
  const dispatchedTasks = await Promise.all(incidents.map(async (incident) => {
    if (!agent || agent.status !== "active") {
      return { incidentId: incident.id, status: "not-dispatched", reason: "agent-not-active" };
    }

    await persistAgent(agent);
    const task = enqueueTask(incident.agentId, incident.summary);

    const detectedEvent = emitEvent({
      type: "incident.detected",
      agentId: incident.agentId,
      taskId: task.id,
      payload: { targetId: incident.targetId, summary: incident.summary },
    });
    const queuedEvent = emitEvent({ type: "task.queued", agentId: incident.agentId, taskId: task.id });

    await persistEvent(detectedEvent);
    await persistEvent(queuedEvent);
    await persistTask(task);

    const result = runTask(task.id);
    const completedTask = result?.task ?? task;
    const taskPersistence = await persistTask(completedTask);
    const lifecyclePersistence = await Promise.all(
      (result?.events ?? []).map((event) => persistEvent(event)),
    );
    const lifecyclePersisted = lifecyclePersistence.some((entry) => entry.persisted);

    return {
      incidentId: incident.id,
      status: completedTask.status,
      taskId: completedTask.id,
      nextAction: result?.nextAction ?? "task-queued",
      stages: result?.stages ?? [],
      persisted: taskPersistence.persisted || lifecyclePersisted,
      persistenceState: taskPersistence.state,
    };
  }));

  return NextResponse.json({
    ok: incidents.length === 0,
    cycle: { id: `cycle_${Date.now()}`, agentId: "printshop-engineer", checkedAt },
    targets: results,
    tasks: dispatchedTasks,
    incidents,
    persistence: "opt-in",
    productionWrites: false,
    constructorChanged: false,
  });
}
