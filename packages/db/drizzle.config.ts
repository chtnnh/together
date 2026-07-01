import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "drizzle-kit";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function loadEnvFiles() {
  const envFile = process.env.ENV_FILE?.trim() || ".env";
  config({ path: resolve(rootDir, envFile) });
  if (!process.env.ENV_FILE) {
    config({ path: resolve(rootDir, ".env.local") });
  }
}

// Load monorepo root .env (drizzle.config.ts lives in packages/db)
loadEnvFiles();

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(`DATABASE_URL is not set (expected .env at ${rootDir})`);
  }
  if (url.includes("supabase.co") && !url.includes("sslmode=")) {
    return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
  }
  return url;
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
