export type AgentStatus = "online" | "offline" | "setup";

export type ManagedAgent = {
  id: string;
  name: string;
  role: string;
  description: string;
  status: AgentStatus;
  target?: string;
  capabilities: string[];
  protectedAreas?: string[];
};

export const AGENTS: ManagedAgent[] = [
  {
    id: "printshop-engineer",
    name: "PRINTSHOP Engineer",
    role: "AI Developer",
    description: "Управляет разработкой существующего PRINTSHOP через безопасный GitHub → CI → Vercel workflow.",
    status: "online",
    target: "bekmurodtursunmuxamedov-lab/print-style-uz",
    capabilities: ["Inspect", "Fix", "Improve", "Deploy"],
    protectedAreas: ["constructor", "production DB", "auth", "payments", "orders"]
  }
];

export function getAgent(id: string) {
  return AGENTS.find((agent) => agent.id === id);
}
