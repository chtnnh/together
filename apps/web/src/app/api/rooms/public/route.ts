import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api-log";
import { listPublicRooms } from "@/lib/rooms";
import { enforceRateLimit } from "@/lib/rate-limit";
import { fetchRealtimeJson } from "@/lib/realtime-server";

async function fetchParticipantCount(roomId: string): Promise<number> {
  const result = await fetchRealtimeJson<{ participantCount?: number }>(
    `/room/${roomId}/stats`,
  );
  if (!result.ok) return 0;
  return result.data.participantCount ?? 0;
}

export const GET = withApiHandler("GET /api/rooms/public", async (_log, request) => {
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
});
