"use client";

import { useEffect, useRef, useState } from "react";
import type { HistoryItem, QueueItem, RequestItem } from "@together/shared";
import { Music, Trash2, ArrowUp, AlertCircle, Clock, GripVertical, Play, Plus, Check } from "lucide-react";
import { formatDuration } from "../lib/utils";
import { Button } from "./button";
import { PromoteVoteBar } from "./chat-panel";

interface QueueListProps {
  items: QueueItem[];
  currentItemId?: string | null;
  canManage?: boolean;
  canPlay?: boolean;
  onRemove?: (id: string) => void;
  onClearAll?: () => void;
  hideClearAll?: boolean;
  onPlay?: (id: string) => void;
  onReorder?: (itemId: string, newIndex: number) => void;
  onPromote?: never;
}

interface RequestListProps {
  items: RequestItem[];
  canManage?: boolean;
  onRemove?: (id: string) => void;
  onPromote?: (id: string) => void;
  onPickAlternate?: (id: string) => void;
  onClearAll?: () => void;
  democraticPromote?: boolean;
  promoteRequired?: number;
  promoteVotedIds?: ReadonlySet<string>;
  onVotePromote?: (id: string) => void;
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
  canPlay,
  onRemove,
  onPromote,
  onPickAlternate,
  onPlay,
  showStatus,
  draggable,
  isDragTarget,
  isDragging,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onGripPointerDown,
  queueItemId,
}: {
  item: QueueItem | RequestItem;
  isActive?: boolean;
  canManage?: boolean;
  canPlay?: boolean;
  onRemove?: (id: string) => void;
  onPromote?: (id: string) => void;
  onPickAlternate?: (id: string) => void;
  onPlay?: (id: string) => void;
  showStatus?: boolean;
  draggable?: boolean;
  isDragTarget?: boolean;
  isDragging?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onGripPointerDown?: (e: React.PointerEvent) => void;
  queueItemId?: string;
}) {
  const requestItem = item as RequestItem;
  const canPlayItem = canPlay && onPlay && !isActive && !!item.videoId;

  return (
    <div
      data-queue-item-id={queueItemId ?? item.id}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-2 rounded-lg px-2 py-2 transition-all ${
        isActive
          ? "border border-[var(--accent)]/40 bg-[var(--accent)]/20"
          : isDragTarget
            ? "border border-dashed border-[var(--accent)] bg-[var(--accent)]/10"
            : "hover:bg-[var(--bg-secondary)]"
      } ${isDragging ? "scale-[1.02] opacity-60 shadow-md" : ""}`}
    >
      {draggable && (
        <div
          className="cursor-grab touch-none select-none text-[var(--text-muted)] active:cursor-grabbing"
          aria-hidden
          onPointerDown={onGripPointerDown}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      {item.thumbnailUrl ? (
        <img src={item.thumbnailUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[var(--bg-secondary)]">
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
        {canPlayItem && (
          <Button size="icon" variant="ghost" onClick={() => onPlay(item.id)} title="Play now">
            <Play className="h-4 w-4" />
          </Button>
        )}
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

export function QueueList({
  items,
  currentItemId,
  canManage,
  canPlay,
  onRemove,
  onClearAll,
  onPlay,
  onReorder,
  hideClearAll = false,
}: QueueListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const pointerDragRef = useRef<{ id: string; pointerId: number } | null>(null);

  useEffect(() => {
    if (!onReorder) return;

    const finishPointerDrag = (targetId: string | null) => {
      const dragged = pointerDragRef.current?.id;
      if (dragged && targetId && dragged !== targetId) {
        const toIndex = items.findIndex((i) => i.id === targetId);
        if (toIndex !== -1) onReorder(dragged, toIndex);
      }
      pointerDragRef.current = null;
      setDraggedId(null);
      setDropTargetId(null);
    };

    const onPointerMove = (e: PointerEvent) => {
      const drag = pointerDragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const row = target?.closest("[data-queue-item-id]");
      const targetId = row?.getAttribute("data-queue-item-id");
      if (targetId && targetId !== drag.id) {
        setDropTargetId(targetId);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const drag = pointerDragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const row = target?.closest("[data-queue-item-id]");
      finishPointerDrag(row?.getAttribute("data-queue-item-id") ?? dropTargetId);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [dropTargetId, items, onReorder]);

  const startPointerReorder = (itemId: string, e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointerDragRef.current = { id: itemId, pointerId: e.pointerId };
    setDraggedId(itemId);
  };

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[var(--text-muted)]">
        <p>Queue is empty</p>
        <p className="mt-1 text-xs">Paste a video or playlist link above to add tracks.</p>
      </div>
    );
  }

  const clearableCount = items.filter((i) => i.id !== currentItemId).length;
  const reorderEnabled = canManage && !!onReorder;

  const handleDrop = (targetId: string) => {
    if (!draggedId || !onReorder || draggedId === targetId) {
      setDraggedId(null);
      setDropTargetId(null);
      return;
    }

    const toIndex = items.findIndex((i) => i.id === targetId);
    if (toIndex === -1) return;

    onReorder(draggedId, toIndex);
    setDraggedId(null);
    setDropTargetId(null);
  };

  return (
    <div className="space-y-1">
      {canManage && onClearAll && !hideClearAll && clearableCount > 0 && (
        <div className="flex justify-end px-1 pb-1">
          <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs text-[var(--text-muted)]">
            Clear all
          </Button>
        </div>
      )}
      {items.map((item) => (
        <QueueItemRow
          key={item.id}
          item={item}
          isActive={item.id === currentItemId}
          canManage={canManage}
          canPlay={canPlay}
          onRemove={onRemove}
          onPlay={onPlay}
          draggable={reorderEnabled}
          isDragging={draggedId === item.id}
          isDragTarget={dropTargetId === item.id && draggedId !== item.id}
          onDragStart={(e) => {
            setDraggedId(item.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragOver={(e) => {
            if (!draggedId || draggedId === item.id) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDropTargetId(item.id);
          }}
          onDragLeave={() => {
            if (dropTargetId === item.id) setDropTargetId(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(item.id);
          }}
          onDragEnd={() => {
            setDraggedId(null);
            setDropTargetId(null);
          }}
          onGripPointerDown={(e) => startPointerReorder(item.id, e)}
          queueItemId={item.id}
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
  onClearAll,
  democraticPromote,
  promoteRequired = 1,
  promoteVotedIds,
  onVotePromote,
}: RequestListProps) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[var(--text-muted)]">
        <p>No requests yet</p>
        <p className="mt-1 text-xs">Paste a YouTube link above to request a track.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {canManage && onClearAll && (
        <div className="flex justify-end px-1 pb-1">
          <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs text-[var(--text-muted)]">
            Clear all
          </Button>
        </div>
      )}
      {items.map((item) => (
        <div key={item.id} className="space-y-1">
          <QueueItemRow
            item={item}
            canManage={canManage}
            onRemove={onRemove}
            onPromote={onPromote}
            onPickAlternate={onPickAlternate}
            showStatus
          />
          {democraticPromote && onVotePromote && (
            <PromoteVoteBar
              voteCount={item.promoteVotes ?? 0}
              required={promoteRequired}
              hasVoted={promoteVotedIds?.has(item.id) ?? false}
              onVote={() => onVotePromote(item.id)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

const READD_COOLDOWN_MS = 2000;

function HistoryReAddButton({
  item,
  onReAdd,
}: {
  item: HistoryItem;
  onReAdd: (item: HistoryItem) => void;
}) {
  const [added, setAdded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClick = () => {
    if (added) return;
    onReAdd(item);
    setAdded(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAdded(false), READD_COOLDOWN_MS);
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={handleClick}
      disabled={added}
      title={added ? "Added to queue" : "Add to queue"}
      className="shrink-0"
    >
      {added ? (
        <Check className="h-4 w-4 text-green-400" aria-hidden />
      ) : (
        <Plus className="h-4 w-4" aria-hidden />
      )}
    </Button>
  );
}

export function HistoryList({
  items,
  onReAdd,
}: {
  items: HistoryItem[];
  onReAdd?: (item: HistoryItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[var(--text-muted)]">
        <p>Nothing played yet</p>
        <p className="mt-1 text-xs">Tracks appear here after they play or get skipped.</p>
      </div>
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
            <img src={item.thumbnailUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[var(--bg-secondary)]">
              <Clock className="h-5 w-5 text-[var(--text-muted)]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {item.artist ?? item.addedBy} · {item.reason}
            </p>
          </div>
          {onReAdd && item.videoId && (
            <HistoryReAddButton item={item} onReAdd={onReAdd} />
          )}
        </div>
      ))}
    </div>
  );
}
