import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { config } from "dotenv";
import { execSync } from "node:child_process";
import { lookup } from "node:dns/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

function findRepoRoot(startDir) {
  let dir = startDir;
  while (true) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not find monorepo root (pnpm-workspace.yaml)");
}

function normalizeDatabaseUrl(url) {
  if (url.includes("supabase.co") && !url.includes("sslmode=")) {
    return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
  }
  return url;
}

function hostnameFromDatabaseUrl(url) {
  return new URL(url.replace(/^postgresql:/i, "http:")).hostname;
}

async function assertReachableSupabaseHost(url) {
  const host = hostnameFromDatabaseUrl(url);
  if (!host.endsWith(".supabase.co")) return;

  const isDirectHost = host.startsWith("db.") && host.endsWith(".supabase.co");
  if (!isDirectHost) return;

  let hasIpv4 = false;
  let hasIpv6 = false;
  try {
    await lookup(host, { family: 4 });
    hasIpv4 = true;
  } catch {
    // no A record
  }
  try {
    await lookup(host, { family: 6 });
    hasIpv6 = true;
  } catch {
    // no AAAA record
  }

  if (!hasIpv4 && hasIpv6) {
    console.error(`\n${host} is IPv6-only. This network cannot reach it (EHOSTUNREACH).\n`);
    console.error("Use the Session pooler URI for migrations (port 5432):");
    console.error("  Supabase → Settings → Database → Connection string");
    console.error('  Mode: "Session pooler" (NOT Transaction / port 6543)\n');
    console.error("Example shape:");
    console.error(
      "  postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres\n",
    );
    console.error("Put that in .env as DATABASE_URL, run pnpm db:migrate, then switch");
    console.error("Vercel to the Transaction pooler (port 6543) for the app runtime.\n");
    process.exit(1);
  }
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = findRepoRoot(scriptDir);

function loadEnvFiles() {
  const envFile = process.env.ENV_FILE?.trim() || ".env";
  config({ path: resolve(rootDir, envFile) });
  if (!process.env.ENV_FILE) {
    config({ path: resolve(rootDir, ".env.local") });
  }
}

loadEnvFiles();

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error(`DATABASE_URL is not set (loaded .env from ${rootDir})`);
  process.exit(1);
}

process.env.DATABASE_URL = normalizeDatabaseUrl(url);
const redacted = process.env.DATABASE_URL.replace(/:[^:@/]+@/, ":***@");
console.log(`→ Database: ${redacted}`);

await assertReachableSupabaseHost(process.env.DATABASE_URL);

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  connect_timeout: 20,
  ssl: process.env.DATABASE_URL.includes("supabase.co") ? "require" : undefined,
});

try {
  await sql`SELECT 1 AS ok`;
  console.log("→ Connection OK\n");
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("\nDatabase connection failed:", message);
  process.exit(1);
} finally {
  await sql.end();
}

try {
  execSync("drizzle-kit migrate", {
    stdio: "inherit",
    cwd: resolve(scriptDir, ".."),
    env: process.env,
  });
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("\nMigration failed:", message);
  process.exit(1);
}
