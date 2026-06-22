"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientEvent, RoomActivity, RoomState, ServerEvent } from "@together/shared";
import { SYNC_CHECK_INTERVAL_MS, SYNC_DRIFT_THRESHOLD_MS } from "@together/shared";
import { getAnonId, getRealtimeUrl } from "@/lib/utils";

interface UseRoomSocketOptions {
  roomId: string;
  displayName: string;
  userId?: string | null;
  enabled?: boolean;
  onKicked?: (reason: string) => void;
  onActivity?: (activity: RoomActivity) => void;
}

const MAX_RECONNECT_ATTEMPTS = 8;

export function useRoomSocket({
  roomId,
  displayName,
  userId,
  enabled = true,
  onKicked,
  onActivity,
}: UseRoomSocketOptions) {
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef<ClientEvent[]>([]);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reconnectAttempt = useRef(0);
  const intentionalClose = useRef(false);
  const anonIdRef = useRef("");
  if (!anonIdRef.current && typeof window !== "undefined") {
    anonIdRef.current = getAnonId();
  }

  const displayNameRef = useRef(displayName);
  const userIdRef = useRef(userId);
  const enabledRef = useRef(enabled);
  const onKickedRef = useRef(onKicked);
  const onActivityRef = useRef(onActivity);
  displayNameRef.current = displayName;
  userIdRef.current = userId;
  enabledRef.current = enabled;
  onKickedRef.current = onKicked;
  onActivityRef.current = onActivity;

  const send = useCallback((event: ClientEvent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    } else {
      pendingRef.current.push(event);
    }
  }, []);

  const closeSocket = useCallback(() => {
    intentionalClose.current = true;
    clearTimeout(reconnectTimeout.current);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "leave" } satisfies ClientEvent));
    }
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const connect = useCallback(() => {
    if (!enabledRef.current || !roomId || !displayNameRef.current) return;

    if (reconnectAttempt.current >= MAX_RECONNECT_ATTEMPTS) {
      setOffline(true);
      setError("Realtime server unavailable. Run: pnpm --filter @together/realtime dev");
      return;
    }

    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    intentionalClose.current = false;

    try {
      const ws = new WebSocket(getRealtimeUrl(roomId));
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttempt.current = 0;
        setConnected(true);
        setOffline(false);
        setError(null);
        ws.send(
          JSON.stringify({
            type: "join",
            roomId,
            displayName: displayNameRef.current,
            anonId: anonIdRef.current || getAnonId(),
            userId: userIdRef.current ?? null,
          } satisfies ClientEvent),
        );
        for (const event of pendingRef.current) {
          ws.send(JSON.stringify(event));
        }
        pendingRef.current = [];
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data as string) as ServerEvent;

        switch (data.type) {
          case "state":
            setRoomState(data.state as RoomState);
            setSynced(true);
            break;
          case "chat":
            setRoomState((prev) => {
              if (!prev) return prev;
              if (prev.chat.some((m) => m.id === data.message.id)) return prev;
              return { ...prev, chat: [...prev.chat, data.message] };
            });
            break;
          case "playback":
            setRoomState((prev) =>
              prev ? { ...prev, playback: data.playback } : prev,
            );
            break;
          case "queue":
            setRoomState((prev) =>
              prev
                ? {
                    ...prev,
                    queue: data.queue,
                    requests: data.requests,
                    history: data.history ?? prev.history,
                  }
                : prev,
            );
            break;
          case "room":
            setRoomState((prev) => (prev ? { ...prev, title: data.title } : prev));
            break;
          case "activity":
            onActivityRef.current?.(data.activity);
            break;
          case "participants":
            setRoomState((prev) => {
              if (!prev) return prev;
              const next = data.participants;
              if (
                prev.participants.length === next.length &&
                prev.participants.every(
                  (p, i) =>
                    p.id === next[i]?.id &&
                    p.displayName === next[i]?.displayName &&
                    p.role === next[i]?.role,
                )
              ) {
                return prev;
              }
              return { ...prev, participants: next };
            });
            break;
          case "skip-votes":
            setRoomState((prev) =>
              prev ? { ...prev, skipVotes: data.skipVotes } : prev,
            );
            break;
          case "settings":
            setRoomState((prev) =>
              prev ? { ...prev, settings: data.settings } : prev,
            );
            break;
          case "error":
            setError(data.message);
            break;
          case "kicked":
            onKickedRef.current?.(data.reason);
            intentionalClose.current = true;
            ws.close();
            break;
        }
      };

      ws.onclose = (event) => {
        wsRef.current = null;
        setConnected(false);
        if (intentionalClose.current || !enabledRef.current) return;

        // Another tab or fresh session replaced this socket — don't fight it.
        if (event.code === 4000) {
          setError("This room is open in another tab");
          return;
        }

        const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 15000);
        reconnectAttempt.current += 1;
        reconnectTimeout.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setOffline(true);
      setError("Could not open WebSocket connection");
    }
  }, [roomId]);

  useEffect(() => {
    if (!enabled || !roomId) {
      closeSocket();
      setConnected(false);
      return;
    }

    if (!displayNameRef.current.trim()) return;

    reconnectAttempt.current = 0;
    connect();

    return () => {
      closeSocket();
    };
  }, [roomId, enabled, connect, closeSocket]);

  const anonId = anonIdRef.current;
  const participant = roomState?.participants.find(
    (p) => p.anonId === anonId || (userId && p.userId === userId),
  );

  const isHostish =
    participant?.role === "host" || participant?.role === "co-host";

  const controlsLocked = roomState?.settings.controlsLocked ?? true;
  const canControlPlayback = !!participant && (isHostish || !controlsLocked);

  const online = connected || (synced && !offline);

  return {
    connected: online,
    synced,
    roomState,
    error,
    offline,
    send,
    participant,
    isHost: isHostish,
    canControlPlayback,
  };
}

export function useLatencyPing(send: (event: ClientEvent) => void) {
  useEffect(() => {
    const interval = setInterval(() => {
      send({ type: "ping", sentAt: Date.now() });
    }, 10000);
    return () => clearInterval(interval);
  }, [send]);
}

export { SYNC_CHECK_INTERVAL_MS, SYNC_DRIFT_THRESHOLD_MS };
