"use client";

import type { PlaybackState, ReactionEmoji, RoomReaction } from "@together/shared";
import { Button, SkipVoteBar, Tooltip, TooltipContent, TooltipTrigger } from "@together/ui";
import { Pause, Play, SkipForward } from "lucide-react";
import { PlaybackSeekBar } from "@/components/playback-seek-bar";
import { PlaybackVolumeControl } from "@/components/playback-volume-control";
import { NowPlayingReactions } from "@/components/now-playing-reactions";

interface NowPlayingBarProps {
  playback: PlaybackState | null;
  title?: string;
  artist?: string;
  thumbnailUrl?: string;
  durationMs: number;
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
}

export function NowPlayingBar({
  playback,
  title,
  artist,
  thumbnailUrl,
  durationMs,
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
}: NowPlayingBarProps) {
  const displayTitle = title ?? playback?.title ?? "Nothing playing";

  return (
    <div
      className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3"
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
          <p className="truncate font-medium">{displayTitle}</p>
          {artist && (
            <p className="truncate text-sm text-[var(--text-muted)]">{artist}</p>
          )}
        </div>
        {canControlPlayback && playback?.videoId && (
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={onPlayPause}
                  disabled={!ready}
                  aria-label={playback.playing ? "Pause" : "Play"}
                >
                  {playback.playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{playback.playing ? "Pause" : "Play"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Skip to next"
                  onClick={onSkip}
                  disabled={!canSkip}
                >
                  <SkipForward className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Skip to next</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {playback?.videoId && (
        <PlaybackSeekBar
          playback={playback}
          durationMs={durationMs}
          disabled={!canControlPlayback || !ready}
          onSeek={onSeek}
        />
      )}

      {skipVotes && (
        <SkipVoteBar
          voteCount={skipVotes.voteCount}
          required={skipVotes.required}
          hasVoted={skipVotes.hasVoted}
          onVote={skipVotes.onVote}
        />
      )}

      <PlaybackVolumeControl
        volume={volume}
        muted={muted}
        onVolumeChange={onVolumeChange}
        onMutedChange={onMutedChange}
        disabled={!ready}
      />

      {onReactionSend && (
        <NowPlayingReactions onSend={onReactionSend} incoming={incomingReactions} />
      )}
    </div>
  );
}
