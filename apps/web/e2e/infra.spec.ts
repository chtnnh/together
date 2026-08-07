import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

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
    expect(rootPkg.scripts?.["ci:local"]).toContain("ci-local.sh");
    expect(rootPkg.scripts?.["ci:pre-commit"]).toBeTruthy();
    expect(rootPkg.scripts?.["ci:pre-push"]).toBeTruthy();
  });

  test("CI workflow runs merge gate jobs and uploads Playwright artifacts", () => {
    const ci = readWorkflow("ci.yml");
    expect(ci).toContain("pnpm ci:quality");
    expect(ci).toContain("pnpm ci:build");
    expect(ci).toContain("pnpm ci:unit");
    expect(ci).toContain("pnpm ci:e2e");
    expect(ci).toContain("pnpm ci:visual");
    expect(ci).toContain("pnpm ci:db");
    expect(ci).toContain("actions/upload-artifact@v4");
    expect(ci).toContain("playwright-report");
    expect(ci).toContain("test-results");
  });

  test("Biome is the linter", () => {
    expect(fs.existsSync(path.join(repoRoot, "biome.json"))).toBe(true);
    const rootPkg = JSON.parse(readRepoFile("package.json")) as {
      scripts?: Record<string, string>;
    };
    expect(rootPkg.scripts?.lint).toContain("biome");
  });
});
