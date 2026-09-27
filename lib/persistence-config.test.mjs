import test from "node:test";
import assert from "node:assert/strict";
import { getPersistenceConfig } from "./persistence-config.mjs";

test("persistence is not configured when dedicated credentials are absent", () => {
  const result = getPersistenceConfig({});
  assert.deepEqual(result, {
    state: "not-configured",
    provider: "none",
    ready: false,
    reason: "Dedicated Agent Hub Supabase credentials are not configured.",
  });
});

test("persistence is misconfigured when only one dedicated credential exists", () => {
  const result = getPersistenceConfig({
    AGENT_HUB_SUPABASE_URL: "https://example.supabase.co",
  });
  assert.equal(result.state, "misconfigured");
  assert.equal(result.provider, "supabase");
  assert.equal(result.ready, false);
});

test("persistence is configured only when both dedicated credentials exist", () => {
  const result = getPersistenceConfig({
    AGENT_HUB_SUPABASE_URL: "https://example.supabase.co",
    AGENT_HUB_SUPABASE_SERVER_KEY: "server-secret",
  });
  assert.deepEqual(result, {
    state: "configured",
    provider: "supabase",
    ready: true,
    reason: "Dedicated Agent Hub Supabase credentials are configured.",
  });
});
