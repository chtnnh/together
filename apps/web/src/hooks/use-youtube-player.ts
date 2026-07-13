"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlaybackState } from "@together/shared";
import {
  getEffectivePlaybackPosition,
  SYNC_CHECK_INTERVAL_MS,
  SYNC_DRIFT_THRESHOLD_MS,
} from "@together/shared";
import {
  shouldAttemptBackgroundResume,
} from "@/lib/playback-visibility";
import { CROSSFADE_MS } from "@/lib/playback-crossfade";
import {
  pickBestAvailableQuality,
  qualityPreferenceToYoutubeQuality,
} from "@/lib/youtube-quality";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface UseYouTubePlayerOptions {
  containerId: string;
  playback: PlaybackState | null;
  clockOffsetMs?: number;
  quality?: string;
  audioOnly?: boolean;
  volume?: number;
  muted?: boolean;
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
const FOREGROUND_RESYNC_DRIFT_MS = SYNC_DRIFT_THRESHOLD_MS * 4;
const YT_HOST = "https://www.youtube-nocookie.com";
const CROSSFADE_STEP_MS = 40;

function animatePlayerVolume(
  player: YT.Player,
  from: number,
  to: number,
  durationMs: number,
): Promise<void> {
  return new Promise((resolve) => {
    const steps = Math.max(1, Math.round(durationMs / CROSSFADE_STEP_MS));
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      const level = Math.round(from + ((to - from) * step) / steps);
      try {
        player.setVolume(Math.max(0, Math.min(100, level)));
      } catch {
        // player may be destroyed mid-transition
      }
      if (step >= steps) {
        clearInterval(timer);
        resolve();
      }
    }, CROSSFADE_STEP_MS);
  });
}

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

function effectivePositionMs(pb: PlaybackState, clockOffsetMs = 0): number {
  return getEffectivePlaybackPosition(pb, Date.now(), clockOffsetMs);
}

function isPlayableState(state: number): boolean {
  return (
    state === window.YT.PlayerState.PLAYING ||
    state === window.YT.PlayerState.BUFFERING ||
    state === window.YT.PlayerState.CUED
  );
}

/** Server track-loop restart resets position near 0; natural end extrapolates far past duration. */
const TRACK_LOOP_RESTART_MS = 1500;

function shouldRestartEndedTrack(pb: PlaybackState, clockOffsetMs: number): boolean {
  if (!pb.playing) return false;
  return effectivePositionMs(pb, clockOffsetMs) < TRACK_LOOP_RESTART_MS;
}

function clampSeekMs(positionMs: number, durationMs: number): number {
  if (durationMs <= 0) return Math.max(0, positionMs);
  return Math.min(Math.max(0, positionMs), Math.max(0, durationMs - 750));
}

