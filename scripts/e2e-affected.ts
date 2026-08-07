#!/usr/bin/env tsx
/**
 * Maps changed file globs to Playwright spec files (space-separated stdout).
 * Used by ci-pre-push.sh alongside @smoke tests.
 */
import { execSync } from "node:child_process";

function mergeBase(): string {
  try {
    return execSync("git merge-base HEAD origin/main", { encoding: "utf8" }).trim();
  } catch {
    try {
      return execSync("git merge-base HEAD main", { encoding: "utf8" }).trim();
    } catch {
      return execSync("git rev-parse HEAD~1", { encoding: "utf8" }).trim();
    }
  }
}

function changedFiles(): string[] {
  const base = mergeBase();
  const out = execSync(`git diff --name-only ${base}...HEAD`, { encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

type Rule = { pattern: RegExp; specs: string[] };

const RULES: Rule[] = [
  {
    pattern: /emoji-chat|chat-mentions|chat-/,
    specs: [
      "chat-ephemeral.spec.ts",
      "chat-mentions.spec.ts",
      "chat-bidi.spec.ts",
      "chat-mobile.spec.ts",
    ],
  },
  {
    pattern: /room-client|now-playing|playback/,
    specs: [
      "room.spec.ts",
      "now-playing-bar.spec.ts",
      "playback-two-clients.spec.ts",
      "playback-sync.spec.ts",
    ],
  },
  {
    pattern: /queue|request/,
    specs: ["queue-toasts.spec.ts", "queue-reorder.spec.ts", "mobile-queue.spec.ts"],
  },
  { pattern: /participants/, specs: ["participants-moderation.spec.ts", "presence.spec.ts"] },
  {
    pattern: /room-settings|settings/,
    specs: ["settings-in-room.spec.ts", "settings-sync.spec.ts"],
  },
  {
    pattern: /import|spotify|soundcloud|youtube/,
    specs: ["import-public.spec.ts", "spotify-import.spec.ts", "soundcloud-import.spec.ts"],
  },
  { pattern: /admin/, specs: ["admin.spec.ts", "admin-ui.spec.ts"] },
  {
    pattern: /packages\/shared/,
    specs: ["room.spec.ts", "playback-sync.spec.ts", "settings-sync.spec.ts"],
  },
  {
    pattern: /packages\/db\/schema/,
    specs: ["settings-sync.spec.ts", "admin.spec.ts", "internal-snapshot.spec.ts"],
  },
  {
    pattern: /\.github\/workflows\/|playwright\.config/,
    specs: ["**/*.spec.ts"],
  },
];

const files = changedFiles();
const specs = new Set<string>();

for (const file of files) {
  for (const rule of RULES) {
    if (rule.pattern.test(file)) {
      for (const spec of rule.specs) specs.add(spec);
    }
  }
}

if (specs.has("**/*.spec.ts")) {
  process.stdout.write("e2e/**/*.spec.ts");
} else {
  process.stdout.write([...specs].map((s) => `e2e/${s}`).join(" "));
}
