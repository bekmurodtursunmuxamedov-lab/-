import { NextResponse } from "next/server";
import { defaultAgents, normalizeAgent, type AgentRecord } from "@/lib/agent-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, agents: defaultAgents, count: defaultAgents.length, productionWrites: false });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const agent = normalizeAgent(body as Partial<AgentRecord>);

  if (!agent) {
    return NextResponse.json({ ok: false, error: "Valid id, name and target are required" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    mode: "agent-registration-preview",
    agent,
    persisted: false,
    productionWrites: false,
    message: "Agent validated successfully. Persistence remains disabled until a control-plane store is configured.",
  });
}
