declare namespace YT {
  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }

  interface PlayerOptions {
    height?: string | number;
    width?: string | number;
    videoId?: string;
    host?: string;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: (event: { target: Player }) => void;
      onStateChange?: (event: { data: PlayerState; target: Player }) => void;
    };
  }

  class Player {
    constructor(elementId: string, options: PlayerOptions);
    destroy(): void;
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    loadVideoById(videoId: string, startSeconds?: number): void;
    getCurrentTime(): number;
    getPlayerState(): PlayerState;
    getVideoData(): { video_id: string };
    setPlaybackQuality(quality: string): void;
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
