import {
  adminAuditLog,
  getDb,
  passwordAttempts,
  playlists,
  playlistItems,
  roomBans,
  rooms,
  users,
} from "@together/db";
import { desc, eq, gt, gte, isNotNull, or, sql } from "drizzle-orm";
import { runSpan } from "@/lib/api-log";
import { fetchRealtimeJson } from "@/lib/realtime-server";

const RECENTLY_ACTIVE_MS = 30 * 60 * 1000;

export async function getAdminStats() {
  if (!process.env.DATABASE_URL) {
    return {
      users: 0,
      rooms: 0,
      ownedRooms: 0,
      playlists: 0,
      playlistItems: 0,
      recentlyActiveRooms: 0,
    };
  }

  const db = getDb();
  const recentlyActiveSince = new Date(Date.now() - RECENTLY_ACTIVE_MS);

  return runSpan("admin-data", "getAdminStats", async () => {
    // One round-trip for base counts. Keep last_active_at separate so a missing
    // v0.3 migration column does not fail the entire dashboard.
    const rows = await db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM rooms) AS rooms,
        (SELECT COUNT(*)::int FROM rooms WHERE owner_user_id IS NOT NULL) AS owned_rooms,
        (SELECT COUNT(*)::int FROM playlists) AS playlists,
        (SELECT COUNT(*)::int FROM playlist_items) AS playlist_items
    `);

    const row = rows[0] as
      | {
          users: number;
          rooms: number;
          owned_rooms: number;
          playlists: number;
          playlist_items: number;
        }
      | undefined;

    let recentlyActiveRooms = 0;
    try {
      const recentRows = await db.execute(sql`
        SELECT COUNT(*)::int AS recently_active_rooms
        FROM rooms
        WHERE last_active_at >= ${recentlyActiveSince.toISOString()}::timestamptz
      `);
      recentlyActiveRooms =
        (recentRows[0] as { recently_active_rooms: number } | undefined)?.recently_active_rooms ?? 0;
    } catch {
      recentlyActiveRooms = 0;
    }

    return {
      users: row?.users ?? 0,
      rooms: row?.rooms ?? 0,
      ownedRooms: row?.owned_rooms ?? 0,
      playlists: row?.playlists ?? 0,
      playlistItems: row?.playlist_items ?? 0,
      recentlyActiveRooms,
    };
  });
}

export async function listAdminRooms(limit = 100) {
  if (!process.env.DATABASE_URL) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(rooms)
    .orderBy(desc(rooms.lastActiveAt), desc(rooms.createdAt))
    .limit(limit);

  return rows.map((room) => ({
    id: room.id,
    slug: room.slug,
    title: room.title,
    privacy: room.privacy,
    ownerUserId: room.ownerUserId,
    createdAt: room.createdAt,
    lastActiveAt: room.lastActiveAt,
  }));
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

export async function isUserGloballyBanned(userId: string): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  const db = getDb();
  const [row] = await db
    .select({ bannedAt: users.bannedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return !!row?.bannedAt;
}

export async function purgeRoomDurableObject(roomId: string): Promise<boolean> {
  const secret = process.env.ROOM_TOKEN_SECRET;
  if (!secret) return false;

  const result = await fetchRealtimeJson<{ ok?: boolean }>(`/room/${roomId}/purge`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  return result.ok;
}

export async function deleteRoomBySlug(slug: string) {
  if (!process.env.DATABASE_URL) return false;
  const db = getDb();
  const [room] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(eq(rooms.slug, slug))
    .limit(1);
  if (!room) return false;

  await db.delete(rooms).where(eq(rooms.slug, slug));
  await purgeRoomDurableObject(room.id);
  return true;
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

export async function listAdminAuditLog(limit = 100) {
  if (!process.env.DATABASE_URL) return [];
  const db = getDb();

  return db
    .select({
      id: adminAuditLog.id,
      action: adminAuditLog.action,
      targetType: adminAuditLog.targetType,
      targetId: adminAuditLog.targetId,
      metadata: adminAuditLog.metadata,
      createdAt: adminAuditLog.createdAt,
      actorEmail: users.email,
    })
    .from(adminAuditLog)
    .leftJoin(users, eq(adminAuditLog.actorId, users.id))
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);
}

export async function listAbuseSignals(limit = 50) {
  if (!process.env.DATABASE_URL) {
    return { roomBans: [], passwordAttempts: [], bannedUsers: [] };
  }

  const db = getDb();
  const now = new Date();

  const recentRoomBans = await db
    .select({
      id: roomBans.id,
      roomSlug: rooms.slug,
      roomTitle: rooms.title,
      userId: roomBans.userId,
      anonFingerprint: roomBans.anonFingerprint,
      createdAt: roomBans.createdAt,
    })
    .from(roomBans)
    .innerJoin(rooms, eq(roomBans.roomId, rooms.id))
    .orderBy(desc(roomBans.createdAt))
    .limit(limit);

  const suspiciousAttempts = await db
    .select()
    .from(passwordAttempts)
    .where(
      or(
        gte(passwordAttempts.attempts, 3),
        gt(passwordAttempts.lockedUntil, now),
      ),
    )
    .orderBy(desc(passwordAttempts.updatedAt))
    .limit(limit);

  const bannedUsers = await db
    .select({
      id: users.id,
      email: users.email,
      bannedAt: users.bannedAt,
    })
    .from(users)
    .where(isNotNull(users.bannedAt))
    .orderBy(desc(users.bannedAt))
    .limit(limit);

  return { roomBans: recentRoomBans, passwordAttempts: suspiciousAttempts, bannedUsers };
}
