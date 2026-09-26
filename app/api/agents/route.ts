import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Agent = {
  id: string;
  name: string;
  role: string;
  target: string;
  status: "active" | "planned";
  capabilities: string[];
};

const agents: Agent[] = [
  {
    id: "printshop-engineer",
    name: "PRINTSHOP Engineer",
    role: "Autonomous web engineer",
    target: "bekmurodtursunmuxamedov-lab/print-style-uz",
    status: "active",
    capabilities: ["inspect", "security", "repair", "preview", "draft-pr"],
  },
];

export async function GET() {
  return NextResponse.json({ ok: true, agents, count: agents.length, productionWrites: false });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const target = typeof body.target === "string" ? body.target.trim() : "";

  if (!id || !name || !target) return NextResponse.json({ ok: false, error: "id, name and target are required" }, { status: 400 });
  if (!/^[a-z0-9][a-z0-9-]{1,50}$/.test(id)) return NextResponse.json({ ok: false, error: "unsafe agent id" }, { status: 400 });

  return NextResponse.json({
    ok: true,
    mode: "agent-registration-preview",
    agent: { id, name, role: "custom agent", target, status: "planned", capabilities: ["inspect", "plan", "verify"] },
    persisted: false,
    productionWrites: false,
    message: "Registration schema is ready; persistent storage is the next control-plane step.",
  });
}