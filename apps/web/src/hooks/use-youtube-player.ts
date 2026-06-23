"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaybackState } from "@together/shared";
import {
  getEffectivePlaybackPosition,
  SYNC_CHECK_INTERVAL_MS,
  SYNC_DRIFT_THRESHOLD_MS,
} from "@together/shared";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface UseYouTubePlayerOptions {
  containerId: string;
  playback: PlaybackState | null;
  quality?: string;
  onEnded?: () => void;
  onError?: (code: number) => void;
}

interface UseYouTubePlayerResult {
  ready: boolean;
  resyncView: () => void;
  needsUserGesture: boolean;
  unlockPlayback: () => void;
  durationMs: number;
}

let apiLoaded = false;
let apiLoading = false;
const loadCallbacks: Array<() => void> = [];

const GESTURE_DRIFT_MS = 2000;
const YT_HOST = "https://www.youtube-nocookie.com";

function loadYouTubeApi(): Promise<void> {
  if (apiLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    loadCallbacks.push(resolve);
    if (apiLoading) return;
    apiLoading = true;

    window.onYouTubeIframeAPIReady = () => {
      apiLoaded = true;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
}

function safePlayerCall(player: YT.Player | null, fn: (p: YT.Player) => void) {
  if (!player) return;
  try {
    fn(player);
  } catch {
    // IFrame API throws if the internal iframe was destroyed or not ready yet
  }
}

const LOCKED_PLAYER_VARS: YT.PlayerVars = {
  autoplay: 0,
  controls: 0,
  disablekb: 1,
  fs: 0,
  iv_load_policy: 3,
  modestbranding: 1,
  rel: 0,
  playsinline: 1,
  cc_load_policy: 0,
  enablejsapi: 1,
};

function effectivePositionMs(pb: PlaybackState): number {
  return getEffectivePlaybackPosition(pb);
}

function isPlayableState(state: number): boolean {
  return (
    state === window.YT.PlayerState.PLAYING ||
    state === window.YT.PlayerState.BUFFERING ||
    state === window.YT.PlayerState.CUED
  );
}

export function useYouTubePlayer({
  containerId,
  playback,
  quality = "auto",
  onEnded,
  onError,
}: UseYouTubePlayerOptions): UseYouTubePlayerResult {
  const playerRef = useRef<YT.Player | null>(null);
  const playerReadyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const lastVersionRef = useRef(0);
  const isLocalActionRef = useRef(false);
  const pendingPlayRef = useRef(false);
  const playbackRef = useRef(playback);
  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  const endedForItemRef = useRef<string | null>(null);
  const autoplayUnlockedRef = useRef(false);
  playbackRef.current = playback;
  onEndedRef.current = onEnded;
  onErrorRef.current = onError;

  const qualityRef = useRef(quality);
  qualityRef.current = quality;

  const tryPlay = useCallback((player: YT.Player) => {
    const pb = playbackRef.current;
    if (!pb?.playing) return;

    const state = player.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING) {
      pendingPlayRef.current = false;
      return;
    }

    if (isPlayableState(state)) {
      player.playVideo();
      pendingPlayRef.current = false;
      return;
    }

    pendingPlayRef.current = true;
  }, []);

  const loadVideoAtPosition = useCallback(
    (player: YT.Player, videoId: string, positionSec: number, shouldPlay: boolean) => {
      player.cueVideoById(videoId, positionSec);
      pendingPlayRef.current = shouldPlay;
      if (shouldPlay && autoplayUnlockedRef.current) {
        tryPlay(player);
      } else if (shouldPlay) {
        setNeedsUserGesture(true);
      }
    },
    [tryPlay],
  );

  const refreshDuration = useCallback(() => {
    safePlayerCall(playerRef.current, (player) => {
      const dur = player.getDuration();
      if (dur > 0) {
        setDurationMs(Math.round(dur * 1000));
      }
    });
  }, []);

  const applyPlaybackToPlayer = useCallback(
    (force = false) => {
      const pb = playbackRef.current;
      if (!playerReadyRef.current || !pb || !playerRef.current) return;

      const player = playerRef.current;

      if (!pb.videoId) {
        safePlayerCall(player, (p) => {
          p.stopVideo();
        });
        lastVersionRef.current = pb.version;
        pendingPlayRef.current = false;
        setNeedsUserGesture(false);
        setDurationMs(0);
        return;
      }

      const positionSec = effectivePositionMs(pb) / 1000;

      let currentVideoId: string | undefined;
      safePlayerCall(player, (p) => {
        currentVideoId = p.getVideoData()?.video_id;
      });

      const sameVideo = pb.videoId && currentVideoId && pb.videoId === currentVideoId;

      if (!force && pb.version <= lastVersionRef.current && sameVideo) return;

      isLocalActionRef.current = true;

      if (pb.videoId && pb.videoId !== currentVideoId) {
        loadVideoAtPosition(player, pb.videoId, positionSec, pb.playing);
      } else if (pb.videoId) {
        safePlayerCall(player, (p) => {
          const state = p.getPlayerState();
          if (state === window.YT.PlayerState.ENDED) return;
          const drift = Math.abs(p.getCurrentTime() * 1000 - effectivePositionMs(pb));
          if (drift > SYNC_DRIFT_THRESHOLD_MS) {
            p.seekTo(positionSec, true);
          }
        });
      }

      safePlayerCall(player, (p) => {
        const state = p.getPlayerState();
        if (pb.playing && state !== window.YT.PlayerState.PLAYING) {
          if (state === window.YT.PlayerState.ENDED) {
            p.seekTo(0, true);
          }
          if (autoplayUnlockedRef.current) {
            tryPlay(p);
          } else {
            pendingPlayRef.current = true;
            setNeedsUserGesture(true);
          }
        } else if (!pb.playing && state === window.YT.PlayerState.PLAYING) {
          p.pauseVideo();
          pendingPlayRef.current = false;
          setNeedsUserGesture(false);
        }
      });

      const q = qualityRef.current;
      if (q !== "auto") {
        const qualityMap: Record<string, string> = {
          "720p": "hd720",
          "480p": "large",
          "144p": "tiny",
        };
        safePlayerCall(player, (p) =>
          p.setPlaybackQuality(qualityMap[q] ?? "default"),
        );
      }

      lastVersionRef.current = pb.version;
      refreshDuration();
      setTimeout(() => {
        isLocalActionRef.current = false;
      }, 500);
    },
    [loadVideoAtPosition, refreshDuration, tryPlay],
  );

  const applyPlaybackRef = useRef(applyPlaybackToPlayer);
  applyPlaybackRef.current = applyPlaybackToPlayer;

  useEffect(() => {
    endedForItemRef.current = null;
    setDurationMs(0);
  }, [playback?.queueItemId]);

  useEffect(() => {
    let mounted = true;
    playerReadyRef.current = false;
    setReady(false);
    setNeedsUserGesture(false);
    setDurationMs(0);
    autoplayUnlockedRef.current = false;
    pendingPlayRef.current = false;

    loadYouTubeApi().then(() => {
      if (!mounted) return;
      if (!document.getElementById(containerId)) return;

      playerRef.current = new window.YT.Player(containerId, {
        height: "100%",
        width: "100%",
        host: YT_HOST,
        playerVars: {
          ...LOCKED_PLAYER_VARS,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (!mounted) return;
            playerReadyRef.current = true;
            setReady(true);
            applyPlaybackRef.current(true);
          },
          onStateChange: (event) => {
            if (!mounted) return;

            if (event.data === window.YT.PlayerState.PLAYING) {
              autoplayUnlockedRef.current = true;
              pendingPlayRef.current = false;
              setNeedsUserGesture(false);
              refreshDuration();
            }

            if (
              pendingPlayRef.current &&
              playbackRef.current?.playing &&
              isPlayableState(event.data)
            ) {
              isLocalActionRef.current = true;
              safePlayerCall(event.target, (p) => p.playVideo());
              setTimeout(() => {
                isLocalActionRef.current = false;
              }, 300);
            }

            if (isLocalActionRef.current) return;

            if (event.data === window.YT.PlayerState.ENDED) {
              const pb = playbackRef.current;
              const itemId = pb?.queueItemId;
              if (!itemId || endedForItemRef.current === itemId) return;
              endedForItemRef.current = itemId;
              onEndedRef.current?.();
            }
          },
          onError: (event) => {
            onErrorRef.current?.(event.data);
          },
        },
      });
    });

    return () => {
      mounted = false;
      playerReadyRef.current = false;
      setReady(false);
      safePlayerCall(playerRef.current, (player) => player.destroy());
      playerRef.current = null;
    };
  }, [containerId, refreshDuration]);

  const resyncView = useCallback(() => {
    const pb = playbackRef.current;
    if (!playerReadyRef.current || !pb || !playerRef.current) return;

    safePlayerCall(playerRef.current, (player) => {
      let currentVideoId: string | undefined;
      try {
        currentVideoId = player.getVideoData()?.video_id;
      } catch {
        return;
      }

      if (!pb.videoId) {
        player.stopVideo();
        return;
      }

      const positionSec = effectivePositionMs(pb) / 1000;

      if (pb.videoId !== currentVideoId) {
        loadVideoAtPosition(player, pb.videoId, positionSec, pb.playing);
        return;
      }

      const drift = Math.abs(player.getCurrentTime() * 1000 - effectivePositionMs(pb));
      if (drift > SYNC_DRIFT_THRESHOLD_MS) {
        player.seekTo(positionSec, true);
      }

      const state = player.getPlayerState();
      if (!pb.playing && state === window.YT.PlayerState.PLAYING) {
        player.pauseVideo();
      }
    });
  }, [loadVideoAtPosition]);

  const unlockPlayback = useCallback(() => {
    autoplayUnlockedRef.current = true;
    setNeedsUserGesture(false);
    const pb = playbackRef.current;
    if (!pb || !playerRef.current) return;

    const positionSec = effectivePositionMs(pb) / 1000;
    isLocalActionRef.current = true;

    safePlayerCall(playerRef.current, (player) => {
      let currentVideoId: string | undefined;
      try {
        currentVideoId = player.getVideoData()?.video_id;
      } catch {
        return;
      }

      if (pb.videoId && pb.videoId !== currentVideoId) {
        loadVideoAtPosition(player, pb.videoId, positionSec, pb.playing);
        return;
      }

      if (pb.videoId) {
        player.seekTo(positionSec, true);
        if (pb.playing) {
          tryPlay(player);
        } else {
          player.pauseVideo();
        }
      }
    });

    setTimeout(() => {
      isLocalActionRef.current = false;
    }, 500);
  }, [loadVideoAtPosition, tryPlay]);

  useEffect(() => {
    if (!ready) return;
    applyPlaybackToPlayer(true);
  }, [ready, applyPlaybackToPlayer]);

  useEffect(() => {
    if (!ready) return;
    applyPlaybackToPlayer();
  }, [ready, playback, quality, applyPlaybackToPlayer]);

  useEffect(() => {
    if (!ready || !playerReadyRef.current || !playerRef.current) return;

    const interval = setInterval(() => {
      if (isLocalActionRef.current || !playerReadyRef.current || !playerRef.current) return;
      const pb = playbackRef.current;
      if (!pb?.playing || !pb.videoId) {
        setNeedsUserGesture(false);
        return;
      }

      safePlayerCall(playerRef.current, (player) => {
        const state = player.getPlayerState();
        if (state === window.YT.PlayerState.ENDED) return;

        const expected = effectivePositionMs(pb);
        const actual = player.getCurrentTime() * 1000;
        const drift = Math.abs(actual - expected);

        if (drift > SYNC_DRIFT_THRESHOLD_MS) {
          player.seekTo(expected / 1000, true);
        }

        const blocked =
          !autoplayUnlockedRef.current &&
          pendingPlayRef.current &&
          drift > GESTURE_DRIFT_MS &&
          state !== window.YT.PlayerState.PLAYING &&
          state !== window.YT.PlayerState.BUFFERING;
        setNeedsUserGesture(blocked);
      });
    }, SYNC_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [ready, playback?.playing, playback?.videoId]);

  return { ready, resyncView, needsUserGesture, unlockPlayback, durationMs };
}
