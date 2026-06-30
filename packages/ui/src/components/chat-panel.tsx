import type { ChatMessage } from "@together/shared";
import { formatDuration } from "../lib/utils";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (body: string) => void;
  slowModeSeconds?: number;
  lastChatAt?: number;
}

export function ChatPanel({ messages, onSend, slowModeSeconds = 0, lastChatAt = 0 }: ChatPanelProps) {
  const now = Date.now();
  const cooldownRemaining =
    slowModeSeconds > 0
      ? Math.max(0, slowModeSeconds * 1000 - (now - lastChatAt))
      : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <span className="font-medium text-[var(--accent)]">{msg.senderName}</span>
              <span className="mx-1 text-[var(--text-muted)]">·</span>
              <span className="break-words">{msg.body}</span>
            </div>
          ))
        )}
      </div>
      <form
        className="border-t border-[var(--border)] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const input = form.elements.namedItem("message") as HTMLInputElement;
          const body = input.value.trim();
          if (!body || cooldownRemaining > 0) return;
          onSend(body);
          input.value = "";
        }}
      >
        <div className="flex gap-2">
          <input
            name="message"
            placeholder={
              cooldownRemaining > 0
                ? `Slow mode: wait ${Math.ceil(cooldownRemaining / 1000)}s`
                : "Type a message..."
            }
            disabled={cooldownRemaining > 0}
            maxLength={2000}
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={cooldownRemaining > 0}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export function SkipVoteBar({
  voteCount,
  required,
  hasVoted,
  onVote,
}: {
  voteCount: number;
  required: number;
  hasVoted: boolean;
  onVote: () => void;
}) {
  const pct = required > 0 ? Math.min(100, (voteCount / required) * 100) : 0;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span>Skip votes: {voteCount} / {required}</span>
        <button
          onClick={onVote}
          disabled={hasVoted}
          className="rounded-md bg-red-600/20 px-3 py-1 text-xs text-red-400 hover:bg-red-600/30 disabled:opacity-50"
        >
          {hasVoted ? "Voted" : "Vote to skip"}
        </button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
        <div className="h-full bg-red-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PromoteVoteBar({
  voteCount,
  required,
  hasVoted,
  onVote,
}: {
  voteCount: number;
  required: number;
  hasVoted: boolean;
  onVote: () => void;
}) {
  const pct = required > 0 ? Math.min(100, (voteCount / required) * 100) : 0;

  return (
    <div
      className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-1.5"
      data-testid="promote-vote-bar"
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-[var(--text-muted)]">
          Promote votes: {voteCount} / {required}
        </span>
        <button
          type="button"
          onClick={onVote}
          disabled={hasVoted}
          className="rounded-md bg-[var(--accent)]/20 px-2 py-0.5 text-[var(--accent)] hover:bg-[var(--accent)]/30 disabled:opacity-50"
        >
          {hasVoted ? "Voted" : "Vote to promote"}
        </button>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--border)]">
        <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export { formatDuration };
