import {
  CHAT_BUFFER_SIZE,
  HISTORY_BUFFER_SIZE,
  PROFANITY_WORDS,
  roomSettingsSchema,
  type ChatMessage,
  type ClientEvent,
  type HistoryItem,
  type Participant,
  type PlaybackState,
  type QueueItem,
  type RequestItem,
  type RoomSettings,
  type RoomState,
  type SkipVotes,
  type ReactionEmoji,
} from "@together/shared";
import { parseClientEvent } from "@together/shared/events";
import { generateId } from "./utils";

const EMPTY_ROOM_GRACE_MS = 5 * 60 * 1000;
const CHAT_NOTICE =
  "Messages aren't saved. Chat clears when the room has been empty for 5 minutes or more.";

type RememberedRole = "host" | "co-host";

interface Session {
  participantId: string;
  ws: WebSocket;
}

export class RoomDurableObject implements DurableObject {
  private sessions = new Map<WebSocket, Session>();
  private state: RoomState;
  private bans = new Set<string>();
  private promoteVotes = new Map<string, Set<string>>();
  private lastPlaybackEndedAt = 0;
  private reactionTimestamps = new Map<string, number[]>();
  private bansHydrated = false;
  private memberRoles = new Map<string, RememberedRole>();

  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {
    this.state = this.createInitialState("");
    void this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<RoomState>("state");
      if (stored) {
        this.state = {
          ...stored,
          title: stored.title ?? "",
          history: stored.history ?? [],
          participants: [],
          chat: [],
        };
      }
      const storedBans = await this.ctx.storage.get<string[]>("bans");
      if (storedBans) {
        this.bans = new Set(storedBans);
      }
      const storedRoles = await this.ctx.storage.get<Record<string, RememberedRole>>("memberRoles");
      if (storedRoles) {
        this.memberRoles = new Map(Object.entries(storedRoles));
      }
    });
  }

  private memberRoleKey(userId: string | null, anonId: string): string {
    return userId ? `user:${userId}` : `anon:${anonId}`;
  }

  private getRememberedRole(userId: string | null, anonId: string): RememberedRole | null {
    return this.memberRoles.get(this.memberRoleKey(userId, anonId)) ?? null;
  }

  private setRememberedRole(
    userId: string | null,
    anonId: string,
    role: RememberedRole | null,
  ) {
    const key = this.memberRoleKey(userId, anonId);
    if (role) this.memberRoles.set(key, role);
    else this.memberRoles.delete(key);
  }

  private async persistMemberRoles() {
    await this.ctx.storage.put("memberRoles", Object.fromEntries(this.memberRoles));
  }

  private hasLiveHost(): boolean {
    return this.state.participants.some((p) => p.role === "host");
  }

  private hasRememberedHost(): boolean {
    return [...this.memberRoles.values()].includes("host");
  }

  private resolveJoinRole(userId: string | null, anonId: string): Participant["role"] {
    const remembered = this.getRememberedRole(userId, anonId);
    if (remembered === "host" && !this.hasLiveHost()) return "host";
    if (remembered === "co-host") return "co-host";
    if (!this.hasLiveHost() && !this.hasRememberedHost()) return "host";
    return "guest";
  }

  private createInitialState(roomId: string): RoomState {
    return {
      roomId,
      slug: roomId,
      title: "",
      playback: {
        videoId: null,
        positionMs: 0,
        playing: false,
        playbackRate: 1,
        version: 0,
        updatedAt: Date.now(),
        queueItemId: null,
      },
      queue: [],
      requests: [],
      history: [],
      participants: [],
      chat: [],
      skipVotes: null,
      settings: roomSettingsSchema.parse({}),
      passwordRequired: false,
    };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/init" && request.method === "POST") {
      const body = (await request.json()) as {
        roomId: string;
        slug: string;
        title?: string;
        settings?: Partial<RoomSettings>;
        passwordRequired?: boolean;
        snapshot?: {
          playback: PlaybackState;
          queue: QueueItem[];
          requests: RequestItem[];
        };
      };
      const previousRoomId = this.state.roomId;
      this.state.roomId = body.roomId;
      this.state.slug = body.slug;
      if (body.title) {
        this.state.title = body.title;
      }
      if (body.settings) {
        const shouldApplyInitSettings =
          !previousRoomId || previousRoomId !== body.roomId;
        if (shouldApplyInitSettings) {
          this.state.settings = roomSettingsSchema.parse({
            ...this.state.settings,
            ...body.settings,
          });
        }
      }
      this.state.passwordRequired = body.passwordRequired ?? false;
      if (
        body.snapshot &&
        this.state.queue.length === 0 &&
        !this.state.playback.videoId
      ) {
        this.state.playback = body.snapshot.playback;
        this.state.queue = body.snapshot.queue;
        this.state.requests = body.snapshot.requests;
      }
      void this.hydrateBansFromDatabase();
      await this.persist();
      return Response.json({ ok: true });
    }

    if (url.pathname === "/state") {
      return Response.json(this.getPublicState());
    }

    if (url.pathname === "/stats") {
      return Response.json({
        participantCount: this.getLiveParticipantCount(),
      });
    }

    if (url.pathname === "/purge" && request.method === "POST") {
      const auth = request.headers.get("authorization");
      if (auth !== `Bearer ${this.env.ROOM_TOKEN_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }

      for (const [ws] of this.sessions) {
        try {
          ws.close(1000, "Room purged");
        } catch {
          // ignore
        }
      }
      this.sessions.clear();

      const { roomId, slug, title, settings, passwordRequired } = this.state;
      this.state = this.createInitialState(roomId);
      this.state.slug = slug;
      this.state.roomId = roomId;
      this.state.title = title;
      this.state.settings = settings;
      this.state.passwordRequired = passwordRequired;
      this.bans.clear();
      this.bansHydrated = false;
      this.memberRoles.clear();
      await this.cancelEmptyRoomAlarm();
      await this.ctx.storage.deleteAll();

      return Response.json({ ok: true });
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.handleSession(server, url);
    return new Response(null, { status: 101, webSocket: client });
  }

  private handleSession(ws: WebSocket, url: URL) {
    ws.accept();
    let participantId: string | null = null;

    ws.addEventListener("message", async (event) => {
      try {
        const data = JSON.parse(event.data as string) as ClientEvent;
        const parsed = parseClientEvent(data);

        if (parsed.type === "join") {
          void this.hydrateBansFromDatabase();
          if (parsed.userId && (await this.isGloballyBanned(parsed.userId))) {
            this.send(ws, {
              type: "error",
              code: "BANNED",
              message: "Your account has been suspended",
            });
            ws.close(4003, "Banned");
            return;
          }
          if (this.isBanned(parsed.anonId, parsed.userId ?? null)) {
            this.send(ws, { type: "error", code: "BANNED", message: "You are banned from this room" });
            ws.close(4003, "Banned");
            return;
          }

          const existing = this.state.participants.find(
            (p) =>
              p.anonId === parsed.anonId ||
              (parsed.userId && p.userId === parsed.userId),
          );

          // Drop stale sockets for the same user — prevents duplicate "ghost" users
          for (const [oldWs, session] of this.sessions) {
            const stale = this.state.participants.find((p) => p.id === session.participantId);
            if (
              stale &&
              (stale.anonId === parsed.anonId ||
                (parsed.userId && stale.userId === parsed.userId))
            ) {
              this.sessions.delete(oldWs);
              try {
                oldWs.close(4000, "Replaced");
              } catch {
                // ignore
              }
            }
          }

          let participant: Participant;

          if (existing) {
            participantId = existing.id;
            participant = {
              ...existing,
              displayName: parsed.displayName,
              anonId: parsed.anonId,
              userId: parsed.userId ?? null,
            };
            this.state.participants = this.state.participants.map((p) =>
              p.id === existing.id ? participant : p,
            );
          } else {
            this.state.participants = this.state.participants.filter(
              (p) =>
                p.anonId !== parsed.anonId &&
                !(parsed.userId && p.userId === parsed.userId),
            );

            participantId = generateId();
            const role = this.resolveJoinRole(parsed.userId ?? null, parsed.anonId);
            participant = {
              id: participantId,
              displayName: parsed.displayName,
              anonId: parsed.anonId,
              userId: parsed.userId ?? null,
              role,
              latencyMs: 0,
              lastChatAt: 0,
            };
            if (role === "host" || role === "co-host") {
              this.setRememberedRole(parsed.userId ?? null, parsed.anonId, role);
              void this.persistMemberRoles();
            }
            this.state.participants = [...this.state.participants, participant];
          }

          const becameHost = !existing && participant.role === "host";

          this.sessions.set(ws, { participantId: participantId!, ws });
          void this.cancelEmptyRoomAlarm();

          this.send(ws, {
            type: "state",
            state: this.getPublicState(participantId!),
            serverNow: Date.now(),
          });
          this.send(ws, { type: "chat:notice", body: CHAT_NOTICE });
          if (!existing) {
            this.broadcast({ type: "participants", participants: this.state.participants }, ws);
          }

          if (becameHost) {
            this.send(ws, {
              type: "activity",
              activity: { kind: "host", displayName: participant.displayName, you: true },
            });
          }
          if (!existing) {
            this.broadcast(
              {
                type: "activity",
                activity: { kind: "join", displayName: participant.displayName },
              },
              ws,
            );
          }
          return;
        }

        if (!participantId) return;
        const participant = this.state.participants.find((p) => p.id === participantId);
        if (!participant) return;

        await this.handleEvent(parsed, participant, ws);
      } catch (err) {
        this.send(ws, {
          type: "error",
          code: "INVALID_EVENT",
          message: err instanceof Error ? err.message : "Invalid event",
        });
      }
    });

    ws.addEventListener("close", () => {
      const session = this.sessions.get(ws);
      if (!session) return;

      this.sessions.delete(ws);
      this.removeParticipant(session.participantId);
      if (this.sessions.size === 0) {
        void this.pausePlaybackForEmptyRoom();
        void this.scheduleEmptyRoomAlarm();
      }
    });
  }

  private removeParticipant(participantId: string) {
    const stillConnected = [...this.sessions.values()].some(
      (s) => s.participantId === participantId,
    );
    if (stillConnected) return;

    const leaving = this.state.participants.find((p) => p.id === participantId);
    this.state.participants = this.state.participants.filter((p) => p.id !== participantId);
    this.broadcast({ type: "participants", participants: this.state.participants });
    if (leaving) {
      this.broadcast({
        type: "activity",
        activity: { kind: "leave", displayName: leaving.displayName },
      });
    }
  }

  private async handleEvent(event: ClientEvent, participant: Participant, ws: WebSocket) {
    switch (event.type) {
      case "chat":
        await this.handleChat(event.body, participant, ws);
        break;
      case "playback:update":
        if (!this.canControlPlayback(participant)) {
          this.send(ws, { type: "error", code: "FORBIDDEN", message: "Controls are locked" });
          return;
        }
        await this.handlePlaybackUpdate(event.playback);
        break;
      case "playback:sync":
        this.send(ws, {
          type: "playback",
          playback: this.getAdjustedPlayback(),
          serverNow: Date.now(),
        });
        break;
      case "queue:add-request":
        await this.handleAddRequest(event.item, participant);
        break;
      case "queue:promote":
        await this.handlePromote(event.requestId, participant);
        break;
      case "queue:promote-batch":
        for (const id of event.requestIds) {
          await this.handlePromote(id, participant);
        }
        break;
      case "queue:remove":
        await this.handleRemove(event.itemId, event.lane, participant);
        break;
      case "queue:clear":
        await this.handleClear(event.lane, participant);
        break;
      case "queue:reorder":
        await this.handleReorder(event.itemId, event.newIndex, participant);
        break;
      case "queue:play":
        if (!this.canControlPlayback(participant)) {
          this.send(ws, { type: "error", code: "FORBIDDEN", message: "Controls are locked" });
          return;
        }
        await this.handlePlayFromQueue(event.itemId);
        break;
      case "vote:skip":
        await this.handleSkipVote(participant);
        break;
      case "queue:skip":
        if (!this.canControlPlayback(participant)) {
          this.send(ws, { type: "error", code: "FORBIDDEN", message: "Controls are locked" });
          return;
        }
        await this.advancePlayback("skipped");
        break;
      case "playback:ended":
        await this.handlePlaybackEnded();
        break;
      case "vote:promote":
        await this.handlePromoteVote(event.requestId, participant);
        break;
      case "settings:update":
        if (this.isHostish(participant)) {
          this.state.settings = roomSettingsSchema.parse({
            ...this.state.settings,
            ...event.settings,
          });
        } else if (
          !this.state.settings.controlsLocked &&
          event.settings.loopMode !== undefined
        ) {
          this.state.settings = roomSettingsSchema.parse({
            ...this.state.settings,
            loopMode: event.settings.loopMode,
          });
        } else {
          this.send(ws, { type: "error", code: "FORBIDDEN", message: "Host only" });
          return;
        }
        await this.persist();
        this.broadcast({ type: "settings", settings: this.state.settings });
        void this.syncSettingsToDatabase(this.state.settings);
        break;
      case "room:update":
        if (!this.isHostish(participant)) {
          this.send(ws, { type: "error", code: "FORBIDDEN", message: "Host only" });
          return;
        }
        this.state.title = event.title;
        await this.persist();
        this.broadcast({ type: "room", title: event.title });
        break;
      case "moderation:kick":
        await this.handleKick(event.participantId, participant);
        break;
      case "moderation:ban":
        await this.handleBan(event.participantId, participant);
        break;
      case "moderation:promote":
        await this.handlePromoteRole(event.participantId, event.role, participant);
        break;
      case "resolve:pick":
        await this.handleResolvePick(event.requestId, event.videoId, event.title, participant);
        break;
      case "ping":
        this.send(ws, { type: "pong", sentAt: event.sentAt, serverAt: Date.now() });
        break;
      case "reaction:send":
        this.handleReaction(event.emoji, participant, ws);
        break;
      case "ownership:transfer":
        await this.handleOwnershipTransfer(event.targetParticipantId, participant);
        break;
      case "leave":
        this.removeParticipant(participant.id);
        try {
          ws.close(1000, "Left room");
        } catch {
          // ignore
        }
        break;
    }
  }

  private canControlPlayback(participant: Participant): boolean {
    if (this.state.settings.controlsLocked) {
      return participant.role === "host" || participant.role === "co-host";
    }
    return participant.role === "host" || participant.role === "co-host" || participant.role === "guest";
  }

  private isHostish(participant: Participant): boolean {
    return participant.role === "host" || participant.role === "co-host";
  }

  private isBanned(anonId: string, userId: string | null): boolean {
    if (this.bans.has(anonId)) return true;
    if (userId && this.bans.has(userId)) return true;
    return false;
  }

  private filterProfanity(text: string): string {
    if (!this.state.settings.profanityFilter) return text;
    let result = text;
    for (const word of PROFANITY_WORDS) {
      result = result.replace(new RegExp(word, "gi"), "*".repeat(word.length));
    }
    return result;
  }

  private handleReaction(emoji: ReactionEmoji, participant: Participant, ws: WebSocket) {
    const now = Date.now();
    const windowMs = 1000;
    const maxBurst = 2;
    const recent = (this.reactionTimestamps.get(participant.id) ?? []).filter(
      (t) => now - t < windowMs,
    );
    if (recent.length >= maxBurst) {
      this.send(ws, {
        type: "error",
        code: "RATE_LIMIT",
        message: "Excited much?",
      });
      return;
    }
    recent.push(now);
    this.reactionTimestamps.set(participant.id, recent);
    this.broadcast({
      type: "reaction",
      reaction: {
        id: generateId(),
        emoji,
        senderName: participant.displayName,
        senderId: participant.id,
        createdAt: now,
      },
    });
  }

  private async handleChat(body: string, participant: Participant, ws: WebSocket) {
    const now = Date.now();
    const slowMode = this.state.settings.slowModeSeconds * 1000;
    if (slowMode > 0 && now - participant.lastChatAt < slowMode) {
      return;
    }

    const message: ChatMessage = {
      id: generateId(),
      senderId: participant.id,
      senderName: participant.displayName,
      body: this.filterProfanity(body),
      createdAt: now,
    };

    participant.lastChatAt = now;
    this.state.chat = [...this.state.chat, message].slice(-CHAT_BUFFER_SIZE);
    this.broadcast({ type: "chat", message }, ws);
    this.send(ws, { type: "chat", message });
  }

  private syncSkipVotesForCurrentTrack() {
    const queueItemId = this.state.playback.queueItemId;
    if (queueItemId) {
      this.state.skipVotes = {
        queueItemId,
        votes: [],
        threshold: this.state.settings.skipThreshold,
      };
    } else {
      this.state.skipVotes = null;
    }
    this.broadcast({ type: "skip-votes", skipVotes: this.state.skipVotes });
  }

  private async handlePlaybackUpdate(partial: Partial<PlaybackState>) {
    const now = Date.now();
    const baseline = this.getAdjustedPlayback();
    const previousQueueItemId = baseline.queueItemId;
    const previousVideoId = baseline.videoId;

    this.state.playback = {
      ...baseline,
      ...partial,
      version: baseline.version + 1,
      updatedAt: now,
    };

    const trackChanged =
      (partial.queueItemId !== undefined && partial.queueItemId !== previousQueueItemId) ||
      (partial.videoId !== undefined && partial.videoId !== previousVideoId);

    if (trackChanged) {
      this.syncSkipVotesForCurrentTrack();
    }

    await this.persist();
    this.broadcastPlayback();
  }

  private broadcastPlayback(exclude?: WebSocket) {
    this.broadcast(
      {
        type: "playback",
        playback: this.getAdjustedPlayback(),
        serverNow: Date.now(),
      },
      exclude,
    );
  }

  private getAdjustedPlayback(): PlaybackState {
    const { playback } = this.state;
    if (!playback.playing) return playback;
    const now = Date.now();
    const elapsed = now - playback.updatedAt;
    return {
      ...playback,
      positionMs: playback.positionMs + elapsed * playback.playbackRate,
      updatedAt: now,
    };
  }

  private async handleAddRequest(
    partial: Partial<QueueItem> & { title: string },
    participant: Participant,
  ) {
    const directToQueue =
      this.isHostish(participant) || !this.state.settings.controlsLocked;

    if (directToQueue) {
      await this.handleAddToQueue(partial, participant);
      return;
    }

    if (!this.state.settings.collaborativeQueue) {
      return;
    }

    const userRequests = this.state.requests.filter((r) => r.addedById === participant.id);
    if (userRequests.length >= this.state.settings.maxRequestsPerUser) {
      return;
    }

    const item: RequestItem = {
      id: generateId(),
      source: partial.source ?? "manual",
      videoId: partial.videoId ?? null,
      title: partial.title,
      artist: partial.artist,
      durationMs: partial.durationMs,
      thumbnailUrl: partial.thumbnailUrl,
      addedBy: participant.displayName,
      addedById: participant.id,
      confidence: partial.confidence,
      alternates: partial.alternates,
      externalId: partial.externalId,
      isrc: partial.isrc,
      status: partial.videoId ? "resolved" : "pending",
      promoteVotes: 0,
    };

    this.state.requests = [...this.state.requests, item];
    await this.persist();
    this.broadcastQueue();

    if (
      this.state.settings.autoPromoteRequests &&
      this.state.queue.length === 0 &&
      item.status === "resolved"
    ) {
      await this.handlePromote(item.id, participant);
    }
  }

  /** Host/co-host tracks skip the request lane and go straight to the DJ queue */
  private async handleAddToQueue(
    partial: Partial<QueueItem> & { title: string },
    participant: Participant,
  ) {
    if (this.state.queue.length >= this.state.settings.maxQueueLength) return;

    if (!partial.videoId) {
      const requestItem: RequestItem = {
        id: generateId(),
        source: partial.source ?? "manual",
        videoId: null,
        title: partial.title,
        artist: partial.artist,
        durationMs: partial.durationMs,
        thumbnailUrl: partial.thumbnailUrl,
        addedBy: participant.displayName,
        addedById: participant.id,
        confidence: partial.confidence,
        alternates: partial.alternates,
        externalId: partial.externalId,
        isrc: partial.isrc,
        status: "needs_pick",
        promoteVotes: 0,
      };
      this.state.requests = [...this.state.requests, requestItem];
      await this.persist();
      this.broadcastQueue();
      return;
    }

    const queueItem: QueueItem = {
      id: generateId(),
      source: partial.source ?? "manual",
      videoId: partial.videoId,
      title: partial.title,
      artist: partial.artist,
      durationMs: partial.durationMs,
      thumbnailUrl: partial.thumbnailUrl,
      addedBy: participant.displayName,
      addedById: participant.id,
      confidence: partial.confidence,
      alternates: partial.alternates,
      externalId: partial.externalId,
      isrc: partial.isrc,
    };

    this.state.queue = [...this.state.queue, queueItem];
    await this.persist();
    this.broadcastQueue();

    if (!this.state.playback.videoId) {
      await this.playQueueItem(queueItem);
    }
  }

  private async handlePromote(requestId: string, participant: Participant) {
    if (!this.isHostish(participant)) return;

    const request = this.state.requests.find((r) => r.id === requestId);
    if (!request || request.status === "needs_pick" || !request.videoId) return;
    if (this.state.queue.length >= this.state.settings.maxQueueLength) return;

    const queueItem: QueueItem = {
      ...request,
      id: generateId(),
    };

    this.state.requests = this.state.requests.filter((r) => r.id !== requestId);
    this.state.queue = [...this.state.queue, queueItem];
    await this.persist();
    this.broadcastQueue();

    if (!this.state.playback.videoId) {
      await this.playQueueItem(queueItem);
    }
  }

  private async archiveCurrentTrack(reason: HistoryItem["reason"]) {
    const currentId = this.state.playback.queueItemId;
    if (!currentId) return;

    const current = this.state.queue.find((i) => i.id === currentId);
    if (!current) return;

    this.state.history = [
      { ...current, finishedAt: Date.now(), reason },
      ...this.state.history,
    ].slice(0, HISTORY_BUFFER_SIZE);

    this.state.queue = this.state.queue.filter((i) => i.id !== currentId);
  }

  private async playQueueItem(item: QueueItem) {
    if (
      this.state.playback.queueItemId &&
      this.state.playback.queueItemId !== item.id
    ) {
      await this.archiveCurrentTrack("skipped");
    }

    await this.handlePlaybackUpdate({
      videoId: item.videoId,
      title: item.title,
      positionMs: 0,
      playing: true,
      queueItemId: item.id,
    });
    this.broadcastQueue();
  }

  private async handleReorder(
    itemId: string,
    newIndex: number,
    participant: Participant,
  ) {
    if (!this.isHostish(participant)) return;

    const oldIndex = this.state.queue.findIndex((i) => i.id === itemId);
    if (oldIndex === -1) return;

    const clampedIndex = Math.min(Math.max(0, newIndex), this.state.queue.length - 1);
    if (oldIndex === clampedIndex) return;

    const queue = [...this.state.queue];
    const [item] = queue.splice(oldIndex, 1);
    queue.splice(clampedIndex, 0, item);
    this.state.queue = queue;
    await this.persist();
    this.broadcastQueue();
  }

  private async handlePlayFromQueue(itemId: string) {
    const item = this.state.queue.find((i) => i.id === itemId);
    if (!item?.videoId) return;

    if (this.state.playback.queueItemId === itemId) {
      await this.handlePlaybackUpdate({ positionMs: 0, playing: true });
      return;
    }

    await this.playQueueItem(item);
  }

  private async handleClear(lane: "queue" | "requests", participant: Participant) {
    if (!this.isHostish(participant)) return;

    if (lane === "queue") {
      const currentId = this.state.playback.queueItemId;
      this.state.queue = currentId
        ? this.state.queue.filter((i) => i.id === currentId)
        : [];
    } else {
      this.state.requests = [];
    }
    await this.persist();
    this.broadcastQueue();
  }

  private async handleRemove(
    itemId: string,
    lane: "queue" | "requests",
    participant: Participant,
  ) {
    if (lane === "queue") {
      const item = this.state.queue.find((i) => i.id === itemId);
      if (!item) return;
      if (!this.isHostish(participant) && item.addedById !== participant.id) return;
      this.state.queue = this.state.queue.filter((i) => i.id !== itemId);
    } else {
      const item = this.state.requests.find((i) => i.id === itemId);
      if (!item) return;
      if (!this.isHostish(participant) && item.addedById !== participant.id) return;
      this.state.requests = this.state.requests.filter((i) => i.id !== itemId);
    }
    await this.persist();
    this.broadcastQueue();
  }

  private async handleSkipVote(participant: Participant) {
    const currentItem = this.state.queue.find((i) => i.id === this.state.playback.queueItemId);
    if (!currentItem || !this.state.skipVotes) return;

    if (this.state.skipVotes.votes.includes(participant.id)) return;

    this.state.skipVotes = {
      ...this.state.skipVotes,
      votes: [...this.state.skipVotes.votes, participant.id],
    };

    const participantCount = Math.max(1, this.state.participants.length);
    const required = Math.ceil(participantCount * this.state.settings.skipThreshold);

    this.broadcast({ type: "skip-votes", skipVotes: this.state.skipVotes });

    if (this.state.skipVotes.votes.length >= required) {
      await this.advancePlayback("skipped");
    }
  }

  private async handlePlaybackEnded() {
    const now = Date.now();
    if (now - this.lastPlaybackEndedAt < 2000) return;
    if (!this.state.playback.playing || !this.state.playback.queueItemId) return;

    this.lastPlaybackEndedAt = now;
    await this.advancePlayback("played");
  }

  private async advancePlayback(reason: "skipped" | "played") {
    const loopMode = this.state.settings.loopMode ?? "off";
    const currentId = this.state.playback.queueItemId;
    const currentIndex = this.state.queue.findIndex((i) => i.id === currentId);
    const current = currentIndex >= 0 ? this.state.queue[currentIndex] : null;

    if (reason === "played" && loopMode === "track" && current?.videoId) {
      await this.handlePlaybackUpdate({
        positionMs: 0,
        playing: true,
      });
      return;
    }

    let nextItem: QueueItem | undefined;
    if (loopMode === "queue" && this.state.queue.length > 0) {
      if (currentIndex >= 0 && currentIndex < this.state.queue.length - 1) {
        nextItem = this.state.queue[currentIndex + 1];
      } else {
        nextItem = this.state.queue[0];
      }
    } else {
      nextItem = currentIndex >= 0 ? this.state.queue[currentIndex + 1] : undefined;
    }

    if (nextItem?.videoId) {
      if (current && nextItem.id !== current.id) {
        await this.archiveCurrentTrack(reason === "skipped" ? "skipped" : "played");
      }
      await this.playQueueItem(nextItem);
    } else {
      if (current) {
        await this.archiveCurrentTrack(reason === "skipped" ? "skipped" : "played");
      }
      await this.handlePlaybackUpdate({
        playing: false,
        positionMs: 0,
        videoId: null,
        queueItemId: null,
        title: undefined,
      });
      this.broadcastQueue();
    }
  }

  private async handlePromoteVote(requestId: string, participant: Participant) {
    if (!this.state.settings.democraticPromote) return;

    let votes = this.promoteVotes.get(requestId) ?? new Set();
    votes.add(participant.id);
    this.promoteVotes.set(requestId, votes);

    const request = this.state.requests.find((r) => r.id === requestId);
    if (!request) return;

    request.promoteVotes = votes.size;
    const required = Math.ceil(
      this.state.participants.length * this.state.settings.skipThreshold,
    );

    if (votes.size >= required) {
      const host = this.state.participants.find((p) => p.role === "host");
      if (host) await this.handlePromote(requestId, host);
    }

    this.broadcastQueue();
  }

  private disconnectParticipant(targetId: string, reason: string) {
    for (const [ws, session] of this.sessions) {
      if (session.participantId === targetId) {
        this.send(ws, { type: "kicked", reason });
        ws.close(4003, "Kicked");
      }
    }
  }

  private async handleKick(targetId: string, actor: Participant) {
    if (!this.isHostish(actor)) return;
    const target = this.state.participants.find((p) => p.id === targetId);
    if (!target) return;

    this.setRememberedRole(target.userId ?? null, target.anonId, null);
    void this.persistMemberRoles();

    this.broadcast({
      type: "activity",
      activity: {
        kind: "kicked",
        displayName: target.displayName,
        actorName: actor.displayName,
      },
    });

    this.disconnectParticipant(targetId, "Kicked by host");
  }

  private async handleBan(targetId: string, actor: Participant) {
    if (actor.role !== "host") return;
    const target = this.state.participants.find((p) => p.id === targetId);
    if (!target) return;

    this.bans.add(target.anonId);
    if (target.userId) this.bans.add(target.userId);
    await this.ctx.storage.put("bans", [...this.bans]);
    void this.syncBanToDatabase(target.anonId, target.userId ?? null, actor.userId ?? null);

    this.setRememberedRole(target.userId ?? null, target.anonId, null);
    void this.persistMemberRoles();

    this.broadcast({
      type: "activity",
      activity: {
        kind: "banned",
        displayName: target.displayName,
        actorName: actor.displayName,
      },
    });

    this.disconnectParticipant(targetId, "Banned from room");
  }

  private async handlePromoteRole(
    targetId: string,
    role: "co-host" | "guest",
    actor: Participant,
  ) {
    if (actor.role !== "host") return;
    const target = this.state.participants.find((p) => p.id === targetId);
    if (!target || target.role === "host") return;
    if (role === "co-host" && target.role !== "guest") return;
    if (role === "guest" && target.role !== "co-host") return;

    this.state.participants = this.state.participants.map((p) =>
      p.id === targetId ? { ...p, role } : p,
    );
    if (role === "co-host") {
      this.setRememberedRole(target.userId ?? null, target.anonId, "co-host");
    } else {
      this.setRememberedRole(target.userId ?? null, target.anonId, null);
    }
    void this.persistMemberRoles();
    this.broadcast({ type: "participants", participants: this.state.participants });
    this.broadcast({
      type: "activity",
      activity: { kind: "promoted", displayName: target.displayName, role },
    });
  }

  private async handleOwnershipTransfer(targetParticipantId: string, actor: Participant) {
    if (actor.role !== "host") return;
    const target = this.state.participants.find((p) => p.id === targetParticipantId);
    if (!target?.userId) return;

    this.state.participants = this.state.participants.map((p) => {
      if (p.id === targetParticipantId) return { ...p, role: "host" as const };
      if (p.id === actor.id) return { ...p, role: "co-host" as const };
      return p;
    });
    this.setRememberedRole(target.userId ?? null, target.anonId, "host");
    this.setRememberedRole(actor.userId ?? null, actor.anonId, "co-host");
    void this.persistMemberRoles();
    await this.persist();
    this.broadcast({ type: "participants", participants: this.state.participants });
    this.broadcast({
      type: "activity",
      activity: {
        kind: "promoted",
        displayName: target.displayName,
        role: "host",
      },
    });
  }

  private async handleResolvePick(
    requestId: string,
    videoId: string,
    title: string | undefined,
    participant: Participant,
  ) {
    const request = this.state.requests.find((r) => r.id === requestId);
    if (!request) return;
    if (request.addedById !== participant.id && !this.isHostish(participant)) return;

    request.videoId = videoId;
    request.title = title ?? request.title;
    request.status = "resolved";
    request.confidence = 100;
    await this.persist();
    this.broadcastQueue();
  }

  private getPublicState(forParticipantId?: string): RoomState {
    const playback = this.getAdjustedPlayback();
    let skipVotes = this.state.skipVotes;

    if (playback.queueItemId) {
      if (!skipVotes || skipVotes.queueItemId !== playback.queueItemId) {
        skipVotes = {
          queueItemId: playback.queueItemId,
          votes: [],
          threshold: this.state.settings.skipThreshold,
        };
        this.state.skipVotes = skipVotes;
      }
    } else {
      skipVotes = null;
      this.state.skipVotes = null;
    }

    return {
      ...this.state,
      playback,
      skipVotes,
      participants: this.state.participants.map((p) => ({
        ...p,
        ...(forParticipantId === p.id ? {} : {}),
      })),
    };
  }

  private broadcastQueue() {
    this.broadcast({
      type: "queue",
      queue: this.state.queue,
      requests: this.state.requests,
      history: this.state.history,
    });
  }

  private send(ws: WebSocket, event: Record<string, unknown>) {
    try {
      ws.send(JSON.stringify(event));
    } catch {
      // connection closed
    }
  }

  private broadcast(event: Record<string, unknown>, exclude?: WebSocket) {
    const message = JSON.stringify(event);
    for (const [ws] of this.sessions) {
      if (ws !== exclude) {
        try {
          ws.send(message);
        } catch {
          // connection closed
        }
      }
    }
  }

  private async persist() {
    const { participants: _p, chat: _c, ...durable } = this.state;
    await this.ctx.storage.put("state", durable);
  }

  private getLiveParticipantCount(): number {
    const ids = new Set<string>();
    for (const session of this.sessions.values()) {
      ids.add(session.participantId);
    }
    return ids.size;
  }

  private async scheduleEmptyRoomAlarm() {
    await this.ctx.storage.setAlarm(Date.now() + EMPTY_ROOM_GRACE_MS);
  }

  /** Pause at current position when the last listener leaves; snapshot for rejoin. */
  private async pausePlaybackForEmptyRoom() {
    const playback = this.getAdjustedPlayback();
    if (!playback.videoId) return;

    this.state.playback = {
      ...playback,
      playing: false,
      updatedAt: Date.now(),
      version: playback.version + 1,
    };
    await this.persist();
    void this.syncSnapshotToDatabase();
  }

  private async cancelEmptyRoomAlarm() {
    const alarm = await this.ctx.storage.getAlarm();
    if (alarm !== null) {
      await this.ctx.storage.deleteAlarm();
    }
  }

  async alarm(): Promise<void> {
    if (this.sessions.size > 0) return;

    await this.syncSnapshotToDatabase();

    const { roomId, slug, title, settings, passwordRequired } = this.state;
    this.state = this.createInitialState(roomId);
    this.state.slug = slug;
    this.state.roomId = roomId;
    this.state.title = title;
    this.state.settings = settings;
    this.state.passwordRequired = passwordRequired;

    this.bans.clear();
    this.bansHydrated = false;
    this.memberRoles.clear();
    await this.ctx.storage.deleteAll();
  }

  /** Best-effort sync of live DO settings to Postgres for owned rooms. */
  private async syncSettingsToDatabase(settings: RoomSettings): Promise<void> {
    const appUrl = this.env.APP_URL;
    const secret = this.env.ROOM_TOKEN_SECRET;
    const slug = this.state.slug;
    if (!appUrl || !secret || !slug) return;

    try {
      await fetch(`${appUrl.replace(/\/$/, "")}/api/internal/rooms/${slug}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(settings),
      });
    } catch {
      // Web app may be unavailable in dev; client PATCH remains fallback.
    }
  }

  private async syncSnapshotToDatabase(): Promise<void> {
    const appUrl = this.env.APP_URL;
    const secret = this.env.ROOM_TOKEN_SECRET;
    const slug = this.state.slug;
    if (!appUrl || !secret || !slug) return;

    try {
      await fetch(`${appUrl.replace(/\/$/, "")}/api/internal/rooms/${slug}/snapshot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          playback: this.state.playback,
          queue: this.state.queue,
          requests: this.state.requests,
          updatedAt: Date.now(),
        }),
      });
    } catch {
      // Best-effort; snapshot may be unavailable in dev.
    }
  }

  private async hydrateBansFromDatabase(): Promise<void> {
    if (this.bansHydrated) return;
    this.bansHydrated = true;

    const appUrl = this.env.APP_URL;
    const secret = this.env.ROOM_TOKEN_SECRET;
    const slug = this.state.slug;
    if (!appUrl || !secret || !slug) return;

    try {
      const res = await fetch(`${appUrl.replace(/\/$/, "")}/api/internal/rooms/${slug}/bans`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { bans?: string[] };
      for (const id of data.bans ?? []) {
        this.bans.add(id);
      }
      await this.ctx.storage.put("bans", [...this.bans]);
    } catch {
      // Best-effort.
    }
  }

  private async isGloballyBanned(userId: string): Promise<boolean> {
    const appUrl = this.env.APP_URL;
    const secret = this.env.ROOM_TOKEN_SECRET;
    if (!appUrl || !secret) return false;

    try {
      const res = await fetch(
        `${appUrl.replace(/\/$/, "")}/api/internal/users/${userId}/banned`,
        { headers: { Authorization: `Bearer ${secret}` } },
      );
      if (!res.ok) return false;
      const data = (await res.json()) as { banned?: boolean };
      return data.banned === true;
    } catch {
      return false;
    }
  }

  private async syncBanToDatabase(
    anonId: string,
    userId: string | null,
    bannedBy: string | null,
  ): Promise<void> {
    const appUrl = this.env.APP_URL;
    const secret = this.env.ROOM_TOKEN_SECRET;
    const slug = this.state.slug;
    if (!appUrl || !secret || !slug) return;

    try {
      await fetch(`${appUrl.replace(/\/$/, "")}/api/internal/rooms/${slug}/bans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ anonId, userId, bannedBy }),
      });
    } catch {
      // Best-effort.
    }
  }
}

export interface Env {
  ROOM: DurableObjectNamespace;
  ENVIRONMENT: string;
  APP_URL?: string;
  ROOM_TOKEN_SECRET?: string;
}
