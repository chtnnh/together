"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@together/ui";
import { THEME_PRESETS } from "@together/shared";
import type { UserPreferences } from "@/hooks/use-user-preferences";

function themeLabel(theme: (typeof THEME_PRESETS)[number]): string {
  if (theme === "high-contrast") return "High contrast";
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}

interface ThemeSelectorProps {
  value: UserPreferences["theme"];
  onChange: (theme: NonNullable<UserPreferences["theme"]>) => void;
}

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <Select value={value ?? "midnight"} onValueChange={(v) => onChange(v as NonNullable<UserPreferences["theme"]>)}>
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {THEME_PRESETS.map((theme) => (
          <SelectItem key={theme} value={theme}>
            {themeLabel(theme)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
