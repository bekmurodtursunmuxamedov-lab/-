import { execFileSync } from "node:child_process";
import test from "node:test";

test("TypeScript build contract compiles without errors", () => {
  execFileSync("npx", ["tsc", "--noEmit", "--pretty", "false"], {
    stdio: "pipe",
    encoding: "utf8",
  });
});
