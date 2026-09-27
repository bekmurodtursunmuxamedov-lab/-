import { execFileSync } from "node:child_process";
import test from "node:test";

test("TypeScript build contract compiles without errors", () => {
  try {
    execFileSync("npx", ["tsc", "--noEmit", "--pretty", "false"], {
      stdio: "pipe",
      encoding: "utf8",
    });
  } catch (error) {
    const stdout = error?.stdout ? String(error.stdout) : "";
    const stderr = error?.stderr ? String(error.stderr) : "";
    throw new Error(`TypeScript check failed.\n${stdout}${stderr}`);
  }
});
