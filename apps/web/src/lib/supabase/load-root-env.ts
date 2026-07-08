import "server-only";

import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

let loaded = false;

function shouldSkipRootEnvLoad(): boolean {
  return process.env.TOGETHER_SKIP_ENV_FILE === "1" || process.env.TOGETHER_E2E === "1";
}

/** Ensure repo-root `.env` is loaded for server code (monorepo layout). */
export function loadRootEnv(): void {
  if (loaded || shouldSkipRootEnvLoad()) return;
  loaded = true;

  const rootEnvFiles = [
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), "../../.env.local"),
  ];

  for (const file of rootEnvFiles) {
    if (existsSync(file)) {
      // Root env wins over empty placeholders in apps/web/.env.local
      config({ path: file, override: true });
    }
  }

  const localEnvFiles = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), ".env.local"),
  ];

  for (const file of localEnvFiles) {
    if (existsSync(file)) {
      config({ path: file, override: false });
    }
  }
}
