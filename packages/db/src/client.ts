import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb(databaseUrl?: string) {
  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!client) {
    client = postgres(url, {
      prepare: false,
      ssl: url.includes("supabase.co") ? "require" : undefined,
    });
    db = drizzle(client, { schema });
  }

  return db!;
}

export function closeDb() {
  if (client) {
    void client.end();
    client = null;
    db = null;
  }
}

export { schema };
