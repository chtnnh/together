"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import type { ChatMessage, Participant } from "@together/shared";

function renderMessageBody(body: string, currentParticipantId?: string, participants: Participant[] = []) {
  if (!body.includes("@") || participants.length === 0) return body;

  const namesByLength = [...participants]
    .map((p) => p.displayName)
    .sort((a, b) => b.length - a.length);

  const parts: ReactNode[] = [];
  let i = 0;

  while (i < body.length) {
    if (body[i] !== "@") {
      const nextAt = body.indexOf("@", i + 1);
      const end = nextAt === -1 ? body.length : nextAt;
      if (i < end) parts.push(body.slice(i, end));
      i = end;
      continue;
    }

    let matched: Participant | null = null;
    for (const name of namesByLength) {
      const candidate = body.slice(i + 1, i + 1 + name.length);
      if (candidate.toLowerCase() !== name.toLowerCase()) continue;
      const next = body[i + 1 + name.length];
      if (next !== undefined && !/[\s.,!?;:)]/.test(next)) continue;
      matched =
        participants.find((p) => p.displayName.toLowerCase() === name.toLowerCase()) ?? null;
      break;
    }

    if (matched) {
      const isYou = matched.id === currentParticipantId;
      parts.push(
        <span
          key={`${i}-${matched.id}`}
          className={
            isYou
              ? "rounded bg-[var(--accent)]/25 font-medium text-[var(--accent)]"
              : "font-medium text-[var(--accent)]"
          }
        >
          @{matched.displayName}
        </span>,
      );
      i += 1 + matched.displayName.length;
    } else {
      parts.push("@");
      i += 1;
    }
  }

  return parts.length > 0 ? parts : body;
}

export function ChatMessages({
  messages,
  participants = [],
  currentParticipantId,
  joinNotice,
  onDismissJoinNotice,
}: {
  messages: ChatMessage[];
  participants?: Participant[];
  currentParticipantId?: string;
  joinNotice?: string | null;
  onDismissJoinNotice?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinnedToBottomRef = useRef(true);

  useEffect(() => {
    if (!joinNotice) return;
    const id = setTimeout(() => onDismissJoinNotice?.(), 30000);
    return () => clearTimeout(id);
  }, [joinNotice, onDismissJoinNotice]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedToBottomRef.current = distanceFromBottom < 48;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !pinnedToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2"
    >
      {joinNotice ? (
        <p role="status" className="text-xs text-[var(--text-muted)]">
          {joinNotice}
        </p>
      ) : null}
      {messages.length === 0 && !joinNotice ? (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">
          No messages yet. Say hi!
        </p>
      ) : null}
      {messages.map((msg) => {
        const mentionedYou =
          !!currentParticipantId &&
          participants.some(
            (p) =>
              p.id === currentParticipantId &&
              msg.body.toLowerCase().includes(`@${p.displayName.toLowerCase()}`),
          );

        return (
          <div
            key={msg.id}
            className={`text-sm ${mentionedYou ? "rounded-md bg-[var(--accent)]/10 px-2 py-1" : ""}`}
          >
            <span className="font-medium text-[var(--accent)]">{msg.senderName}</span>
            <span className="mx-1 text-[var(--text-muted)]">·</span>
            <span>{renderMessageBody(msg.body, currentParticipantId, participants)}</span>
          </div>
        );
      })}
    </div>
  );
}

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
  participants = [],
}: {
  onSend: (body: string) => void;
  slowModeSeconds?: number;
  lastChatAt?: number;
  participants?: Participant[];
}) {
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const mentionMatches =
    mentionQuery === null
      ? []
      : participants
          .filter((p) =>
            mentionQuery === ""
              ? true
              : p.displayName.toLowerCase().includes(mentionQuery.toLowerCase()),
          )
          .slice(0, 8);

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionQuery, mentionMatches.length]);

  const updateMentionQuery = (value: string, cursor: number) => {
    const before = value.slice(0, cursor);
    const at = before.lastIndexOf("@");
    if (at === -1 || (at > 0 && !/\s/.test(before[at - 1]!))) {
      setMentionQuery(null);
      return;
    }
    const query = before.slice(at + 1);
    if (/\s/.test(query)) {
      setMentionQuery(null);
      return;
    }
    setMentionQuery(query);
  };

  const insertMention = (name: string) => {
    const input = inputRef.current;
    if (!input) return;
    const cursor = input.selectionStart ?? message.length;
    const before = message.slice(0, cursor);
    const after = message.slice(cursor);
    const at = before.lastIndexOf("@");
    if (at === -1) return;
    const next = `${before.slice(0, at)}@${name} ${after}`;
    setMessage(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const pos = at + name.length + 2;
      input.setSelectionRange(pos, pos);
      input.focus();
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = message.trim();
    if (!body || slowModeActive) return;
    onSend(body);
    setMessage("");
    setMentionQuery(null);
  };

  const appendEmoji = (emoji: string) => {
    if (slowModeActive) return;
    setMessage((prev) => prev + emoji);
  };

  const mentionOpen = mentionQuery !== null && mentionMatches.length > 0;

  return (
    <form onSubmit={handleSubmit} className="relative flex shrink-0 items-center gap-2 border-t border-[var(--border)] p-3">
      <EmojiPickerButton onSelect={appendEmoji} />
      <input
        ref={inputRef}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          updateMentionQuery(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={(e) => {
          if (mentionOpen) {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setMentionIndex((i) => (i + 1) % mentionMatches.length);
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setMentionIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              const pick = mentionMatches[mentionIndex];
              if (pick) insertMention(pick.displayName);
              return;
            }
          }
          if (e.key === "Escape") setMentionQuery(null);
        }}
        placeholder={
          slowModeActive
            ? `Slow mode: ${Math.ceil(cooldownRemaining / 1000)}s`
            : "Type a message… (@ to mention)"
        }
        disabled={slowModeActive}
        maxLength={2000}
        className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
        aria-autocomplete={mentionOpen ? "list" : undefined}
        aria-controls={mentionOpen ? "mention-listbox" : undefined}
        aria-expanded={mentionOpen}
      />
      <button
        type="submit"
        disabled={!message.trim() || slowModeActive}
        className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Send
      </button>
      {mentionOpen && (
        <ul
          id="mention-listbox"
          role="listbox"
          className="absolute bottom-full left-12 z-10 mb-1 max-h-40 w-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] py-1 shadow-lg"
        >
          {mentionMatches.map((p, index) => (
            <li key={p.id} role="option" aria-selected={index === mentionIndex}>
              <button
                type="button"
                className={`flex w-full px-3 py-1.5 text-left text-sm ${
                  index === mentionIndex
                    ? "bg-[var(--accent)]/20 text-[var(--text)]"
                    : "hover:bg-[var(--bg)]"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(p.displayName);
                }}
                onMouseEnter={() => setMentionIndex(index)}
              >
                @{p.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
