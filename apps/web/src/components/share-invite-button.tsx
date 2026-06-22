"use client";

import { useCallback, useState } from "react";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@together/ui";
import { Check, Link2 } from "lucide-react";

export function ShareInviteButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const copyInvite = useCallback(async () => {
    const url = `${window.location.origin}/r/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [slug]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={copyInvite} aria-label="Copy room link">
          {copied ? <Check className="size-5 text-green-400" /> : <Link2 className="size-5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied!" : "Copy room link"}</TooltipContent>
    </Tooltip>
  );
}
