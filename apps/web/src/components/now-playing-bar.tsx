"use client";

import type { ReactNode } from "react";
import type { PlaybackState, ReactionEmoji, RoomReaction } from "@together/shared";
import { SkipVoteBar, Tooltip, TooltipContent, TooltipTrigger } from "@together/ui";
import { Pause, Play, SkipForward } from "lucide-react";
import { PlaybackSeekBar } from "@/components/playback-seek-bar";
import { PlaybackVolumeControl } from "@/components/playback-volume-control";
import { NowPlayingReactions } from "@/components/now-playing-reactions";
import { useMediaQuery } from "@/hooks/use-media-query";

interface NowPlayingBarProps {
  playback: PlaybackState | null;
  title?: string;
  artist?: string;
  thumbnailUrl?: string;
  durationMs: number;
  clockOffsetMs?: number;
  ready: boolean;
  canControlPlayback: boolean;
  skipVotes?: {
    voteCount: number;
    required: number;
    hasVoted: boolean;
    onVote: () => void;
  } | null;
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onMutedChange: (muted: boolean) => void;
  onSeek: (positionMs: number) => void;
  onPlayPause: () => void;
  onSkip: () => void;
  canSkip: boolean;
  onReactionSend?: (emoji: ReactionEmoji) => void;
  incomingReactions?: RoomReaction[];
  reducedMotion?: boolean;
}

function MobileSkipVotes({
  voteCount,
  required,
  hasVoted,
  onVote,
  reactions,
}: {
  voteCount: number;
  required: number;
  hasVoted: boolean;
  onVote: () => void;
  reactions?: ReactNode;
}) {
  const pct = required > 0 ? Math.min(100, (voteCount / required) * 100) : 0;

  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 pt-1"
      data-testid="skip-vote-bar"
    >
      <span className="col-start-1 row-start-1 text-xs tabular-nums">
        Skip {voteCount}/{required}
      </span>
      <div className="col-start-1 row-start-2 h-1 overflow-hidden rounded-full bg-[var(--border)]">
        <div className="h-full bg-red-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <button
        type="button"
        onClick={onVote}
        disabled={hasVoted}
        className="col-start-1 row-start-3 justify-self-start rounded-md bg-red-600/20 px-2 py-0.5 text-xs text-red-400 hover:bg-red-600/30 disabled:opacity-50"
      >
        {hasVoted ? "Voted" : "Vote to skip"}
      </button>
      {reactions ? (
        <div className="col-start-2 row-start-1 row-span-3 flex items-center self-center">
          {reactions}
        </div>
      ) : null}
    </div>
  );
}

export function NowPlayingBar({
  playback,
  title,
  artist,
  thumbnailUrl,
  durationMs,
  clockOffsetMs = 0,
  ready,
  canControlPlayback,
  skipVotes,
  volume,
  muted,
  onVolumeChange,
  onMutedChange,
  onSeek,
  onPlayPause,
  onSkip,
  canSkip,
  onReactionSend,
  incomingReactions = [],
  reducedMotion = false,
}: NowPlayingBarProps) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const displayTitle = title ?? playback?.title ?? "Nothing playing";
  const showTransport = canControlPlayback && playback?.videoId;

  const reactions = onReactionSend ? (
    <NowPlayingReactions
      onSend={onReactionSend}
      incoming={incomingReactions}
      inline
      reducedMotion={reducedMotion}
    />
  ) : null;

  return (
    <div
      className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3"
      data-testid="now-playing-bar"
    >
      <div className="flex items-center gap-3">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="size-14 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-[var(--border)] text-xs text-[var(--text-muted)]">
            No art
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium" aria-live="polite" aria-atomic="true">
            {displayTitle}
          </p>
          {artist && (
            <p className="truncate text-sm text-[var(--text-muted)]">{artist}</p>
          )}
        </div>
        <PlaybackVolumeControl
          volume={volume}
          muted={muted}
          onVolumeChange={onVolumeChange}
          onMutedChange={onMutedChange}
          disabled={!ready}
          align="right"
          compact
        />
      </div>

      {playback?.videoId && (
        <div className="flex items-center gap-2">
          {showTransport && (
            <div className="flex shrink-0 items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onPlayPause}
                    disabled={!ready}
                    aria-label={playback.playing ? "Pause" : "Play"}
                    className="inline-flex size-10 items-center justify-center rounded-md text-[var(--text)] transition-colors hover:bg-[var(--bg)] disabled:opacity-50"
                  >
                    {playback.playing ? (
                      <Pause className="size-5" strokeWidth={2.5} />
                    ) : (
                      <Play className="size-5" strokeWidth={2.5} />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{playback.playing ? "Pause" : "Play"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Skip to next"
                    onClick={onSkip}
                    disabled={!canSkip}
                    className="inline-flex size-10 items-center justify-center rounded-md text-[var(--text)] transition-colors hover:bg-[var(--bg)] disabled:opacity-50"
                  >
                    <SkipForward className="size-5" strokeWidth={2.5} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Skip to next</TooltipContent>
              </Tooltip>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <PlaybackSeekBar
              playback={playback}
              durationMs={durationMs}
              clockOffsetMs={clockOffsetMs}
              disabled={!canControlPlayback || !ready}
              onSeek={onSeek}
            />
          </div>
        </div>
      )}

      {(skipVotes || onReactionSend) &&
        (isMobile && skipVotes ? (
          <MobileSkipVotes
            voteCount={skipVotes.voteCount}
            required={skipVotes.required}
            hasVoted={skipVotes.hasVoted}
            onVote={skipVotes.onVote}
            reactions={reactions}
          />
        ) : (
          <div className="flex items-end justify-between gap-3 pt-1">
            {skipVotes ? (
              <SkipVoteBar
                voteCount={skipVotes.voteCount}
                required={skipVotes.required}
                hasVoted={skipVotes.hasVoted}
                onVote={skipVotes.onVote}
                compact={false}
              />
            ) : null}
            {reactions ? <div className="shrink-0">{reactions}</div> : null}
          </div>
        ))}
    </div>
  );
}
