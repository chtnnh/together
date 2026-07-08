export type ImportTrackResult = {
  source: string;
  videoId?: string | null;
  title: string;
  artist?: string;
  durationMs?: number;
  thumbnailUrl?: string;
  confidence?: number;
};

export type ImportPlaylistResult = {
  kind: "playlist";
  title: string;
  artist?: string;
  thumbnailUrl?: string;
  videoCount: number;
  tracks: ImportTrackResult[];
};

export type ImportResult = ImportTrackResult | ImportPlaylistResult;

export function isImportPlaylist(item: ImportResult): item is ImportPlaylistResult {
  return "kind" in item && item.kind === "playlist";
}

export function normalizeImportResponse(data: unknown): ImportResult[] {
  if (Array.isArray(data)) return data as ImportResult[];
  if (data && typeof data === "object" && "kind" in data && (data as ImportPlaylistResult).kind === "playlist") {
    return [data as ImportPlaylistResult];
  }
  if (data && typeof data === "object") return [data as ImportTrackResult];
  return [];
}

/** Show a picker unless there is exactly one track from a direct video URL. */
export function shouldShowImportPicker(items: ImportResult[], query: string, isUrl: boolean): boolean {
  if (items.length === 0) return false;
  if (items.some(isImportPlaylist)) return true;
  if (items.length > 1) return true;
  if (!isUrl) return true;
  return false;
}
