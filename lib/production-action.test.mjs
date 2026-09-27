import test from "node:test";
import assert from "node:assert/strict";
import { productionActionAllowed } from "./production-action.mjs";

test("production action is blocked without explicit confirmation", () => {
  assert.equal(productionActionAllowed(false), false);
});

test("production action is allowed only with boolean true", () => {
  assert.equal(productionActionAllowed(true), true);
  assert.equal(productionActionAllowed("true"), false);
});