export function useYouTubePlayer({
  containerId,
  playback,
  clockOffsetMs = 0,
  quality = "auto",
  audioOnly = false,
  volume = 100,
  muted = false,
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
  const clockOffsetRef = useRef(clockOffsetMs);
  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  const endedForItemRef = useRef<string | null>(null);
  const autoplayUnlockedRef = useRef(false);
  const crossfadeInProgressRef = useRef(false);
  const lastNormalizedVideoRef = useRef<string | null>(null);
  const bufferingSinceRef = useRef<number | null>(null);
  const durationMsRef = useRef(durationMs);
  durationMsRef.current = durationMs;
  playbackRef.current = playback;
  clockOffsetRef.current = clockOffsetMs;
  onEndedRef.current = onEnded;
  onErrorRef.current = onError;

  const qualityRef = useRef(quality);
  qualityRef.current = audioOnly ? "144p" : quality;

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const applyVolume = useCallback(() => {
    safePlayerCall(playerRef.current, (player) => {
      const level = Math.max(0, Math.min(100, Math.round(volumeRef.current)));
      player.setVolume(level);
      if (mutedRef.current) {
        player.mute();
      } else {
        player.unMute();
      }
    });
  }, []);

  const tryPlay = useCallback((player: YT.Player) => {
    const pb = playbackRef.current;
    if (!pb?.playing) return;

    const state = player.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING) {
      pendingPlayRef.current = false;
      return;
    }

    if (state === window.YT.PlayerState.PAUSED || isPlayableState(state)) {
      player.playVideo();
      pendingPlayRef.current = false;
      return;
    }

    pendingPlayRef.current = true;
  }, []);

  const loadVideoAtPosition = useCallback(
    (player: YT.Player, videoId: string, positionSec: number, shouldPlay: boolean) => {
      if (shouldPlay && autoplayUnlockedRef.current) {
        player.loadVideoById(videoId, positionSec);
      } else {
        player.cueVideoById(videoId, positionSec);
      }
      pendingPlayRef.current = shouldPlay;
      if (shouldPlay && autoplayUnlockedRef.current) {
        tryPlay(player);
      } else if (shouldPlay) {
        setNeedsUserGesture(true);
      }
    },
    [tryPlay],
  );

  const crossfadeToVideo = useCallback(
    async (
      player: YT.Player,
      videoId: string,
      positionSec: number,
      shouldPlay: boolean,
    ) => {
      if (crossfadeInProgressRef.current) {
        loadVideoAtPosition(player, videoId, positionSec, shouldPlay);
        return;
      }

      crossfadeInProgressRef.current = true;
      const targetVol = mutedRef.current
        ? 0
        : Math.max(0, Math.min(100, Math.round(volumeRef.current)));

      try {
        await animatePlayerVolume(player, targetVol, 0, CROSSFADE_MS / 2);
        player.cueVideoById(videoId, positionSec);
        pendingPlayRef.current = shouldPlay;
        if (shouldPlay && autoplayUnlockedRef.current) {
          tryPlay(player);
        } else if (shouldPlay) {
          setNeedsUserGesture(true);
        }
        await new Promise((resolve) => setTimeout(resolve, 80));
        await animatePlayerVolume(player, 0, targetVol, CROSSFADE_MS / 2);
        if (!mutedRef.current) {
          player.unMute();
        }
      } finally {
        crossfadeInProgressRef.current = false;
      }
    },
    [loadVideoAtPosition, tryPlay],
  );

  const refreshDuration = useCallback(() => {
    safePlayerCall(playerRef.current, (player) => {
      const dur = player.getDuration();
      if (dur > 0) {
        setDurationMs(Math.round(dur * 1000));
      }
    });
  }, []);

  const applyQualityToPlayer = useCallback((player: YT.Player) => {
    const q = qualityRef.current;
    if (q === "auto") return;

    safePlayerCall(player, (p) => {
      if (q === "max") {
        const levels =
          (p as YT.Player & { getAvailableQualityLevels?: () => string[] }).getAvailableQualityLevels?.() ??
          [];
        const picked = pickBestAvailableQuality(levels, "max");
        if (picked) p.setPlaybackQuality(picked);
        return;
      }

      const mapped = qualityPreferenceToYoutubeQuality(
        q as "1080p" | "720p" | "480p" | "144p" | "auto" | "max",
      );
      if (mapped) p.setPlaybackQuality(mapped);
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

      const positionSec =
        clampSeekMs(
          effectivePositionMs(pb, clockOffsetRef.current),
          durationMsRef.current,
        ) / 1000;

      let currentVideoId: string | undefined;
      safePlayerCall(player, (p) => {
        currentVideoId = p.getVideoData()?.video_id;
      });

      const sameVideo = pb.videoId && currentVideoId && pb.videoId === currentVideoId;

      if (!force && pb.version <= lastVersionRef.current && sameVideo) return;

      isLocalActionRef.current = true;

      if (pb.videoId && pb.videoId !== currentVideoId) {
        let wasPlaying = false;
        safePlayerCall(player, (p) => {
          wasPlaying =
            pb.playing &&
            !!currentVideoId &&
            p.getPlayerState() === window.YT.PlayerState.PLAYING;
        });
        if (wasPlaying) {
          void crossfadeToVideo(player, pb.videoId, positionSec, pb.playing);
        } else {
          loadVideoAtPosition(player, pb.videoId, positionSec, pb.playing);
        }
      } else if (pb.videoId) {
        safePlayerCall(player, (p) => {
          const state = p.getPlayerState();
          if (state === window.YT.PlayerState.ENDED) return;
          if (state === window.YT.PlayerState.BUFFERING) return;
          const expected = clampSeekMs(
            effectivePositionMs(pb, clockOffsetRef.current),
            durationMsRef.current,
          );
          const drift = Math.abs(p.getCurrentTime() * 1000 - expected);
          if (drift > SYNC_DRIFT_THRESHOLD_MS) {
            p.seekTo(expected / 1000, true);
          }
        });
      }

      safePlayerCall(player, (p) => {
        const state = p.getPlayerState();
        if (pb.playing && state !== window.YT.PlayerState.PLAYING) {
          if (state === window.YT.PlayerState.ENDED) {
            if (shouldRestartEndedTrack(pb, clockOffsetRef.current)) {
              const restartMs = clampSeekMs(
                effectivePositionMs(pb, clockOffsetRef.current),
                durationMsRef.current,
              );
              p.seekTo(restartMs / 1000, true);
              if (autoplayUnlockedRef.current) {
                tryPlay(p);
              }
            }
          } else if (autoplayUnlockedRef.current) {
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

      applyQualityToPlayer(player);

      lastVersionRef.current = pb.version;
      refreshDuration();
      setTimeout(() => {
        isLocalActionRef.current = false;
      }, 500);
    },
    [loadVideoAtPosition, crossfadeToVideo, refreshDuration, tryPlay, applyQualityToPlayer],
  );

  const applyPlaybackRef = useRef(applyPlaybackToPlayer);
  applyPlaybackRef.current = applyPlaybackToPlayer;

  useEffect(() => {
    endedForItemRef.current = null;
    bufferingSinceRef.current = null;
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
            applyVolume();
            applyPlaybackRef.current(true);
            if (playerRef.current) applyQualityToPlayer(playerRef.current);
          },
          onStateChange: (event) => {
            if (!mounted) return;

            if (event.data === window.YT.PlayerState.PLAYING) {
              autoplayUnlockedRef.current = true;
              pendingPlayRef.current = false;
              setNeedsUserGesture(false);
              refreshDuration();
              safePlayerCall(event.target, (p) => {
                const vid = p.getVideoData()?.video_id;
                if (vid && vid !== lastNormalizedVideoRef.current) {
                  lastNormalizedVideoRef.current = vid;
                  applyVolume();
                }
              });
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
  }, [containerId, refreshDuration, applyVolume]);

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

      const positionSec = effectivePositionMs(pb, clockOffsetRef.current) / 1000;

      if (pb.videoId !== currentVideoId) {
        loadVideoAtPosition(player, pb.videoId, positionSec, pb.playing);
        return;
      }

      const drift = Math.abs(
        player.getCurrentTime() * 1000 - effectivePositionMs(pb, clockOffsetRef.current),
      );
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
    safePlayerCall(playerRef.current, (player) => {
      const pb = playbackRef.current;
      if (!pb?.videoId || document.hidden) return;
      const state = player.getPlayerState();
      if (state === window.YT.PlayerState.BUFFERING) return;
      const expected = effectivePositionMs(pb, clockOffsetMs);
      const drift = Math.abs(player.getCurrentTime() * 1000 - expected);
      if (drift > FOREGROUND_RESYNC_DRIFT_MS) {
        player.seekTo(expected / 1000, true);
      }
    });
  }, [ready, clockOffsetMs]);

  useEffect(() => {
    if (!ready) return;
    applyPlaybackToPlayer();
  }, [ready, playback, quality, audioOnly, applyPlaybackToPlayer]);

  useEffect(() => {
    if (!ready) return;
    applyVolume();
  }, [ready, volume, muted, applyVolume]);

  useEffect(() => {
    if (!ready) return;

    const onVisibilityChange = () => {
      const pb = playbackRef.current;
      if (!pb?.videoId) return;

      if (document.hidden) {
        if (!shouldAttemptBackgroundResume(true, !!pb.playing)) return;
        safePlayerCall(playerRef.current, (player) => {
          const state = player.getPlayerState();
          if (
            state !== window.YT.PlayerState.PLAYING &&
            state !== window.YT.PlayerState.BUFFERING
          ) {
            tryPlay(player);
          }
        });
        return;
      }

      safePlayerCall(playerRef.current, (player) => {
        const state = player.getPlayerState();
        const expected = effectivePositionMs(pb, clockOffsetRef.current);
        const drift = Math.abs(player.getCurrentTime() * 1000 - expected);
        if (state !== window.YT.PlayerState.BUFFERING && drift > FOREGROUND_RESYNC_DRIFT_MS) {
          player.seekTo(expected / 1000, true);
        }
        if (pb.playing) {
          tryPlay(player);
        } else if (state === window.YT.PlayerState.PLAYING) {
          player.pauseVideo();
        }
      });
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [ready, tryPlay]);

  useEffect(() => {
    if (!ready || !playerReadyRef.current || !playerRef.current) return;

    const interval = setInterval(() => {
      if (
        isLocalActionRef.current ||
        crossfadeInProgressRef.current ||
        !playerReadyRef.current ||
        !playerRef.current
      ) {
        return;
      }
      const pb = playbackRef.current;
      if (!pb?.videoId) {
        setNeedsUserGesture(false);
        return;
      }

      safePlayerCall(playerRef.current, (player) => {
        const state = player.getPlayerState();
        const pb = playbackRef.current;
        if (!pb) return;

        if (state === window.YT.PlayerState.ENDED) {
          if (
            shouldRestartEndedTrack(pb, clockOffsetRef.current) &&
            autoplayUnlockedRef.current
          ) {
            const restartMs = clampSeekMs(
              effectivePositionMs(pb, clockOffsetRef.current),
              durationMsRef.current,
            );
            player.seekTo(restartMs / 1000, true);
            tryPlay(player);
          }
          return;
        }

        if (document.hidden) {
          if (
            pb.playing &&
            autoplayUnlockedRef.current &&
            state !== window.YT.PlayerState.PLAYING &&
            state !== window.YT.PlayerState.BUFFERING
          ) {
            tryPlay(player);
          }
          return;
        }

        const expected = clampSeekMs(
          effectivePositionMs(pb, clockOffsetRef.current),
          durationMsRef.current,
        );
        const actual = player.getCurrentTime() * 1000;
        const drift = Math.abs(actual - expected);

        if (state === window.YT.PlayerState.BUFFERING) {
          const since = bufferingSinceRef.current ?? Date.now();
          bufferingSinceRef.current = since;
          if (
            Date.now() - since > 10_000 &&
            pb.playing &&
            autoplayUnlockedRef.current
          ) {
            bufferingSinceRef.current = Date.now();
            player.seekTo(expected / 1000, true);
            tryPlay(player);
          }
        } else {
          bufferingSinceRef.current = null;
          if (drift > SYNC_DRIFT_THRESHOLD_MS) {
            player.seekTo(expected / 1000, true);
          }
        }

        if (pb.playing) {
          if (state !== window.YT.PlayerState.PLAYING && state !== window.YT.PlayerState.BUFFERING) {
            if (autoplayUnlockedRef.current) {
              tryPlay(player);
            } else if (pendingPlayRef.current && drift > GESTURE_DRIFT_MS) {
              setNeedsUserGesture(true);
            }
          } else {
            setNeedsUserGesture(false);
          }
        } else if (state === window.YT.PlayerState.PLAYING) {
          player.pauseVideo();
        }
      });
    }, SYNC_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [ready, playback?.playing, playback?.videoId, clockOffsetMs, tryPlay]);

  return { ready, resyncView, needsUserGesture, unlockPlayback, durationMs };
}
