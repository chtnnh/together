"use client";

import { useEffect } from "react";

interface KeyboardShortcutHandlers {
  enabled: boolean;
  onPlayPause: () => void;
  onSeekBack: () => void;
  onSeekForward: () => void;
  onSkip: () => void;
  onFocusAddUrl: () => void;
  onShowHelp: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function useKeyboardShortcuts({
  enabled,
  onPlayPause,
  onSeekBack,
  onSeekForward,
  onSkip,
  onFocusAddUrl,
  onShowHelp,
}: KeyboardShortcutHandlers) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          onPlayPause();
          break;
        case "ArrowLeft":
          event.preventDefault();
          onSeekBack();
          break;
        case "ArrowRight":
          event.preventDefault();
          onSeekForward();
          break;
        case "n":
        case "N":
          onSkip();
          break;
        case "/":
          event.preventDefault();
          onFocusAddUrl();
          break;
        case "?":
          onShowHelp();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    enabled,
    onFocusAddUrl,
    onPlayPause,
    onSeekBack,
    onSeekForward,
    onShowHelp,
    onSkip,
  ]);
}
