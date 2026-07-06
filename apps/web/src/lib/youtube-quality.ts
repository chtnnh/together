import type { UserPreferences } from "@/hooks/use-user-preferences";

const YT_QUALITY_ORDER = [
  "highres",
  "hd2160",
  "hd1440",
  "hd1080",
  "hd720",
  "large",
  "medium",
  "small",
  "tiny",
] as const;

const YT_QUALITY_HEIGHT: Record<string, number> = {
  highres: 2160,
  hd2160: 2160,
  hd1440: 1440,
  hd1080: 1080,
  hd720: 720,
  large: 480,
  medium: 360,
  small: 240,
  tiny: 144,
};

export function getEffectiveDisplayCapPx(): number {
  if (typeof window === "undefined") return 1080;
  const px = Math.round(window.screen.width * window.devicePixelRatio);
  return Math.min(Math.max(px, 144), 2160);
}

export function getMaxQualityCapPx(): number {
  const displayCap = getEffectiveDisplayCapPx();
  return displayCap <= 1080 ? 1080 : displayCap;
}

export function pickBestAvailableQuality(
  available: string[],
  pref: UserPreferences["quality"],
): string | null {
  if (!available.length) return null;

  const ordered = YT_QUALITY_ORDER.filter((q) => available.includes(q));
  if (!ordered.length) return available[0] ?? null;

  if (pref === "max") {
    const cap = getMaxQualityCapPx();
    const withinCap = ordered.filter((q) => (YT_QUALITY_HEIGHT[q] ?? 0) <= cap);
    return withinCap[0] ?? ordered[ordered.length - 1] ?? null;
  }

  const targetMap: Record<string, string> = {
    "1080p": "hd1080",
    "720p": "hd720",
    "480p": "large",
    "144p": "tiny",
  };

  const target = pref ? targetMap[pref] : null;
  if (target && available.includes(target)) return target;

  if (target) {
    const targetHeight = YT_QUALITY_HEIGHT[target] ?? 0;
    const atOrBelow = ordered.filter((q) => (YT_QUALITY_HEIGHT[q] ?? 0) <= targetHeight);
    if (atOrBelow.length) return atOrBelow[0]!;
  }

  return ordered[0] ?? null;
}

export function qualityPreferenceToYoutubeQuality(pref: UserPreferences["quality"]): string | null {
  if (!pref || pref === "auto" || pref === "max") return null;
  const map: Record<string, string> = {
    "1080p": "hd1080",
    "720p": "hd720",
    "480p": "large",
    "144p": "tiny",
  };
  return map[pref] ?? null;
}
