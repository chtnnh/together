import { THEME_ACCENTS } from "@together/shared";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(ms?: number): string {
  if (!ms) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export function getThemeVars(
  theme: string,
  accent?: string,
): Record<string, string> {
  const themes: Record<string, Record<string, string>> = {
    midnight: {
      "--bg": "#0f0f14",
      "--bg-secondary": "#1a1a24",
      "--text": "#f4f4f5",
      "--text-muted": "#a1a1aa",
      "--border": "#27272a",
    },
    ocean: {
      "--bg": "#0a1628",
      "--bg-secondary": "#122240",
      "--text": "#e0f2fe",
      "--text-muted": "#7dd3fc",
      "--border": "#1e3a5f",
    },
    sunset: {
      "--bg": "#1a0f0f",
      "--bg-secondary": "#2d1810",
      "--text": "#fef3c7",
      "--text-muted": "#fbbf24",
      "--border": "#451a03",
    },
    forest: {
      "--bg": "#0a1a0f",
      "--bg-secondary": "#142818",
      "--text": "#ecfdf5",
      "--text-muted": "#6ee7b7",
      "--border": "#14532d",
    },
    lavender: {
      "--bg": "#13101a",
      "--bg-secondary": "#1e1830",
      "--text": "#f5f3ff",
      "--text-muted": "#c4b5fd",
      "--border": "#312e81",
    },
    "high-contrast": {
      "--bg": "#000000",
      "--bg-secondary": "#0a0a0a",
      "--text": "#ffffff",
      "--text-muted": "#d4d4d4",
      "--border": "#ffffff",
    },
  };

  const base = themes[theme] ?? themes.midnight!;
  const resolvedAccent =
    accent ??
    THEME_ACCENTS[theme as keyof typeof THEME_ACCENTS] ??
    THEME_ACCENTS.midnight;
  return { ...base, "--accent": resolvedAccent };
}
