import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { RoomSettings } from "@together/shared";

export const privacyEnum = pgEnum("privacy", ["public", "unlisted", "private"]);
export const roleEnum = pgEnum("role", ["host", "co-host", "guest"]);
export const trackSourceEnum = pgEnum("track_source", [
  "youtube",
  "spotify",
  "apple",
  "manual",
]);
export const playlistSourceEnum = pgEnum("playlist_source", [
  "spotify",
  "apple",
  "youtube",
  "mixed",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const anonymousSessions = pgTable("anonymous_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  fingerprint: varchar("fingerprint", { length: 128 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 32 }).notNull().unique(),
  title: varchar("title", { length: 64 }),
  ownerUserId: uuid("owner_user_id").references(() => users.id),
  settings: jsonb("settings").$type<RoomSettings>().notNull(),
  privacy: privacyEnum("privacy").notNull().default("unlisted"),
  passwordHash: text("password_hash"),
  inviteToken: text("invite_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const roomBans = pgTable("room_bans", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id")
    .references(() => rooms.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id").references(() => users.id),
  anonFingerprint: varchar("anon_fingerprint", { length: 128 }),
  bannedBy: uuid("banned_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const roomMemberships = pgTable("room_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id")
    .references(() => rooms.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id").references(() => users.id),
  anonId: varchar("anon_id", { length: 128 }),
  displayName: varchar("display_name", { length: 24 }).notNull(),
  role: roleEnum("role").notNull().default("guest"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
});

export const playlists = pgTable("playlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  source: playlistSourceEnum("source").notNull().default("mixed"),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull(),
});

export const playlistItems = pgTable("playlist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  playlistId: uuid("playlist_id")
    .references(() => playlists.id, { onDelete: "cascade" })
    .notNull(),
  source: trackSourceEnum("source").notNull(),
  externalId: varchar("external_id", { length: 128 }),
  title: varchar("title", { length: 512 }).notNull(),
  artist: varchar("artist", { length: 256 }),
  durationMs: integer("duration_ms"),
  isrc: varchar("isrc", { length: 32 }),
  resolvedYoutubeId: varchar("resolved_youtube_id", { length: 32 }),
  confidence: integer("confidence"),
  alternates: jsonb("alternates"),
  position: integer("position").notNull().default(0),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id")
    .references(() => rooms.id, { onDelete: "cascade" })
    .notNull(),
  senderName: varchar("sender_name", { length: 24 }).notNull(),
  senderId: varchar("sender_id", { length: 128 }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const resolutionCache = pgTable("resolution_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceKey: varchar("source_key", { length: 128 }).notNull().unique(),
  youtubeId: varchar("youtube_id", { length: 32 }).notNull(),
  confidence: integer("confidence").notNull(),
  alternates: jsonb("alternates"),
  cachedAt: timestamp("cached_at", { withTimezone: true }).defaultNow().notNull(),
});

export const passwordAttempts = pgTable("password_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  ipAddress: varchar("ip_address", { length: 64 }).notNull(),
  roomSlug: varchar("room_slug", { length: 32 }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  playlists: many(playlists),
  rooms: many(rooms),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  owner: one(users, {
    fields: [rooms.ownerUserId],
    references: [users.id],
  }),
  bans: many(roomBans),
  memberships: many(roomMemberships),
  chatMessages: many(chatMessages),
}));

export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  user: one(users, {
    fields: [playlists.userId],
    references: [users.id],
  }),
  items: many(playlistItems),
}));

export const playlistItemsRelations = relations(playlistItems, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistItems.playlistId],
    references: [playlists.id],
  }),
}));
