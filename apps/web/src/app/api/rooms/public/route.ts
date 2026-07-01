import { NextResponse } from "next/server";
import { listPublicRooms } from "@/lib/rooms";
import { enforceRateLimit } from "@/lib/rate-limit";

async function fetchParticipantCount(roomId: string): Promise<number> {
  const base =
    process.env.NEXT_PUBLIC_REALTIME_URL?.replace(/^ws/, "http") ?? "http://127.0.0.1:8787";
  try {
    const res = await fetch(`${base}/room/${roomId}/stats`, {
      next: { revalidate: 15 },
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { participantCount?: number };
    return data.participantCount ?? 0;
  } catch {
    return 0;
  }
}

export async function GET(request: Request) {
  const limited = enforceRateLimit(request, {
    name: "public-rooms",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 24)));

  const rooms = await listPublicRooms(limit);
  const withCounts = await Promise.all(
    rooms.map(async (room) => ({
      slug: room.slug,
      title: room.title ?? room.slug,
      participantCount: await fetchParticipantCount(room.id),
      createdAt: room.createdAt,
    })),
  );

  return NextResponse.json(
    withCounts.filter((r) => r.participantCount > 0),
  );
}
