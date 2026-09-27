export function integrationLabel(state) {
  if (state.configured && state.connected) return "CONNECTED";
  if (!state.configured && !state.connected) return "NOT CONFIGURED";
  return "ERROR";
}
