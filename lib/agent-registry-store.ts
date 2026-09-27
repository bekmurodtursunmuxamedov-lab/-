import { defaultAgents, normalizeAgent, type AgentRecord } from "./agent-registry";

const memory = new Map<string, AgentRecord>(
  defaultAgents.map((agent) => [agent.id, agent]),
);

export function listAgents(): AgentRecord[] {
  return Array.from(memory.values());
}

export function getAgent(id: string): AgentRecord | null {
  return memory.get(id) ?? null;
}

export function registerAgent(input: Partial<AgentRecord>): AgentRecord | null {
  const agent = normalizeAgent(input);
  if (!agent || memory.has(agent.id)) return null;
  memory.set(agent.id, agent);
  return agent;
}

export function setAgentStatus(
  id: string,
  status: AgentRecord["status"],
): AgentRecord | null {
  const agent = memory.get(id);
  if (!agent) return null;
  const updated = { ...agent, status };
  memory.set(id, updated);
  return updated;
}

export function isRegisteredAgent(id: string): boolean {
  return memory.has(id);
}
