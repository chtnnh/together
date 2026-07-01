"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  QueueList,
  RequestList,
  HistoryList,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@together/ui";
import {
  Settings,
  Users,
  Plus,
  Music2,
  ListMusic,
  MessageSquare,
  History,
  RefreshCw,
} from "lucide-react";
import { PlaybackEmbedErrorBanner } from "@/components/playback-embed-error-banner";
import { ConnectionStatus } from "@/components/connection-status";
import { embedErrorMessage, isEmbedBlockedError } from "@/lib/playback-embed-error";
import { useRoomSocket } from "@/hooks/use-room-socket";
import { useYouTubePlayer } from "@/hooks/use-youtube-player";
import { ChatInput, ChatMessages } from "@/components/emoji-chat";
import { NowPlayingBar } from "@/components/now-playing-bar";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";
import { SettingsDrawer } from "@/components/room-settings";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { AlternatePicker } from "@/components/alternate-picker";
import { ParticipantsPanel } from "@/components/participants-panel";
import { getDisplayName, setDisplayName } from "@/lib/utils";
import { ShareInviteButton } from "@/components/share-invite-button";
import { useOnClickOutside } from "@/hooks/use-on-click-outside";
import { useToast } from "@/components/toast";
import type { HistoryItem, RequestItem, RoomActivity, RoomReaction } from "@together/shared";
import { getEffectivePlaybackPosition, roomSettingsSchema } from "@together/shared";
import { shouldToastTrackSkipped } from "@/lib/skip-feedback";

type ImportTrack = {
  source: "youtube";
  videoId?: string | null;
  title: string;
  artist?: string;
  durationMs?: number;
  thumbnailUrl?: string;
  confidence?: number;
};

function isYouTubeUrl(input: string): boolean {
  return /youtube\.com|youtu\.be/.test(input);
}

function activityMessage(activity: RoomActivity): string {
  switch (activity.kind) {
    case "join":
      return `${activity.displayName} joined`;
    case "leave":
      return `${activity.displayName} left`;
    case "host":
      return activity.you ? "You are the host" : `${activity.displayName} is the host`;
    case "promoted":
      return activity.role === "guest"
        ? `${activity.displayName} was demoted to guest`
        : `${activity.displayName} is now ${activity.role?.replace("-", " ")}`;
    case "kicked":
      return `${activity.displayName} was kicked${activity.actorName ? ` by ${activity.actorName}` : ""}`;
    case "banned":
      return `${activity.displayName} was banned${activity.actorName ? ` by ${activity.actorName}` : ""}`;
    default:
      return "Room update";
  }
}

interface RoomClientProps {
  roomId: string;
  slug: string;
  initialTitle?: string;
  initialDisplayName?: string;
  hasOwner?: boolean;
  privacy?: "public" | "unlisted" | "private";
}

