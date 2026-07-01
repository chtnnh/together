const STORAGE_KEY = "together_recent_rooms";
const MAX_RECENT = 5;

export interface RecentRoom {
  slug: string;
  title: string;
  visitedAt: number;
}

export function getRecentRooms(): RecentRoom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentRoom[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function recordRecentRoom(slug: string, title: string) {
  if (typeof window === "undefined") return;
  const existing = getRecentRooms().filter((r) => r.slug !== slug);
  const next: RecentRoom[] = [
    { slug, title: title.trim() || slug, visitedAt: Date.now() },
    ...existing,
  ].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
