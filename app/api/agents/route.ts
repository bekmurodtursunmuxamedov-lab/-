import { NextResponse } from "next/server";
import { listAgents, registerAgent, setAgentStatus } from "@/lib/agent-registry-store";
import type { AgentRecord } from "@/lib/agent-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const agents = listAgents();
  return NextResponse.json({ ok: true, agents, count: agents.length, persisted: false, productionWrites: false });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "register";

  if (action === "status") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const status = body.status;
    if (!id || !["active", "planned", "paused"].includes(status)) {
      return NextResponse.json({ ok: false, error: "id and valid status are required" }, { status: 400 });
    }
    const agent = setAgentStatus(id, status as AgentRecord["status"]);
    if (!agent) return NextResponse.json({ ok: false, error: "agent not found" }, { status: 404 });
    return NextResponse.json({ ok: true, action: "status", agent, persisted: false, productionWrites: false });
  }

  const agent = registerAgent(body as Partial<AgentRecord>);
  if (!agent) {
    return NextResponse.json({ ok: false, error: "Invalid or duplicate agent" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    action: "register",
    agent,
    persisted: false,
    productionWrites: false,
    message: "Agent registered in the current runtime. Persistent storage remains disabled.",
  });
}
