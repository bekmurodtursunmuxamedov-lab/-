import test from "node:test";
import assert from "node:assert/strict";
import { integrationLabel } from "./integration-status.mjs";

test("marks a connected adapter", () => {
  assert.equal(integrationLabel({ configured: true, connected: true }), "CONNECTED");
});

test("distinguishes missing configuration", () => {
  assert.equal(integrationLabel({ configured: false, connected: false }), "NOT CONFIGURED");
});

test("marks configured but failing adapter", () => {
  assert.equal(integrationLabel({ configured: true, connected: false }), "ERROR");
});
