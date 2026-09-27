export type AgentEventType =
  | "incident.detected"
  | "task.queued"
  | "task.started"
  | "task.completed"
  | "task.failed";

export type AgentEvent = {
  id: string;
  type: AgentEventType;
  agentId: string;
  taskId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export declare function emitEvent(input: {
  type: AgentEventType;
  agentId: string;
  taskId?: string;
  payload?: Record<string, unknown>;
}): AgentEvent;

export declare function listEvents(agentId?: string, type?: AgentEventType): AgentEvent[];
export declare function clearEvents(): void;
