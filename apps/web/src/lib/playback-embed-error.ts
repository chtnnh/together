const EMBED_BLOCKED_CODES = new Set([101, 150]);

const ERROR_MESSAGES: Record<number, string> = {
  2: "Invalid video",
  5: "Playback error — tap Sync to retry",
  100: "Video not found",
  101: "This video can't be played here",
  150: "This video can't be embedded",
  153: "Player error — tap Sync to retry",
};

export function isEmbedBlockedError(code: number): boolean {
  return EMBED_BLOCKED_CODES.has(code);
}

export function embedErrorMessage(code: number): string {
  return ERROR_MESSAGES[code] ?? `Playback error (${code})`;
}
