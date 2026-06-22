import fs from "node:fs";
import path from "node:path";

let cachedKey: string | null | undefined;

function parseEnvValue(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readKeyFromFile(envPath: string): string | null {
  try {
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = parseEnvValue(trimmed.slice(eq + 1));
      if (key === "YOUTUBE_API_KEY" && value) return value;
    }
  } catch {
    // try next candidate
  }
  return null;
}

function readKeyFromEnvFiles(): string | null {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "../../.env.local"),
    path.join(cwd, "../../.env"),
    path.join(cwd, "../.env.local"),
    path.join(cwd, "../.env"),
    path.join(cwd, ".env.local"),
    path.join(cwd, ".env"),
  ];

  for (const envPath of candidates) {
    const key = readKeyFromFile(envPath);
    if (key) return key;
  }
  return null;
}

/** Resolve YOUTUBE_API_KEY from process.env or monorepo .env files. */
export function getYouTubeApiKey(): string | null {
  if (process.env.TOGETHER_SKIP_ENV_FILE === "1") {
    const fromProcess = process.env.YOUTUBE_API_KEY?.trim();
    return fromProcess || null;
  }

  const fromProcess = process.env.YOUTUBE_API_KEY?.trim();
  if (fromProcess) return fromProcess;

  if (cachedKey !== undefined) return cachedKey;

  cachedKey = readKeyFromEnvFiles();
  return cachedKey;
}
