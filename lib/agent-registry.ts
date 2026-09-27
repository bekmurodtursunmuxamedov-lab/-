export type AgentRecord = {
  id: string;
  name: string;
  role: string;
  target: string;
  status: "active" | "planned" | "paused";
  capabilities: string[];
  protected: string[];
};

const protectedAreas = ["constructor", "production DB", "auth", "payments", "orders"];

export const defaultAgents: AgentRecord[] = [
  {
    id: "printshop-engineer",
    name: "PRINTSHOP Engineer",
    role: "Autonomous web engineer",
    target: "bekmurodtursunmuxamedov-lab/print-style-uz",
    status: "active",
    capabilities: ["inspect", "security", "repair", "preview", "draft-pr"],
    protected: protectedAreas,
  },
];

export function normalizeAgent(input: Partial<AgentRecord>): AgentRecord | null {
  const id = typeof input.id === "string" ? input.id.trim() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const target = typeof input.target === "string" ? input.target.trim() : "";
  if (!/^[a-z0-9][a-z0-9-]{1,50}$/.test(id) || !name || !target) return null;

  return {
    id,
    name,
    role: typeof input.role === "string" && input.role.trim() ? input.role.trim() : "custom agent",
    target,
    status: input.status === "paused" ? "paused" : input.status === "active" ? "active" : "planned",
    capabilities: Array.isArray(input.capabilities) ? input.capabilities.filter((v): v is string => typeof v === "string").slice(0, 20) : ["inspect", "plan", "verify"],
    protected: protectedAreas,
  };
}
