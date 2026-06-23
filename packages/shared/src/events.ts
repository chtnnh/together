import { z } from "zod";
import {
  chatMessageSchema,
  historyItemSchema,
  joinRoomInputSchema,
  playbackStateSchema,
  queueItemSchema,
  requestItemSchema,
  roomActivitySchema,
  roomSettingsSchema,
  trackMetadataSchema,
} from "./schemas";

const clientEventBase = z.object({ type: z.string() });

export const clientEvents = {
  join: joinRoomInputSchema.extend({ type: z.literal("join") }),
  leave: clientEventBase.extend({ type: z.literal("leave") }),
  chat: clientEventBase.extend({
    type: z.literal("chat"),
    body: z.string().min(1).max(2000),
  }),
  playbackUpdate: clientEventBase.extend({
    type: z.literal("playback:update"),
    playback: playbackStateSchema.partial(),
  }),
  playbackSync: clientEventBase.extend({
    type: z.literal("playback:sync"),
    positionMs: z.number(),
  }),
  queueAddRequest: clientEventBase.extend({
    type: z.literal("queue:add-request"),
    item: queueItemSchema.partial().required({ title: true }),
  }),
  queuePromote: clientEventBase.extend({
    type: z.literal("queue:promote"),
    requestId: z.string(),
  }),
  queuePromoteBatch: clientEventBase.extend({
    type: z.literal("queue:promote-batch"),
    requestIds: z.array(z.string()),
  }),
  queueRemove: clientEventBase.extend({
    type: z.literal("queue:remove"),
    itemId: z.string(),
    lane: z.enum(["queue", "requests"]),
  }),
  queueClear: clientEventBase.extend({
    type: z.literal("queue:clear"),
    lane: z.enum(["queue", "requests"]),
  }),
  queueReorder: clientEventBase.extend({
    type: z.literal("queue:reorder"),
    itemId: z.string(),
    newIndex: z.number().min(0),
  }),
  queuePlay: clientEventBase.extend({
    type: z.literal("queue:play"),
    itemId: z.string(),
  }),
  voteSkip: clientEventBase.extend({
    type: z.literal("vote:skip"),
  }),
  queueSkip: clientEventBase.extend({
    type: z.literal("queue:skip"),
  }),
  playbackEnded: clientEventBase.extend({
    type: z.literal("playback:ended"),
  }),
  votePromote: clientEventBase.extend({
    type: z.literal("vote:promote"),
    requestId: z.string(),
  }),
  settingsUpdate: clientEventBase.extend({
    type: z.literal("settings:update"),
    settings: roomSettingsSchema.partial(),
  }),
  roomUpdate: clientEventBase.extend({
    type: z.literal("room:update"),
    title: z.string().min(1).max(64).trim(),
  }),
  kick: clientEventBase.extend({
    type: z.literal("moderation:kick"),
    participantId: z.string(),
  }),
  ban: clientEventBase.extend({
    type: z.literal("moderation:ban"),
    participantId: z.string(),
  }),
  promoteRole: clientEventBase.extend({
    type: z.literal("moderation:promote"),
    participantId: z.string(),
    role: z.enum(["co-host", "guest"]),
  }),
  resolvePick: clientEventBase.extend({
    type: z.literal("resolve:pick"),
    requestId: z.string(),
    videoId: z.string(),
    title: z.string().optional(),
  }),
  ping: clientEventBase.extend({
    type: z.literal("ping"),
    sentAt: z.number(),
  }),
};

export const clientEventSchema = z.discriminatedUnion("type", [
  clientEvents.join,
  clientEvents.leave,
  clientEvents.chat,
  clientEvents.playbackUpdate,
  clientEvents.playbackSync,
  clientEvents.queueAddRequest,
  clientEvents.queuePromote,
  clientEvents.queuePromoteBatch,
  clientEvents.queueRemove,
  clientEvents.queueClear,
  clientEvents.queueReorder,
  clientEvents.queuePlay,
  clientEvents.voteSkip,
  clientEvents.queueSkip,
  clientEvents.playbackEnded,
  clientEvents.votePromote,
  clientEvents.settingsUpdate,
  clientEvents.roomUpdate,
  clientEvents.kick,
  clientEvents.ban,
  clientEvents.promoteRole,
  clientEvents.resolvePick,
  clientEvents.ping,
]);

export type ClientEvent = z.infer<typeof clientEventSchema>;

export const serverEvents = {
  state: z.object({
    type: z.literal("state"),
    state: z.any(),
  }),
  chat: z.object({
    type: z.literal("chat"),
    message: chatMessageSchema,
  }),
  playback: z.object({
    type: z.literal("playback"),
    playback: playbackStateSchema,
  }),
  queue: z.object({
    type: z.literal("queue"),
    queue: z.array(queueItemSchema),
    requests: z.array(requestItemSchema),
    history: z.array(historyItemSchema).optional(),
  }),
  room: z.object({
    type: z.literal("room"),
    title: z.string(),
  }),
  activity: z.object({
    type: z.literal("activity"),
    activity: roomActivitySchema,
  }),
  participants: z.object({
    type: z.literal("participants"),
    participants: z.array(z.any()),
  }),
  skipVotes: z.object({
    type: z.literal("skip-votes"),
    skipVotes: z.any().nullable(),
  }),
  settings: z.object({
    type: z.literal("settings"),
    settings: roomSettingsSchema,
  }),
  error: z.object({
    type: z.literal("error"),
    code: z.string(),
    message: z.string(),
  }),
  kicked: z.object({
    type: z.literal("kicked"),
    reason: z.string(),
  }),
  pong: z.object({
    type: z.literal("pong"),
    sentAt: z.number(),
    serverAt: z.number(),
  }),
  resolveRequest: z.object({
    type: z.literal("resolve:request"),
    requestId: z.string(),
    metadata: trackMetadataSchema,
  }),
};

export const serverEventSchema = z.discriminatedUnion("type", [
  serverEvents.state,
  serverEvents.chat,
  serverEvents.playback,
  serverEvents.queue,
  serverEvents.room,
  serverEvents.activity,
  serverEvents.participants,
  serverEvents.skipVotes,
  serverEvents.settings,
  serverEvents.error,
  serverEvents.kicked,
  serverEvents.pong,
  serverEvents.resolveRequest,
]);

export type ServerEvent = z.infer<typeof serverEventSchema>;

export function parseClientEvent(data: unknown): ClientEvent {
  return clientEventSchema.parse(data);
}

export function createServerEvent<T extends ServerEvent["type"]>(
  type: T,
  payload: Omit<Extract<ServerEvent, { type: T }>, "type">,
): Extract<ServerEvent, { type: T }> {
  return { type, ...payload } as Extract<ServerEvent, { type: T }>;
}
