/** Load monorepo root .env before Next.js starts (pnpm dev from apps/web). */
const path = require("node:path");
const { config } = require("dotenv");

if (process.env.TOGETHER_SKIP_ENV_FILE !== "1" && process.env.TOGETHER_E2E !== "1") {
  const root = path.join(__dirname, "../../..");
  config({ path: path.join(root, ".env"), override: true });
  config({ path: path.join(root, ".env.local"), override: true });
}
