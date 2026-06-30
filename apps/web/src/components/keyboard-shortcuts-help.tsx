"use client";

import { Button } from "@together/ui";
import { X } from "lucide-react";

const SHORTCUTS = [
  { keys: "Space", action: "Play / pause" },
  { keys: "← / →", action: "Seek ±5 seconds" },
  { keys: "N", action: "Skip / vote skip" },
  { keys: "/", action: "Focus add URL input" },
  { keys: "?", action: "Show this help" },
];

interface KeyboardShortcutsHelpProps {
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ onClose }: KeyboardShortcutsHelpProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--bg)] p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Keyboard shortcuts"
        data-testid="keyboard-shortcuts-help"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <ul className="space-y-2 text-sm">
          {SHORTCUTS.map(({ keys, action }) => (
            <li key={keys} className="flex items-center justify-between gap-4">
              <span className="text-[var(--text-muted)]">{action}</span>
              <kbd className="rounded border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-0.5 font-mono text-xs">
                {keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
