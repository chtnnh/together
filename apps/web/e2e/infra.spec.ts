import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.join(__dirname, "../../..");

function readWorkflow(name: string): string {
  return fs.readFileSync(path.join(repoRoot, ".github/workflows", name), "utf8");
}

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test.describe("Phase 1.1 — CI and deploy", () => {
  test("realtime and web deploy via Git integrations, not deploy.yml", () => {
    const deployWorkflow = path.join(repoRoot, ".github/workflows/deploy.yml");
    expect(fs.existsSync(deployWorkflow)).toBe(false);

    const ci = readWorkflow("ci.yml");
    expect(ci).toContain("Cloudflare Workers Git integration");
    expect(ci).toContain("Vercel Git integration");

    const wrangler = readRepoFile("services/realtime/wrangler.toml");
    expect(wrangler).toContain("[env.production]");
    expect(wrangler).toContain('name = "together-realtime-production"');
    expect(wrangler).toContain("realtime.together.chtnnhfoundation.org");
    expect(wrangler).toContain("pnpm run build:realtime");
    expect(wrangler).toContain("pnpm run deploy:realtime");
    expect(wrangler).toContain("ROOM_TOKEN_SECRET");

    const rootPkg = JSON.parse(readRepoFile("package.json")) as {
      scripts?: Record<string, string>;
    };
    expect(rootPkg.scripts?.["build:realtime"]).toContain("@together/realtime");
    expect(rootPkg.scripts?.["deploy:realtime"]).toContain("wrangler deploy --env production");

    const realtimePkg = JSON.parse(readRepoFile("services/realtime/package.json")) as {
      scripts?: Record<string, string>;
    };
    expect(realtimePkg.scripts?.build).toBeTruthy();
    expect(realtimePkg.scripts?.deploy).toContain("wrangler deploy --env production");
  });

  test("CI workflow runs typecheck, lint, and Playwright tests", () => {
    const ci = readWorkflow("ci.yml");
    expect(ci).toContain("pnpm typecheck");
    expect(ci).toContain("pnpm lint");
    expect(ci).toContain("pnpm --filter @together/web test");
  });
});
