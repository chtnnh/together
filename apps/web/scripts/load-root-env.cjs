/** Load monorepo root .env before Next.js starts (pnpm dev from apps/web). */
const path = require("node:path");
const { config } = require("dotenv");

const root = path.join(__dirname, "../../..");
config({ path: path.join(root, ".env"), override: true });
config({ path: path.join(root, ".env.local"), override: true });
