"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface EmojiPickerButtonProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPickerButton({ onSelect }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => setMounted(true), []);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const pickerWidth = 352;
    const pickerHeight = 435;
    let left = rect.left;
    let top = rect.top - pickerHeight - 8;

    if (left + pickerWidth > window.innerWidth - 8) {
      left = window.innerWidth - pickerWidth - 8;
    }
    if (left < 8) left = 8;
    if (top < 8) {
      top = rect.bottom + 8;
    }

    setPosition({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || pickerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    window.addEventListener("resize", updatePosition);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) updatePosition();
        }}
        className="rounded-lg px-2 py-1 text-lg hover:bg-[var(--bg-secondary)]"
        aria-label="Open emoji picker"
        aria-expanded={open}
      >
        😀
      </button>
      {mounted &&
        open &&
        createPortal(
          <div
            ref={pickerRef}
            className="fixed z-[200]"
            style={{ top: position.top, left: position.left }}
          >
            <Picker
              data={data}
              onEmojiSelect={(emoji: { native: string }) => {
                onSelect(emoji.native);
                setOpen(false);
              }}
              theme="dark"
            />
          </div>,
          document.body,
        )}
    </>
  );
}

export function ChatInput({
  onSend,
  slowModeSeconds = 0,
  lastChatAt = 0,
}: {
  onSend: (body: string) => void;
  slowModeSeconds?: number;
  lastChatAt?: number;
}) {
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (slowModeSeconds <= 0 || lastChatAt <= 0) return;
    const remaining = slowModeSeconds * 1000 - (Date.now() - lastChatAt);
    if (remaining <= 0) return;

    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [slowModeSeconds, lastChatAt]);

  const cooldownRemaining =
    slowModeSeconds > 0
      ? Math.max(0, slowModeSeconds * 1000 - (now - lastChatAt))
      : 0;
  const slowModeActive = cooldownRemaining > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = message.trim();
    if (!body || slowModeActive) return;
    onSend(body);
    setMessage("");
  };

  const appendEmoji = (emoji: string) => {
    if (slowModeActive) return;
    setMessage((prev) => prev + emoji);
  };

  return (
    <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-2 border-t border-[var(--border)] p-3">
      <EmojiPickerButton onSelect={appendEmoji} />
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={
          slowModeActive
            ? `Slow mode: ${Math.ceil(cooldownRemaining / 1000)}s`
            : "Type a message..."
        }
        disabled={slowModeActive}
        maxLength={2000}
        className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!message.trim() || slowModeActive}
        className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}
