/** Whether the client should try to keep/resume playback while the tab is hidden. */
export function shouldAttemptBackgroundResume(documentHidden: boolean, playing: boolean): boolean {
  return documentHidden && playing;
}

/** Whether returning to the foreground should force a playback resync. */
export function shouldResyncOnForeground(documentHidden: boolean): boolean {
  return !documentHidden;
}
