const MAX_EVENTS = 200;
const events = [];

export function emitEvent(input) {
  const event = {
    id: crypto.randomUUID(),
    type: input.type,
    agentId: input.agentId,
    taskId: input.taskId,
    payload: input.payload ?? {},
    createdAt: new Date().toISOString(),
  };
  events.unshift(event);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  return event;
}

export function listEvents(agentId, type) {
  return events
    .filter((event) => (!agentId || event.agentId === agentId) && (!type || event.type === type))
    .map((event) => ({ ...event, payload: { ...event.payload } }));
}

export function clearEvents() {
  events.length = 0;
}
