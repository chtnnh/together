import type { RoomSettings } from "@together/shared";
import { roomSettingsSchema } from "@together/shared";
import bcrypt from "bcryptjs";
import { generateSlug, signRoomToken } from "./utils";

export interface MemoryRoom {
  id: string;
  slug: string;
  title: string;
  ownerUserId: string | null;
  settings: RoomSettings;
  privacy: "public" | "unlisted" | "private";
  passwordHash: string | null;
  inviteToken: string | null;
  createdAt: Date;
}

const memoryRooms =
  (globalThis as typeof globalThis & { __togetherMemoryRooms?: Map<string, MemoryRoom> })
    .__togetherMemoryRooms ?? new Map<string, MemoryRoom>();
(
  globalThis as typeof globalThis & { __togetherMemoryRooms?: Map<string, MemoryRoom> }
).__togetherMemoryRooms = memoryRooms;

export function isMemoryStoreEnabled(): boolean {
  return !process.env.DATABASE_URL;
}

function getDbErrorMessage(error: unknown): string {
  const cause =
    error && typeof error === "object" && "cause" in error
      ? (error as { cause?: unknown }).cause
      : error;

  if (cause && typeof cause === "object") {
    const pg = cause as { code?: string; message?: string; detail?: string };
    if (pg.code === "42P01") {
      return "Database tables are missing. Run: pnpm db:migrate";
    }
    if (pg.code === "ECONNREFUSED") {
      return "Cannot connect to Postgres. Is Docker running?";
    }
    if (pg.message) {
      return pg.detail ? `${pg.message} (${pg.detail})` : pg.message;
    }
  }

  return error instanceof Error ? error.message : "Failed to create room";
}

async function generateUniqueSlug(): Promise<string> {
  if (isMemoryStoreEnabled()) {
    return generateSlug();
  }

  const { getDb, rooms } = await import("@together/db");
  const { eq } = await import("drizzle-orm");
  const db = getDb();

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateSlug();
    const [existing] = await db
      .select({ slug: rooms.slug })
      .from(rooms)
      .where(eq(rooms.slug, slug))
      .limit(1);
    if (!existing) return slug;
  }

  return generateSlug();
}

export async function createRoom(input: {
  slug?: string;
  title?: string;
  displayName: string;
  privacy: "public" | "unlisted" | "private";
  password?: string;
  settings?: Partial<RoomSettings>;
  ownerUserId?: string;
}) {
  if (isMemoryStoreEnabled()) {
    return createMemoryRoom(input);
  }

  const { getDb, rooms } = await import("@together/db");
  const db = getDb();

  const slug = input.slug ?? (await generateUniqueSlug());

  const settings = roomSettingsSchema.parse({
    ...input.settings,
    privacy: input.privacy,
  });

  const passwordHash = input.password
    ? await bcrypt.hash(input.password, 10)
    : null;

  try {
    const [room] = await db
      .insert(rooms)
      .values({
        slug,
        title: input.title?.trim() || null,
        ownerUserId: input.ownerUserId ?? null,
        settings,
        privacy: input.privacy,
        passwordHash,
      })
      .returning();

    if (!room) {
      throw new Error("Insert succeeded but no room was returned");
    }

    const inviteToken = await signRoomToken(room.id, room.slug);

    return { ...room, inviteToken };
  } catch (error) {
    throw new Error(getDbErrorMessage(error), { cause: error });
  }
}

async function createMemoryRoom(input: {
  slug?: string;
  title?: string;
  displayName: string;
  privacy: "public" | "unlisted" | "private";
  password?: string;
  settings?: Partial<RoomSettings>;
  ownerUserId?: string;
}) {
  const id = crypto.randomUUID();
  const slug = input.slug ?? generateSlug();

  const settings = roomSettingsSchema.parse({
    ...input.settings,
    privacy: input.privacy,
  });

  const passwordHash = input.password
    ? await bcrypt.hash(input.password, 10)
    : null;

  const inviteToken = await signRoomToken(id, slug);

  const room: MemoryRoom = {
    id,
    slug,
    title: input.title?.trim() || "",
    ownerUserId: input.ownerUserId ?? null,
    settings,
    privacy: input.privacy,
    passwordHash,
    inviteToken,
    createdAt: new Date(),
  };

  memoryRooms.set(slug, room);
  return room;
}

