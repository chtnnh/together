import { z } from "zod";
import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_QUEUE_LENGTH,
  MAX_REQUESTS_PER_USER,
  PARTICIPANT_ROLES,
  PRIVACY_LEVELS,
  QUALITY_OPTIONS,
  RESOLVER_STATUSES,
  THEME_PRESETS,
  TRACK_SOURCES,
} from "./constants";

export const displayNameSchema = z
  .string()
  .min(1)
  .max(MAX_DISPLAY_NAME_LENGTH)
  .trim();

export const roomSettingsSchema = z.object({
  audioOnly: z.boolean().default(false),
  theme: z.enum(THEME_PRESETS).default("midnight"),
  accent: z.string().default("#6366f1"),
  quality: z.enum(QUALITY_OPTIONS).default("auto"),
  privacy: z.enum(PRIVACY_LEVELS).default("unlisted"),
  skipThreshold: z.number().min(0.1).max(1).default(0.51),
  controlsLocked: z.boolean().default(true),
  collaborativeQueue: z.boolean().default(true),
  autoPromoteRequests: z.boolean().default(false),
  democraticPromote: z.boolean().default(false),
  slowModeSeconds: z.number().min(0).max(60).default(0),
  profanityFilter: z.boolean().default(false),
  loopMode: z.enum(["off", "track", "queue"]).default("off"),
  maxRequestsPerUser: z.number().min(1).max(20).default(MAX_REQUESTS_PER_USER),
  maxQueueLength: z.number().min(1).max(200).default(MAX_QUEUE_LENGTH),
});

export type RoomSettings = z.infer<typeof roomSettingsSchema>;

export const userAccountPreferencesSchema = z.object({
  theme: z.enum(THEME_PRESETS).optional(),
  audioOnly: z.boolean().optional(),
  quality: z.enum(QUALITY_OPTIONS).optional(),
  volume: z.number().min(0).max(100).optional(),
  muted: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
});

export type UserAccountPreferences = z.infer<typeof userAccountPreferencesSchema>;

export const playbackStateSchema = z.object({
  videoId: z.string().nullable(),
  title: z.string().optional(),
  positionMs: z.number().min(0),
  playing: z.boolean(),
  playbackRate: z.number().default(1),
  version: z.number(),
  updatedAt: z.number(),
  queueItemId: z.string().nullable().optional(),
});

export type PlaybackState = z.infer<typeof playbackStateSchema>;

export const youtubeCandidateSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  channelTitle: z.string(),
  thumbnailUrl: z.string().optional(),
  durationMs: z.number().optional(),
});

export type YoutubeCandidate = z.infer<typeof youtubeCandidateSchema>;

export const queueItemSchema = z.object({
  id: z.string(),
  source: z.enum(TRACK_SOURCES),
  videoId: z.string().nullable(),
  title: z.string(),
  artist: z.string().optional(),
  durationMs: z.number().optional(),
  thumbnailUrl: z.string().optional(),
  addedBy: z.string(),
  addedById: z.string(),
  confidence: z.number().min(0).max(100).optional(),
  alternates: z.array(youtubeCandidateSchema).optional(),
  externalId: z.string().optional(),
  isrc: z.string().optional(),
});

export type QueueItem = z.infer<typeof queueItemSchema>;

export const historyItemSchema = queueItemSchema.extend({
  finishedAt: z.number(),
  reason: z.enum(["skipped", "played"]),
});

export type HistoryItem = z.infer<typeof historyItemSchema>;

export const roomActivitySchema = z.object({
  kind: z.enum(["join", "leave", "promoted", "kicked", "banned", "host"]),
  displayName: z.string(),
  actorName: z.string().optional(),
  role: z.enum(PARTICIPANT_ROLES).optional(),
  you: z.boolean().optional(),
});

export type RoomActivity = z.infer<typeof roomActivitySchema>;

export const requestItemSchema = queueItemSchema.extend({
  status: z.enum(RESOLVER_STATUSES).default("pending"),
  promoteVotes: z.number().default(0),
});

export type RequestItem = z.infer<typeof requestItemSchema>;

export const participantSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  anonId: z.string(),
  userId: z.string().nullable().optional(),
  role: z.enum(PARTICIPANT_ROLES),
  latencyMs: z.number().default(0),
  lastChatAt: z.number().default(0),
});

export type Participant = z.infer<typeof participantSchema>;

export const chatMessageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  senderName: z.string(),
  body: z.string().max(2000),
  createdAt: z.number(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const skipVotesSchema = z.object({
  queueItemId: z.string(),
  votes: z.array(z.string()),
  threshold: z.number(),
});

export type SkipVotes = z.infer<typeof skipVotesSchema>;

export const roomStateSchema = z.object({
  roomId: z.string(),
  slug: z.string(),
  title: z.string().default(""),
  playback: playbackStateSchema,
  queue: z.array(queueItemSchema),
  requests: z.array(requestItemSchema),
  history: z.array(historyItemSchema).default([]),
  participants: z.array(participantSchema),
  chat: z.array(chatMessageSchema),
  skipVotes: skipVotesSchema.nullable(),
  settings: roomSettingsSchema,
  passwordRequired: z.boolean().default(false),
});

export type RoomState = z.infer<typeof roomStateSchema>;

export const createRoomInputSchema = z.object({
  displayName: displayNameSchema,
  title: z.string().min(1).max(64).trim().optional(),
  slug: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  settings: roomSettingsSchema.partial().optional(),
  privacy: z.enum(PRIVACY_LEVELS).default("unlisted"),
  password: z.string().min(4).max(64).optional(),
  inviteToken: z.string().optional(),
});

export const joinRoomInputSchema = z.object({
  roomId: z.string(),
  displayName: displayNameSchema,
  password: z.string().optional(),
  inviteToken: z.string().optional(),
  anonId: z.string(),
  userId: z.string().nullable().optional(),
});

export const trackMetadataSchema = z.object({
  source: z.enum(TRACK_SOURCES),
  title: z.string(),
  artist: z.string().optional(),
  durationMs: z.number().optional(),
  externalId: z.string().optional(),
  isrc: z.string().optional(),
  videoId: z.string().optional(),
});

export type TrackMetadata = z.infer<typeof trackMetadataSchema>;

export const resolutionResultSchema = z.object({
  videoId: z.string().nullable(),
  confidence: z.number().min(0).max(100),
  alternates: z.array(youtubeCandidateSchema),
  matchedTitle: z.string().optional(),
});

export type ResolutionResult = z.infer<typeof resolutionResultSchema>;

export const playlistSourceSchema = z.enum([
  "spotify",
  "apple",
  "youtube",
  "mixed",
]);

export const savedPlaylistSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  source: playlistSourceSchema,
  itemCount: z.number(),
  importedAt: z.string(),
});

export type SavedPlaylist = z.infer<typeof savedPlaylistSchema>;
