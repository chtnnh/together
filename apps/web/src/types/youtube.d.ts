declare namespace YT {
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  interface PlayerVars {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    disablekb?: 0 | 1;
    fs?: 0 | 1;
    iv_load_policy?: 1 | 3;
    modestbranding?: 0 | 1;
    rel?: 0 | 1;
    playsinline?: 0 | 1;
    cc_load_policy?: 0 | 1;
    enablejsapi?: 0 | 1;
    origin?: string;
    [key: string]: string | number | undefined;
  }

  interface PlayerOptions {
    height?: string | number;
    width?: string | number;
    videoId?: string;
    host?: string;
    playerVars?: PlayerVars;
    events?: {
      onReady?: (event: { target: Player }) => void;
      onStateChange?: (event: { data: PlayerState; target: Player }) => void;
      onError?: (event: { data: number; target: Player }) => void;
    };
  }

  class Player {
    constructor(elementId: string, options: PlayerOptions);
    destroy(): void;
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    loadVideoById(videoId: string, startSeconds?: number): void;
    cueVideoById(videoId: string, startSeconds?: number): void;
    getCurrentTime(): number;
    getPlayerState(): PlayerState;
    getVideoData(): { video_id: string };
    getDuration(): number;
    setPlaybackQuality(quality: string): void;
    setVolume(volume: number): void;
    getVolume(): number;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL?: string;
    YOUTUBE_API_KEY?: string;
    ROOM_TOKEN_SECRET?: string;
    NEXT_PUBLIC_APP_URL?: string;
    NEXT_PUBLIC_REALTIME_URL?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    SPOTIFY_CLIENT_ID?: string;
    SPOTIFY_CLIENT_SECRET?: string;
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID?: string;
    APPLE_MUSIC_TEAM_ID?: string;
    APPLE_MUSIC_KEY_ID?: string;
    APPLE_MUSIC_PRIVATE_KEY?: string;
  }
}