export async function getRoomBySlug(slug: string) {
  if (isMemoryStoreEnabled()) {
    return memoryRooms.get(slug) ?? null;
  }

  const { getDb, rooms } = await import("@together/db");
  const { eq } = await import("drizzle-orm");
  const db = getDb();
  const [room] = await db.select().from(rooms).where(eq(rooms.slug, slug)).limit(1);
  return room ?? null;
}

export async function verifyRoomPassword(slug: string, password: string): Promise<boolean> {
  const room = await getRoomBySlug(slug);
  if (!room?.passwordHash) return true;
  return bcrypt.compare(password, room.passwordHash);
}

export async function updateRoomTitle(roomId: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return null;

  if (isMemoryStoreEnabled()) {
    for (const room of memoryRooms.values()) {
      if (room.id === roomId) {
        room.title = trimmed;
        return room;
      }
    }
    return null;
  }

  const { getDb, rooms } = await import("@together/db");
  const { eq } = await import("drizzle-orm");
  const db = getDb();
  const [updated] = await db
    .update(rooms)
    .set({ title: trimmed })
    .where(eq(rooms.id, roomId))
    .returning();
  return updated ?? null;
}

export async function updateRoomSettings(roomId: string, settings: Partial<RoomSettings>) {
  if (isMemoryStoreEnabled()) {
    for (const room of memoryRooms.values()) {
      if (room.id === roomId) {
        room.settings = roomSettingsSchema.parse({ ...room.settings, ...settings });
        return room;
      }
    }
    return null;
  }

  const { getDb, rooms } = await import("@together/db");
  const { eq } = await import("drizzle-orm");
  const db = getDb();
  const [existing] = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!existing) return null;

  const merged = roomSettingsSchema.parse({ ...existing.settings, ...settings });
  const [updated] = await db
    .update(rooms)
    .set({ settings: merged })
    .where(eq(rooms.id, roomId))
    .returning();

  return updated;
}

export async function getRoomBans(roomId: string) {
  if (isMemoryStoreEnabled()) return [];
  const { getDb, roomBans } = await import("@together/db");
  const { eq } = await import("drizzle-orm");
  const db = getDb();
  return db.select().from(roomBans).where(eq(roomBans.roomId, roomId));
}

export async function savePlaylist(input: {
  userId: string;
  name: string;
  source: "spotify" | "apple" | "youtube" | "mixed";
  items: Array<{
    source: "youtube" | "spotify" | "apple" | "manual";
    title: string;
    artist?: string;
    durationMs?: number;
    externalId?: string;
    isrc?: string;
    resolvedYoutubeId?: string;
    confidence?: number;
    alternates?: unknown;
  }>;
}) {
  if (isMemoryStoreEnabled()) {
    return { id: crypto.randomUUID(), ...input, importedAt: new Date() };
  }

  await ensureUser(input.userId);

  const { getDb, playlists, playlistItems } = await import("@together/db");
  const db = getDb();

  const [playlist] = await db
    .insert(playlists)
    .values({
      userId: input.userId,
      name: input.name,
      source: input.source,
    })
    .returning();

  if (input.items.length > 0) {
    await db.insert(playlistItems).values(
      input.items.map((item, index) => ({
        playlistId: playlist!.id,
        source: item.source,
        title: item.title,
        artist: item.artist,
        durationMs: item.durationMs,
        externalId: item.externalId,
        isrc: item.isrc,
        resolvedYoutubeId: item.resolvedYoutubeId,
        confidence: item.confidence,
        alternates: item.alternates,
        position: index,
      })),
    );
  }

  return playlist;
}

export async function getUserPlaylists(userId: string) {
  if (isMemoryStoreEnabled()) return [];
  const { getDb, playlists } = await import("@together/db");
  const { eq, desc } = await import("drizzle-orm");
  const db = getDb();
  return db
    .select()
    .from(playlists)
    .where(eq(playlists.userId, userId))
    .orderBy(desc(playlists.importedAt));
}

export async function getPlaylistWithItems(playlistId: string) {
  if (isMemoryStoreEnabled()) return null;
  const { getDb, playlists, playlistItems } = await import("@together/db");
  const { eq } = await import("drizzle-orm");
  const db = getDb();
  const [playlist] = await db
    .select()
    .from(playlists)
    .where(eq(playlists.id, playlistId))
    .limit(1);

  if (!playlist) return null;

  const items = await db
    .select()
    .from(playlistItems)
    .where(eq(playlistItems.playlistId, playlistId))
    .orderBy(playlistItems.position);

  return { ...playlist, items };
}

