import { getDb, playlists, playlistItems, rooms, users } from "@together/db";
import { count, desc, eq, isNotNull, sql } from "drizzle-orm";

export async function fetchRoomParticipantCount(roomId: string): Promise<number> {
  const base =
    process.env.NEXT_PUBLIC_REALTIME_URL?.replace(/^ws/, "http") ?? "http://127.0.0.1:8787";
  try {
    const res = await fetch(`${base}/room/${roomId}/stats`, { cache: "no-store" });
    if (!res.ok) return 0;
    const data = (await res.json()) as { participantCount?: number };
    return data.participantCount ?? 0;
  } catch {
    return 0;
  }
}

export async function getAdminStats() {
  if (!process.env.DATABASE_URL) {
    return {
      users: 0,
      rooms: 0,
      ownedRooms: 0,
      playlists: 0,
      playlistItems: 0,
      liveRooms: 0,
    };
  }

  const db = getDb();
  const [[userCount], [roomCount], [ownedCount], [playlistCount], [itemCount]] =
    await Promise.all([
      db.select({ value: count() }).from(users),
      db.select({ value: count() }).from(rooms),
      db.select({ value: count() }).from(rooms).where(isNotNull(rooms.ownerUserId)),
      db.select({ value: count() }).from(playlists),
      db.select({ value: count() }).from(playlistItems),
    ]);

  const recentRooms = await db
    .select({ id: rooms.id })
    .from(rooms)
    .orderBy(desc(rooms.lastActiveAt))
    .limit(50);

  const liveCounts = await Promise.all(
    recentRooms.map((room) => fetchRoomParticipantCount(room.id)),
  );
  const liveRooms = liveCounts.filter((value) => value > 0).length;

  return {
    users: userCount?.value ?? 0,
    rooms: roomCount?.value ?? 0,
    ownedRooms: ownedCount?.value ?? 0,
    playlists: playlistCount?.value ?? 0,
    playlistItems: itemCount?.value ?? 0,
    liveRooms,
  };
}

export async function listAdminRooms(limit = 100) {
  if (!process.env.DATABASE_URL) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(rooms)
    .orderBy(desc(rooms.lastActiveAt), desc(rooms.createdAt))
    .limit(limit);

  return Promise.all(
    rows.map(async (room) => ({
      id: room.id,
      slug: room.slug,
      title: room.title,
      privacy: room.privacy,
      ownerUserId: room.ownerUserId,
      createdAt: room.createdAt,
      lastActiveAt: room.lastActiveAt,
      participantCount: await fetchRoomParticipantCount(room.id),
    })),
  );
}

export async function listAdminUsers(limit = 100) {
  if (!process.env.DATABASE_URL) return [];
  const db = getDb();

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      appRole: users.appRole,
      bannedAt: users.bannedAt,
      createdAt: users.createdAt,
      ownedRoomCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${rooms} WHERE ${rooms.ownerUserId} = ${users.id}
      )`,
      playlistCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${playlists} WHERE ${playlists.userId} = ${users.id}
      )`,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit);

  return rows;
}

export async function deleteRoomBySlug(slug: string) {
  if (!process.env.DATABASE_URL) return false;
  const db = getDb();
  const result = await db.delete(rooms).where(eq(rooms.slug, slug)).returning({ id: rooms.id });
  return result.length > 0;
}

export async function setUserBanned(userId: string, banned: boolean) {
  if (!process.env.DATABASE_URL) return false;
  const db = getDb();
  await db
    .update(users)
    .set({ bannedAt: banned ? new Date() : null })
    .where(eq(users.id, userId));
  return true;
}
