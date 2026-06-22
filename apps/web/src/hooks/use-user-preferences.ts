"use client";

import { useCallback, useEffect, useState } from "react";
import type { RoomSettings } from "@together/shared";
import { THEME_ACCENTS, THEME_PRESETS } from "@together/shared";
import { applyUserTheme } from "@/components/room-settings";

export type UserPreferences = {
  theme: RoomSettings["theme"];
  audioOnly: boolean;
  quality: RoomSettings["quality"];
};

const STORAGE_KEY = "together_user_prefs";

const DEFAULTS: UserPreferences = {
  theme: "midnight",
  audioOnly: false,
  quality: "auto",
};

function readStored(): UserPreferences {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    const theme = THEME_PRESETS.includes(parsed.theme as UserPreferences["theme"])
      ? (parsed.theme as UserPreferences["theme"])
      : DEFAULTS.theme;
    return {
      theme,
      audioOnly: parsed.audioOnly ?? DEFAULTS.audioOnly,
      quality: parsed.quality ?? DEFAULTS.quality,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useUserPreferences() {
  const [prefs, setPrefsState] = useState<UserPreferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = readStored();
    setPrefsState(stored);
    applyUserTheme(stored.theme);
    setLoaded(true);
  }, []);

  const setPrefs = useCallback((patch: Partial<UserPreferences>) => {
    setPrefsState((prev) => {
      const next: UserPreferences = {
        ...prev,
        ...patch,
        ...(patch.theme ? { theme: patch.theme } : {}),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      applyUserTheme(next.theme);
      return next;
    });
  }, []);

  const setTheme = useCallback(
    (theme: UserPreferences["theme"]) => {
      setPrefs({ theme });
    },
    [setPrefs],
  );

  return { prefs, setPrefs, setTheme, loaded, themeAccent: THEME_ACCENTS[prefs.theme] };
}
