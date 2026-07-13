"use client";

import { useCallback, useState } from "react";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@together/ui";
import { Check, MessageSquareQuote } from "lucide-react";

interface DiscordStatusButtonProps {
  title?: string;
  artist?: string;
  slug: string;
}

export function useDiscordStatus({ title, artist, slug }: DiscordStatusButtonProps) {
  const [copied, setCopied] = useState(false);

  const copyStatus = useCallback(async () => {
    const track = artist && title ? `${artist} - ${title}` : title ?? "Together room";
    const origin = window.location.origin;
    const text = `${track} | ${origin}/r/${slug}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [artist, slug, title]);

  return { copyStatus, copied };
}

export function DiscordStatusButton({ title, artist, slug }: DiscordStatusButtonProps) {
  const { copyStatus, copied } = useDiscordStatus({ title, artist, slug });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={copyStatus} aria-label="Copy Discord status">
          {copied ? (
            <Check className="size-5 text-green-400" />
          ) : (
            <MessageSquareQuote className="size-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied!" : "Copy Discord status"}</TooltipContent>
    </Tooltip>
  );
}
