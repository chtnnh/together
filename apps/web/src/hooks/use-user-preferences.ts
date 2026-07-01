"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomSettings } from "@together/shared";
import { THEME_ACCENTS, THEME_PRESETS } from "@together/shared";
import { applyUserTheme } from "@/components/room-settings";

export type UserPreferences = {
  theme: RoomSettings["theme"];
  audioOnly: boolean;
  quality: RoomSettings["quality"];
  volume: number;
  muted: boolean;
  reducedMotion: boolean;
};

const STORAGE_KEY = "together_user_prefs";

const DEFAULTS: UserPreferences = {
  theme: "midnight",
  audioOnly: false,
  quality: "auto",
  volume: 100,
  muted: false,
  reducedMotion: false,
};

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULTS.volume;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parsePrefs(parsed: Partial<UserPreferences>): UserPreferences {
  let theme = parsed.theme as UserPreferences["theme"];
  if (theme === ("contrast" as UserPreferences["theme"])) {
    theme = "high-contrast";
  }
  const resolvedTheme = THEME_PRESETS.includes(theme) ? theme : DEFAULTS.theme;
  return {
    theme: resolvedTheme,
    audioOnly: parsed.audioOnly ?? DEFAULTS.audioOnly,
    quality: parsed.quality ?? DEFAULTS.quality,
    volume: clampVolume(parsed.volume ?? DEFAULTS.volume),
    muted: parsed.muted ?? DEFAULTS.muted,
    reducedMotion: parsed.reducedMotion ?? DEFAULTS.reducedMotion,
  };
}

function readStored(): UserPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return parsePrefs(JSON.parse(raw) as Partial<UserPreferences>);
  } catch {
    return DEFAULTS;
  }
}

function applyReducedMotion(reduced: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.reducedMotion = reduced ? "true" : "false";
}

export function useUserPreferences(signedIn = false) {
  const [prefs, setPrefsState] = useState<UserPreferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const stored = readStored();
    setPrefsState(stored);
    applyUserTheme(stored.theme);
    applyReducedMotion(stored.reducedMotion);
    setLoaded(true);

    if (!signedIn) return;

    fetch("/api/user/preferences")
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<Partial<UserPreferences>>;
      })
      .then((remote) => {
        if (!remote || Object.keys(remote).length === 0) return;
        setPrefsState((prev) => {
          const next = parsePrefs({ ...prev, ...remote });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          applyUserTheme(next.theme);
          applyReducedMotion(next.reducedMotion);
          return next;
        });
      })
      .catch(() => {
        // offline or unsigned — keep local
      });
  }, [signedIn]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const next = parsePrefs(JSON.parse(event.newValue) as Partial<UserPreferences>);
        setPrefsState(next);
        applyUserTheme(next.theme);
        applyReducedMotion(next.reducedMotion);
      } catch {
        // ignore invalid cross-tab payload
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applySystem = () => {
      if (!prefs.reducedMotion && mq.matches) {
        document.documentElement.dataset.reducedMotion = "system";
      } else {
        applyReducedMotion(prefs.reducedMotion);
      }
    };
    applySystem();
    mq.addEventListener("change", applySystem);
    return () => mq.removeEventListener("change", applySystem);
  }, [prefs.reducedMotion]);

  const setPrefs = useCallback(
    (patch: Partial<UserPreferences>) => {
      setPrefsState((prev) => {
        const next: UserPreferences = parsePrefs({ ...prev, ...patch });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        applyUserTheme(next.theme);
        applyReducedMotion(next.reducedMotion);

        if (signedIn) {
          clearTimeout(syncTimer.current);
          syncTimer.current = setTimeout(() => {
            void fetch("/api/user/preferences", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(next),
            });
          }, 400);
        }

        return next;
      });
    },
    [signedIn],
  );

  const setTheme = useCallback(
    (theme: UserPreferences["theme"]) => {
      setPrefs({ theme });
    },
    [setPrefs],
  );

  return { prefs, setPrefs, setTheme, loaded, themeAccent: THEME_ACCENTS[prefs.theme] };
}
