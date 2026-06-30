import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.join(__dirname, "../../..");

function readWorkflow(name: string): string {
  return fs.readFileSync(path.join(repoRoot, ".github/workflows", name), "utf8");
}

test.describe("Phase 1.1 — CI auto-deploy", () => {
  test("deploy workflow runs after CI succeeds on main", () => {
    const deploy = readWorkflow("deploy.yml");
    expect(deploy).toContain("workflow_run");
    expect(deploy).toContain('workflows: ["CI"]');
    expect(deploy).toContain("branches: [main]");
    expect(deploy).toContain("@together/realtime run deploy");
    expect(deploy).toContain("environment: production");
    expect(deploy).toContain("CLOUDFLARE_API_TOKEN");
  });

  test("CI workflow runs typecheck, lint, and Playwright tests", () => {
    const ci = readWorkflow("ci.yml");
    expect(ci).toContain("pnpm typecheck");
    expect(ci).toContain("pnpm lint");
    expect(ci).toContain("pnpm --filter @together/web test");
  });
});