export function RoomClient({
  roomId,
  slug,
  initialTitle = "",
  initialDisplayName = "",
  hasOwner = false,
}: RoomClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [displayName, setDisplayNameState] = useState(initialDisplayName);
  const [joined, setJoined] = useState(false);

  useLayoutEffect(() => {
    const stored = getDisplayName();
    if (stored) {
      setDisplayNameState(stored);
      setJoined(true);
    } else if (initialDisplayName) {
      setDisplayNameState(initialDisplayName);
      setJoined(true);
    }
  }, [initialDisplayName]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [mobileTab, setMobileTab] = useState("now-playing");
  const [pickRequest, setPickRequest] = useState<RequestItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ImportTrack[] | null>(null);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("requests");
  const [lastReadChatCount, setLastReadChatCount] = useState(0);
  const [localRoomTitle, setLocalRoomTitle] = useState(initialTitle);
  const [embedError, setEmbedError] = useState<{ code: number; message: string } | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [incomingReactions, setIncomingReactions] = useState<RoomReaction[]>([]);
  const [promoteVotedIds, setPromoteVotedIds] = useState<Set<string>>(() => new Set());
  const chatInitRef = useRef(false);
  const participantsRef = useRef<HTMLDivElement>(null);
  const prevHistoryLenRef = useRef(0);
  const addUrlInputRef = useRef<HTMLInputElement>(null);

  useOnClickOutside(participantsRef, () => setParticipantsOpen(false), participantsOpen);

  const onKicked = useCallback(() => router.push("/?kicked=1"), [router]);

  const onActivity = useCallback(
    (activity: RoomActivity) => {
      toast(activityMessage(activity), activity.kind === "banned" ? "error" : "default");
    },
    [toast],
  );

  const onReaction = useCallback((reaction: RoomReaction) => {
    setIncomingReactions((prev) => [...prev, reaction]);
  }, []);

  const { prefs: userPrefs, setPrefs: setUserPrefs } = useUserPreferences();

  const { connected, synced, roomState, send, participant, isHost, canControlPlayback, error, offline } = useRoomSocket({
    roomId,
    displayName,
    enabled: joined,
    onKicked,
    onActivity,
    onReaction,
    onNotify: (message) => toast(message, "default"),
  });

  const settings = roomState?.settings;
  const playback = roomState?.playback ?? null;

  const handleVotePromote = useCallback(
    (requestId: string) => {
      send({ type: "vote:promote", requestId });
      setPromoteVotedIds((prev) => new Set(prev).add(requestId));
    },
    [send],
  );

  const roomTitle = roomState?.title || localRoomTitle || slug;
  const chatCount = roomState?.chat.length ?? 0;
  const chatIsOpen = sidebarTab === "chat" || mobileTab === "chat";
  const unreadChat = chatIsOpen ? 0 : Math.max(0, chatCount - lastReadChatCount);

  useEffect(() => {
    if (roomState?.title) {
      setLocalRoomTitle(roomState.title);
    }
  }, [roomState?.title]);

  useEffect(() => {
    const history = roomState?.history ?? [];
    if (shouldToastTrackSkipped(history, prevHistoryLenRef.current)) {
      toast("Track skipped!", "success");
    }
    prevHistoryLenRef.current = history.length;
  }, [roomState?.history, toast]);

  useEffect(() => {
    if (!roomState || chatInitRef.current) return;
    chatInitRef.current = true;
    setLastReadChatCount(roomState.chat.length);
  }, [roomState]);

  useEffect(() => {
    if (chatIsOpen) {
      setLastReadChatCount(chatCount);
    }
  }, [chatIsOpen, chatCount]);

  const lastEndedReportRef = useRef<string | null>(null);

  const handlePlaybackEnded = useCallback(() => {
    const itemId = playback?.queueItemId;
    if (!itemId || !playback?.playing) return;
    if (lastEndedReportRef.current === itemId) return;
    lastEndedReportRef.current = itemId;
    send({ type: "playback:ended" });
  }, [playback?.queueItemId, playback?.playing, send]);

  useEffect(() => {
    lastEndedReportRef.current = null;
    setEmbedError(null);
  }, [playback?.queueItemId]);

  const currentQueueItem =
    playback?.queueItemId != null
      ? roomState?.queue.find((item) => item.id === playback.queueItemId)
      : undefined;

  const handleYouTubeError = useCallback(
    (code: number) => {
      const message = embedErrorMessage(code);
      setEmbedError({ code, message });
      toast(message, "error");
    },
    [toast],
  );

  const { ready, resyncView, needsUserGesture, unlockPlayback, durationMs: playerDurationMs } =
    useYouTubePlayer({
      containerId: "youtube-player",
      playback,
      quality: userPrefs.quality,
      volume: userPrefs.volume,
      muted: userPrefs.muted,
      onEnded: handlePlaybackEnded,
      onError: handleYouTubeError,
    });

  // Keep player aligned when toggling audio/video view without changing play/pause
  useEffect(() => {
    if (ready) resyncView();
  }, [userPrefs.audioOnly, ready, resyncView]);

  const handleSyncPlayback = useCallback(() => {
    resyncView();
    if (needsUserGesture) {
      unlockPlayback();
    }
  }, [needsUserGesture, resyncView, unlockPlayback]);

  useEffect(() => {
    if (!joined || !connected) return;
    const stored = sessionStorage.getItem("together_import_items");
    if (!stored) return;
    sessionStorage.removeItem("together_import_items");

    try {
      const items = JSON.parse(stored) as Array<{
        source: string;
        videoId?: string | null;
        title: string;
        artist?: string;
        durationMs?: number;
        confidence?: number;
        alternates?: unknown;
      }>;
      for (const item of items) {
        send({
          type: "queue:add-request",
          item: {
            source: (item.source as "youtube" | "spotify" | "apple" | "manual") ?? "manual",
            videoId: item.videoId ?? null,
            title: item.title,
            artist: item.artist,
            durationMs: item.durationMs,
            confidence: item.confidence,
            alternates: item.alternates as RequestItem["alternates"],
          },
        });
      }
    } catch {
      // ignore invalid import payload
    }
  }, [joined, connected, send]);

  const onPlaybackChange = useCallback(
    (update: Partial<NonNullable<typeof playback>>) => {
      if (!playback) return;
      const positionMs =
        update.positionMs ??
        (playback.playing
          ? getEffectivePlaybackPosition(playback)
          : playback.positionMs);

      send({
        type: "playback:update",
        playback: {
          ...playback,
          ...update,
          positionMs,
          videoId: update.videoId ?? playback.videoId ?? undefined,
        },
      });
    },
    [send, playback],
  );

  const handleJoin = () => {
    if (!displayName.trim()) return;
    setDisplayName(displayName.trim());
    setJoined(true);
  };

  const queueTrack = useCallback(
    (item: ImportTrack) => {
      send({
        type: "queue:add-request",
        item: {
          source: item.source,
          videoId: item.videoId,
          title: item.title,
          artist: item.artist,
          durationMs: item.durationMs,
          thumbnailUrl: item.thumbnailUrl,
          confidence: item.confidence,
        },
      });
      toast(`Added "${item.title}"`, "success");
    },
    [send, toast],
  );

  const reAddFromHistory = useCallback(
    (item: HistoryItem) => {
      send({
        type: "queue:add-request",
        item: {
          source: item.source,
          videoId: item.videoId,
          title: item.title,
          artist: item.artist,
          durationMs: item.durationMs,
          thumbnailUrl: item.thumbnailUrl,
          confidence: item.confidence,
        },
      });
    },
    [send],
  );

  const handleAddUrl = async () => {
    if (!addUrl.trim()) return;
    setLoading(true);
    setAddError(null);
    setSearchResults(null);
    try {
      const query = addUrl.trim();
      const res = await fetch("/api/import/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      if (!res.ok) {
        const message = data.error ?? "Failed to add track";
        setAddError(message);
        toast(message, "error");
        return;
      }

      const items = (Array.isArray(data) ? data : [data]) as ImportTrack[];

      if (items.length > 1 && !isYouTubeUrl(query)) {
        setSearchResults(items);
        return;
      }

      for (const item of items) {
        queueTrack(item);
      }
      setAddUrl("");
    } finally {
      setLoading(false);
    }
  };

  const handlePickSearchResult = (item: ImportTrack) => {
    queueTrack(item);
    setSearchResults(null);
    setAddUrl("");
    setAddError(null);
  };

  const handleRoomTitleUpdate = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === localRoomTitle) return;
    setLocalRoomTitle(trimmed);
    send({ type: "room:update", title: trimmed });
    void fetch(`/api/rooms/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
  };

  const tabBadge = (count: number) =>
    count > 0 ? (
      <span className="ml-1 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-white">
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  const currentTrack = roomState?.queue.find((q) => q.id === playback?.queueItemId);
  const trackDurationMs = Math.max(currentTrack?.durationMs ?? 0, playerDurationMs);

  useKeyboardShortcuts({
    enabled: joined && connected,
    onPlayPause: () => {
      if (!canControlPlayback || !playback) return;
      onPlaybackChange({ playing: !playback.playing });
    },
    onSeekBack: () => {
      if (!canControlPlayback || !playback) return;
      const pos = getEffectivePlaybackPosition(playback);
      onPlaybackChange({ positionMs: Math.max(0, pos - 5000), playing: playback.playing });
    },
    onSeekForward: () => {
      if (!canControlPlayback || !playback) return;
      const pos = getEffectivePlaybackPosition(playback);
      onPlaybackChange({
        positionMs: Math.min(trackDurationMs, pos + 5000),
        playing: playback.playing,
      });
    },
    onSkip: () => {
      if (roomState?.skipVotes && !canControlPlayback) {
        send({ type: "vote:skip" });
        return;
      }
      if (canControlPlayback) send({ type: "queue:skip" });
    },
    onFocusAddUrl: () => addUrlInputRef.current?.focus(),
    onShowHelp: () => setShortcutsOpen(true),
  });

  if (!joined) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
          <h1 className="text-xl font-bold">Join {localRoomTitle || slug}</h1>
          <div>
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayNameState(e.target.value)}
              placeholder="Your name"
              maxLength={24}
              className="mt-1"
            />
          </div>
          <Button className="w-full" onClick={handleJoin}>
            Join room
          </Button>
        </div>
      </div>
    );
  }

  const skipVoteCount = roomState?.skipVotes?.votes.length ?? 0;
  const skipRequired = Math.ceil(
    (roomState?.participants.length ?? 1) * (settings?.skipThreshold ?? 0.51),
  );
  const hasVotedSkip = roomState?.skipVotes?.votes.includes(participant?.id ?? "") ?? false;
  const promoteRequired = skipRequired;

  const requestListProps = {
    items: roomState?.requests ?? [],
    canManage: isHost,
    onRemove: (id: string) => send({ type: "queue:remove", itemId: id, lane: "requests" }),
    onPromote: (id: string) => send({ type: "queue:promote", requestId: id }),
    onClearAll: () => send({ type: "queue:clear", lane: "requests" }),
    onPickAlternate: (id: string) => {
      const req = roomState?.requests.find((r) => r.id === id);
      if (req) setPickRequest(req);
    },
    democraticPromote: settings?.democraticPromote,
    promoteRequired,
    promoteVotedIds,
    onVotePromote: handleVotePromote,
  };

  const canSkip =
    !!roomState?.queue.some((i) => i.id === playback?.queueItemId) ||
    !!roomState?.skipVotes;

  const nowPlayingBar = (
    <NowPlayingBar
      playback={playback}
      title={playback?.title ?? currentTrack?.title}
      artist={currentTrack?.artist}
      thumbnailUrl={
        currentTrack?.thumbnailUrl ??
        (playback?.videoId
          ? `https://i.ytimg.com/vi/${playback.videoId}/default.jpg`
          : undefined)
      }
      durationMs={trackDurationMs}
      ready={ready}
      canControlPlayback={canControlPlayback}
      skipVotes={
        roomState?.skipVotes
          ? {
              voteCount: skipVoteCount,
              required: skipRequired,
              hasVoted: hasVotedSkip,
              onVote: () => send({ type: "vote:skip" }),
            }
          : null
      }
      volume={userPrefs.volume}
      muted={userPrefs.muted}
      onVolumeChange={(volume) => setUserPrefs({ volume })}
      onMutedChange={(muted) => setUserPrefs({ muted })}
      onSeek={(positionMs) =>
        playback && onPlaybackChange({ positionMs, playing: playback.playing })
      }
      onPlayPause={() => playback && onPlaybackChange({ playing: !playback.playing })}
      onSkip={() => send({ type: "queue:skip" })}
      canSkip={canSkip}
      onReactionSend={(emoji) => send({ type: "reaction:send", emoji })}
      incomingReactions={incomingReactions}
    />
  );

  const chatPanel = (
    <>
      <ChatMessages messages={roomState?.chat ?? []} />
      <ChatInput
        onSend={(body) => send({ type: "chat", body })}
        slowModeSeconds={settings?.slowModeSeconds}
        lastChatAt={participant?.lastChatAt}
      />
    </>
  );

  const playbackControls = nowPlayingBar;

  const addTrackHeader = (
    <div className="shrink-0 border-b border-[var(--border)] p-3">
      <div className="flex items-center gap-2">
        <Input
          ref={addUrlInputRef}
          value={addUrl}
          onChange={(e) => {
            setAddUrl(e.target.value);
            if (searchResults) setSearchResults(null);
          }}
          placeholder="YouTube URL or search..."
          onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
          className="min-w-0 flex-1"
        />
        <Button size="icon" onClick={handleAddUrl} disabled={loading} title="Add to queue">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {addError && <p className="mt-2 text-xs text-red-400">{addError}</p>}
      {searchResults && searchResults.length > 0 && (
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1">
          {searchResults.map((item) => (
            <li key={item.videoId ?? item.title}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-[var(--bg-secondary)]"
                onClick={() => handlePickSearchResult(item)}
              >
                {item.thumbnailUrl && (
                  <img src={item.thumbnailUrl} alt="" className="h-8 w-12 shrink-0 rounded object-cover" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {item.title}
                  {item.artist ? (
                    <span className="text-[var(--text-muted)]"> · {item.artist}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const sidebar = (
    <>
      <div className="border-b border-[var(--border)] p-3">
        <div className="flex items-center gap-2">
          <Input
            ref={addUrlInputRef}
            value={addUrl}
            onChange={(e) => {
              setAddUrl(e.target.value);
              if (searchResults) setSearchResults(null);
            }}
            placeholder="YouTube URL or search..."
            onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
            className="min-w-0 flex-1"
          />
          <Button
            size="icon"
            onClick={handleAddUrl}
            disabled={loading}
            title="Add to queue"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {addError && (
          <p className="mt-2 text-xs text-red-400">{addError}</p>
        )}
        {searchResults && searchResults.length > 0 && (
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1">
            {searchResults.map((item) => (
              <li key={item.videoId ?? item.title}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-[var(--bg-secondary)]"
                  onClick={() => handlePickSearchResult(item)}
                >
                  {item.thumbnailUrl && (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="h-8 w-12 shrink-0 rounded object-cover"
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    {item.title}
                    {item.artist ? (
                      <span className="text-[var(--text-muted)]"> · {item.artist}</span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => (window.location.href = `/api/auth/spotify?room=${slug}`)}
          >
            Import Spotify
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => (window.location.href = `/import/soundcloud?room=${slug}`)}
          >
            Import SoundCloud
          </Button>
        </div>
      </div>

      <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-3 mt-2">
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="chat">
            Chat{tabBadge(unreadChat)}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="flex-1 overflow-y-auto px-2">
          <RequestList {...requestListProps} />
        </TabsContent>

        <TabsContent value="queue" className="flex-1 overflow-y-auto px-2">
          <QueueList
            items={roomState?.queue ?? []}
            currentItemId={playback?.queueItemId}
            canManage={isHost}
            canPlay={canControlPlayback}
            onRemove={(id) => send({ type: "queue:remove", itemId: id, lane: "queue" })}
            onClearAll={() => send({ type: "queue:clear", lane: "queue" })}
            onPlay={(id) => send({ type: "queue:play", itemId: id })}
            onReorder={(itemId, newIndex) =>
              send({ type: "queue:reorder", itemId, newIndex })
            }
          />
        </TabsContent>

        <TabsContent value="history" className="flex-1 overflow-y-auto px-2">
          <HistoryList items={roomState?.history ?? []} onReAdd={reAddFromHistory} />
        </TabsContent>

        <TabsContent value="chat" className="flex flex-1 flex-col overflow-hidden">
          {chatPanel}
        </TabsContent>
      </Tabs>
    </>
  );

  return (
    <TooltipProvider>
    <div className="flex h-dvh flex-col md:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate font-semibold">{roomTitle}</h1>
            <ConnectionStatus
              offline={offline}
              connected={connected}
              synced={synced}
              participantCount={roomState?.participants.length ?? 0}
              slug={slug}
            />
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Sync playback"
                  onClick={handleSyncPlayback}
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sync playback</TooltipContent>
            </Tooltip>
            <div className="relative" ref={participantsRef}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2"
                onClick={() => setParticipantsOpen((open) => !open)}
                title="View participants"
              >
                <Users className="h-4 w-4 shrink-0" />
                <span className="text-sm tabular-nums">{roomState?.participants.length ?? 0}</span>
              </Button>
              {participantsOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-xl">
                  <ParticipantsPanel
                    participants={roomState?.participants ?? []}
                    currentId={participant?.id}
                    isHost={isHost}
                    onKick={(id) => send({ type: "moderation:kick", participantId: id })}
                    onBan={(id) => send({ type: "moderation:ban", participantId: id })}
                    onPromote={(id) =>
                      send({ type: "moderation:promote", participantId: id, role: "co-host" })
                    }
                    onDemote={(id) =>
                      send({ type: "moderation:promote", participantId: id, role: "guest" })
                    }
                  />
                </div>
              )}
            </div>
            <ShareInviteButton slug={slug} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Settings"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <div
          className={`relative w-full shrink-0 bg-black ${
            userPrefs.audioOnly ? "hidden" : "aspect-video md:min-h-0 md:flex-1 md:aspect-auto"
          }`}
        >
          <div id="youtube-player" className="h-full w-full" />
          <div
            className={`absolute inset-0 z-10 ${needsUserGesture ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}`}
            aria-hidden={!needsUserGesture}
            onContextMenu={(e) => e.preventDefault()}
            onClick={needsUserGesture ? unlockPlayback : undefined}
          />
          {needsUserGesture && playback?.playing && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
              <button
                type="button"
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white shadow-lg"
                onClick={unlockPlayback}
              >
                Tap to sync playback
              </button>
            </div>
          )}
          {embedError && (
            <PlaybackEmbedErrorBanner
              message={embedError.message}
              canPickAlternate={
                isEmbedBlockedError(embedError.code) &&
                !!currentQueueItem?.alternates?.length &&
                canControlPlayback
              }
              onPickAlternate={() => {
                if (!currentQueueItem) return;
                setPickRequest({
                  ...currentQueueItem,
                  status: "needs_pick",
                } as RequestItem);
              }}
              onDismiss={() => setEmbedError(null)}
            />
          )}
        </div>

        {userPrefs.audioOnly && (
          <div className="flex shrink-0 flex-col items-center justify-center gap-2 py-6 md:flex-1">
            <Music2 className="h-12 w-12 text-[var(--accent)] md:h-16 md:w-16" />
            <p className="px-4 text-center text-lg font-medium">{playback?.title ?? "Nothing playing"}</p>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
          {mobileTab === "now-playing" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
              {userPrefs.audioOnly ? (
                <>
                  <Music2 className="h-12 w-12 text-[var(--accent)]" />
                  <p className="text-center text-lg font-medium">{playback?.title ?? "Nothing playing"}</p>
                </>
              ) : (
                <p className="text-center text-sm text-[var(--text-muted)]">
                  Watch the player above — controls are pinned below.
                </p>
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {(mobileTab === "requests" || mobileTab === "queue") && addTrackHeader}
              <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-2">
                {mobileTab === "requests" && (
                  <RequestList {...requestListProps} />
                )}
                {mobileTab === "queue" && (
                  <QueueList
                    items={roomState?.queue ?? []}
                    currentItemId={playback?.queueItemId}
                    canManage={isHost}
                    canPlay={canControlPlayback}
                    onRemove={(id) => send({ type: "queue:remove", itemId: id, lane: "queue" })}
                    onClearAll={() => send({ type: "queue:clear", lane: "queue" })}
                    onPlay={(id) => send({ type: "queue:play", itemId: id })}
                    onReorder={(itemId, newIndex) =>
                      send({ type: "queue:reorder", itemId, newIndex })
                    }
                  />
                )}
                {mobileTab === "history" && (
                  <HistoryList items={roomState?.history ?? []} onReAdd={reAddFromHistory} />
                )}
              </div>
              {mobileTab === "chat" && (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{chatPanel}</div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[var(--border)] p-4">
          {playbackControls}
        </div>

        <nav className="flex shrink-0 border-t border-[var(--border)] md:hidden">
          {[
            { id: "now-playing", icon: Music2, label: "Now" },
            { id: "requests", icon: ListMusic, label: "Requests" },
            { id: "queue", icon: ListMusic, label: "Queue" },
            { id: "history", icon: History, label: "History" },
            { id: "chat", icon: MessageSquare, label: "Chat", badge: unreadChat },
          ].map(({ id, icon: Icon, label, badge }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMobileTab(id)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
                mobileTab === id ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="flex items-center">
                {label}
                {badge ? tabBadge(badge) : null}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div className="hidden w-96 min-h-0 flex-col border-l border-[var(--border)] md:flex">
        {sidebar}
      </div>

      {shortcutsOpen && <KeyboardShortcutsHelp onClose={() => setShortcutsOpen(false)} />}

      {settingsOpen && (
        <SettingsDrawer
          roomSettings={settings ?? roomSettingsSchema.parse({})}
          roomTitle={localRoomTitle}
          userPrefs={userPrefs}
          isHost={isHost}
          canEditLoop={isHost || !settings?.controlsLocked}
          hasOwner={hasOwner}
          onRoomUpdate={(s) => {
            send({ type: "settings:update", settings: s });
            // Persist to the DB so it stays in sync with the Durable Object.
            // The settings route authorizes ownership server-side (owner-only
            // for claimed rooms), which also keeps settings durable for rooms
            // claimed later in the session.
            if (isHost) {
              void fetch(`/api/rooms/${slug}/settings`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(s),
              });
            }
          }}
          onRoomTitleUpdate={handleRoomTitleUpdate}
          onUserPrefsUpdate={setUserPrefs}
          onClose={() => setSettingsOpen(false)}
          onClaim={() => (window.location.href = "/settings")}
        />
      )}

      {pickRequest && (
        <AlternatePicker
          request={pickRequest}
          onPick={(videoId, title) => {
            if (playback && pickRequest.id === playback.queueItemId) {
              onPlaybackChange({ videoId, title });
              setEmbedError(null);
            } else {
              send({
                type: "resolve:pick",
                requestId: pickRequest.id,
                videoId,
                title,
              });
            }
            setPickRequest(null);
          }}
          onClose={() => setPickRequest(null)}
        />
      )}

      {error && (
        <div className="fixed bottom-4 left-4 z-50 rounded-lg bg-red-600 px-4 py-2 text-sm text-white">
          {error}
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
