"use client";

import { useEffect, useRef, useState } from "react";
import { REACTION_EMOJIS, type ReactionEmoji, type RoomReaction } from "@together/shared";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@together/ui";

interface FloatingReaction extends RoomReaction {
  offsetX: number;
}

interface NowPlayingReactionsProps {
  onSend: (emoji: ReactionEmoji) => void;
  incoming: RoomReaction[];
}

const FLOAT_MS = 2500;

export function NowPlayingReactions({ onSend, incoming }: NowPlayingReactionsProps) {
  const [floating, setFloating] = useState<FloatingReaction[]>([]);
  const lastReactionIdRef = useRef<string | null>(null);

  useEffect(() => {
    const latest = incoming[incoming.length - 1];
    if (!latest || latest.id === lastReactionIdRef.current) return;
    lastReactionIdRef.current = latest.id;

    const entry: FloatingReaction = {
      ...latest,
      offsetX: Math.round(Math.random() * 60 - 30),
    };

    setFloating((prev) => [...prev, entry]);
    const timer = setTimeout(() => {
      setFloating((prev) => prev.filter((r) => r.id !== entry.id));
    }, FLOAT_MS);

    return () => clearTimeout(timer);
  }, [incoming]);

  return (
    <div className="relative" data-testid="now-playing-reactions">
      <div className="pointer-events-none absolute inset-x-0 bottom-full mb-1 h-16 overflow-hidden">
        {floating.map((reaction) => (
          <span
            key={reaction.id}
            className="absolute bottom-0 left-1/2 animate-[reaction-float_2.5s_ease-out_forwards] text-2xl"
            style={{ marginLeft: reaction.offsetX }}
            aria-hidden
          >
            {reaction.emoji}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-1">
        {REACTION_EMOJIS.map((emoji) => (
          <Tooltip key={emoji}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-lg"
                aria-label={`React ${emoji}`}
                onClick={() => onSend(emoji)}
              >
                {emoji}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send {emoji}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
