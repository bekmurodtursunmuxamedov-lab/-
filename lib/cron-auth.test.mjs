import test from "node:test";
import assert from "node:assert/strict";
import { isAuthorizedCronRequest } from "./cron-auth.mjs";

test("rejects cron requests when secret is not configured", () => {
  assert.equal(isAuthorizedCronRequest("Bearer anything", undefined), false);
});

test("rejects a wrong cron token", () => {
  assert.equal(isAuthorizedCronRequest("Bearer wrong", "expected"), false);
});

test("accepts only the exact bearer token", () => {
  assert.equal(isAuthorizedCronRequest("Bearer expected", "expected"), true);
});
