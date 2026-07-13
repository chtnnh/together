"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@together/ui";
import { Check, Link2, Share2 } from "lucide-react";

export function useShareInvite({
  slug,
  title,
  privacy,
}: {
  slug: string;
  title?: string;
  privacy?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const getInviteUrl = useCallback(async () => {
    const res = await fetch(`/api/rooms/${slug}/invite`);
    const data = (await res.json()) as { inviteUrl?: string; roomUrl?: string };
    return data.inviteUrl ?? data.roomUrl ?? `${window.location.origin}/r/${slug}`;
  }, [slug]);

  const copyInvite = useCallback(async () => {
    const url = await getInviteUrl();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [getInviteUrl]);

  const shareInvite = useCallback(async () => {
    const url = await getInviteUrl();
    const shareTitle = title ? `${title} · Together` : "Join my Together room";
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url });
        return;
      } catch {
        // user cancelled or unsupported — fall back to copy
      }
    }
    await copyInvite();
  }, [copyInvite, getInviteUrl, title]);

  const actionLabel =
    privacy === "private" ? "Share invite link" : canShare ? "Share room" : "Copy room link";

  return { shareInvite, copied, canShare, actionLabel };
}

export function ShareInviteButton({
  slug,
  title,
  privacy,
}: {
  slug: string;
  title?: string;
  privacy?: string;
}) {
  const { shareInvite, copied, canShare, actionLabel } = useShareInvite({ slug, title, privacy });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={shareInvite}
          aria-label={privacy === "private" ? "Share invite link" : "Share room link"}
        >
          {copied ? (
            <Check className="size-5 text-green-400" />
          ) : canShare ? (
            <Share2 className="size-5" />
          ) : (
            <Link2 className="size-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied!" : actionLabel}</TooltipContent>
    </Tooltip>
  );
}