export async function getCachedResolution(sourceKey: string) {
  if (isMemoryStoreEnabled()) return null;
  const { getDb, resolutionCache } = await import("@together/db");
  const { eq } = await import("drizzle-orm");
  const db = getDb();
  const [cached] = await db
    .select()
    .from(resolutionCache)
    .where(eq(resolutionCache.sourceKey, sourceKey))
    .limit(1);
  return cached ?? null;
}

export async function setCachedResolution(
  sourceKey: string,
  youtubeId: string,
  confidence: number,
  alternates?: unknown,
) {
  if (isMemoryStoreEnabled()) return;
  const { getDb, resolutionCache } = await import("@together/db");
  const db = getDb();
  await db
    .insert(resolutionCache)
    .values({ sourceKey, youtubeId, confidence, alternates })
    .onConflictDoUpdate({
      target: resolutionCache.sourceKey,
      set: { youtubeId, confidence, alternates, cachedAt: new Date() },
    });
}

export async function ensureUser(userId: string, email?: string | null) {
  if (isMemoryStoreEnabled()) return;
  const { getDb, users } = await import("@together/db");
  const db = getDb();
  await db
    .insert(users)
    .values({ id: userId, email: email ?? null })
    .onConflictDoNothing();
}

export async function getUserPreferences(userId: string) {
  if (isMemoryStoreEnabled()) return null;
  const { getDb, users } = await import("@together/db");
  const { eq } = await import("drizzle-orm");
  const db = getDb();
  const [row] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.preferences ?? null;
}

export async function saveUserPreferences(
  userId: string,
  email: string | undefined,
  preferences: import("@together/shared").UserAccountPreferences,
) {
  if (isMemoryStoreEnabled()) return preferences;
  const { getDb, users } = await import("@together/db");
  const { eq } = await import("drizzle-orm");
  const { userAccountPreferencesSchema } = await import("@together/shared");
  const db = getDb();
  const parsed = userAccountPreferencesSchema.parse(preferences);

  await ensureUser(userId, email);

  const [existing] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const merged = userAccountPreferencesSchema.parse({
    ...(existing?.preferences ?? {}),
    ...parsed,
  });

  await db.update(users).set({ preferences: merged }).where(eq(users.id, userId));
  return merged;
}

export async function transferRoomOwnership(roomId: string, newOwnerUserId: string) {
  if (isMemoryStoreEnabled()) {
    for (const room of memoryRooms.values()) {
      if (room.id === roomId) {
        room.ownerUserId = newOwnerUserId;
        return room;
      }
    }
    return null;
  }

  const { getDb, rooms } = await import("@together/db");
  const { eq } = await import("drizzle-orm");
  const db = getDb();
  const [updated] = await db
    .update(rooms)
    .set({ ownerUserId: newOwnerUserId })
    .where(eq(rooms.id, roomId))
    .returning();
  return updated ?? null;
}

export async function listPublicRooms(limit = 24) {
  if (isMemoryStoreEnabled()) {
    return [...memoryRooms.values()]
      .filter((r) => r.privacy === "public")
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        privacy: r.privacy,
        createdAt: r.createdAt,
      }));
  }

  const { getDb, rooms } = await import("@together/db");
  const { eq, desc } = await import("drizzle-orm");
  const db = getDb();
  return db
    .select({
      id: rooms.id,
      slug: rooms.slug,
      title: rooms.title,
      privacy: rooms.privacy,
      createdAt: rooms.createdAt,
    })
    .from(rooms)
    .where(eq(rooms.privacy, "public"))
    .orderBy(desc(rooms.createdAt))
    .limit(limit);
}

export async function listOwnedRooms(userId: string, limit = 24) {
  if (isMemoryStoreEnabled()) {
    return [...memoryRooms.values()]
      .filter((r) => r.ownerUserId === userId)
      .slice(0, limit)
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        privacy: r.privacy,
        createdAt: r.createdAt,
      }));
  }

  const { getDb, rooms } = await import("@together/db");
  const { eq, desc } = await import("drizzle-orm");
  const db = getDb();
  return db
    .select({
      id: rooms.id,
      slug: rooms.slug,
      title: rooms.title,
      privacy: rooms.privacy,
      createdAt: rooms.createdAt,
    })
    .from(rooms)
    .where(eq(rooms.ownerUserId, userId))
    .orderBy(desc(rooms.createdAt))
    .limit(limit);
}
