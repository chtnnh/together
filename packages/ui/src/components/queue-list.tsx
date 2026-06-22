import type { HistoryItem, QueueItem, RequestItem } from "@together/shared";
import { Music, Trash2, ArrowUp, AlertCircle, Clock } from "lucide-react";
import { formatDuration } from "../lib/utils";
import { Button } from "./button";

interface QueueListProps {
  items: QueueItem[];
  currentItemId?: string | null;
  canManage?: boolean;
  onRemove?: (id: string) => void;
  onPromote?: never;
}

interface RequestListProps {
  items: RequestItem[];
  canManage?: boolean;
  onRemove?: (id: string) => void;
  onPromote?: (id: string) => void;
  onPickAlternate?: (id: string) => void;
}

function StatusBadge({ status }: { status: RequestItem["status"] }) {
  const colors = {
    pending: "text-yellow-400",
    resolving: "text-blue-400",
    resolved: "text-green-400",
    needs_pick: "text-orange-400",
  };
  return <span className={`text-xs ${colors[status]}`}>{status.replace("_", " ")}</span>;
}

function QueueItemRow({
  item,
  isActive,
  canManage,
  onRemove,
  onPromote,
  onPickAlternate,
  showStatus,
}: {
  item: QueueItem | RequestItem;
  isActive?: boolean;
  canManage?: boolean;
  onRemove?: (id: string) => void;
  onPromote?: (id: string) => void;
  onPickAlternate?: (id: string) => void;
  showStatus?: boolean;
}) {
  const requestItem = item as RequestItem;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isActive ? "bg-[var(--accent)]/20 border border-[var(--accent)]/40" : "hover:bg-[var(--bg-secondary)]"}`}
    >
      {item.thumbnailUrl ? (
        <img src={item.thumbnailUrl} alt="" className="h-10 w-10 rounded object-cover" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded bg-[var(--bg-secondary)]">
          <Music className="h-5 w-5 text-[var(--text-muted)]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="truncate text-xs text-[var(--text-muted)]">
          {item.artist ?? item.addedBy} · {formatDuration(item.durationMs)}
          {item.confidence !== undefined && ` · ${item.confidence}% match`}
        </p>
        {showStatus && <StatusBadge status={requestItem.status} />}
      </div>
      <div className="flex shrink-0 gap-1">
        {requestItem.status === "needs_pick" && onPickAlternate && (
          <Button size="icon" variant="ghost" onClick={() => onPickAlternate(item.id)} title="Pick alternate">
            <AlertCircle className="h-4 w-4" />
          </Button>
        )}
        {onPromote && (
          <Button size="icon" variant="ghost" onClick={() => onPromote(item.id)} title="Promote to queue">
            <ArrowUp className="h-4 w-4" />
          </Button>
        )}
        {canManage && onRemove && (
          <Button size="icon" variant="ghost" onClick={() => onRemove(item.id)} title="Remove">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function QueueList({ items, currentItemId, canManage, onRemove }: QueueListProps) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-muted)]">Queue is empty</p>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <QueueItemRow
          key={item.id}
          item={item}
          isActive={item.id === currentItemId}
          canManage={canManage}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

export function RequestList({
  items,
  canManage,
  onRemove,
  onPromote,
  onPickAlternate,
}: RequestListProps) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-muted)]">No requests yet</p>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <QueueItemRow
          key={item.id}
          item={item}
          canManage={canManage}
          onRemove={onRemove}
          onPromote={onPromote}
          onPickAlternate={onPickAlternate}
          showStatus
        />
      ))}
    </div>
  );
}

export function HistoryList({ items }: { items: HistoryItem[] }) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-muted)]">Nothing played yet</p>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div
          key={`${item.id}-${item.finishedAt}`}
          className="flex items-center gap-3 rounded-lg px-3 py-2 opacity-75 hover:bg-[var(--bg-secondary)]"
        >
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt="" className="h-10 w-10 rounded object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[var(--bg-secondary)]">
              <Clock className="h-5 w-5 text-[var(--text-muted)]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {item.artist ?? item.addedBy} · {item.reason}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
