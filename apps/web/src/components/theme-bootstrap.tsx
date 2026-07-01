"use client";

import { useEffect } from "react";
import { getThemeVars } from "@together/ui";
import { THEME_PRESETS } from "@together/shared";

const STORAGE_KEY = "together_user_prefs";

/** Apply stored personal theme on every page (home, playlists, etc.), not only in rooms. */
export function ThemeBootstrap() {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { theme?: string; reducedMotion?: boolean };
      let theme = parsed.theme;
      if (theme === "contrast") theme = "high-contrast";
      if (!theme || !THEME_PRESETS.includes(theme as (typeof THEME_PRESETS)[number])) {
        return;
      }
      const vars = getThemeVars(theme);
      for (const [key, value] of Object.entries(vars)) {
        document.documentElement.style.setProperty(key, value);
      }
      if (parsed.reducedMotion) {
        document.documentElement.dataset.reducedMotion = "true";
      }
    } catch {
      // ignore corrupt local storage
    }
  }, []);

  return null;
}
