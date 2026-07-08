import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type PgClient = ReturnType<typeof postgres>;
type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as typeof globalThis & {
  __togetherPgClient?: PgClient;
  __togetherDb?: Db;
};

export function getDb(databaseUrl?: string) {
  const url = databaseUrl ?? process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!globalForDb.__togetherPgClient) {
    globalForDb.__togetherPgClient = postgres(url, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      ssl: url.includes("supabase.co") ? "require" : undefined,
    });
    globalForDb.__togetherDb = drizzle(globalForDb.__togetherPgClient, { schema });
  }

  return globalForDb.__togetherDb!;
}

export function closeDb() {
  if (globalForDb.__togetherPgClient) {
    void globalForDb.__togetherPgClient.end();
    globalForDb.__togetherPgClient = undefined;
    globalForDb.__togetherDb = undefined;
  }
}

export { schema };
