import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("db schema journal", () => {
  it("lists every SQL migration in the drizzle journal", () => {
    const journal = JSON.parse(readFileSync(join(root, "drizzle/meta/_journal.json"), "utf8")) as {
      entries: { tag: string }[];
    };
    expect(journal.entries.length).toBeGreaterThan(0);

    for (const entry of journal.entries) {
      const sqlPath = join(root, "drizzle", `${entry.tag}.sql`);
      expect(() => readFileSync(sqlPath, "utf8")).not.toThrow();
    }
  });
});
