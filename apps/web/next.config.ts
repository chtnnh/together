import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";
import path from "node:path";

// Load monorepo root .env so YOUTUBE_API_KEY etc. work without duplicating into apps/web
if (process.env.TOGETHER_SKIP_ENV_FILE !== "1") {
  loadEnv({ path: path.join(__dirname, "../../.env") });
  loadEnv({ path: path.join(__dirname, "../../.env.local") });
}

function publicEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

const nextConfig: NextConfig = {
  ...(process.env.TOGETHER_E2E === "1" ? { devIndicators: false as const } : {}),
  env: {
    NEXT_PUBLIC_SUPABASE_URL: publicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      publicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
      publicEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    NEXT_PUBLIC_APP_URL: publicEnv("NEXT_PUBLIC_APP_URL"),
    NEXT_PUBLIC_REALTIME_URL: publicEnv("NEXT_PUBLIC_REALTIME_URL"),
    NEXT_PUBLIC_SPOTIFY_CLIENT_ID: publicEnv("NEXT_PUBLIC_SPOTIFY_CLIENT_ID"),
  },
  transpilePackages: ["@together/ui", "@together/shared", "@together/db", "@together/track-resolver"],
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://www.youtube-nocookie.com https://js-cdn.music.apple.com",
            "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://open.spotify.com",
            "connect-src 'self' wss://realtime.together.chtnnhfoundation.org ws: wss: https://*.supabase.co https://api.spotify.com https://accounts.spotify.com https://www.googleapis.com https://*.apple.com",
            "img-src 'self' data: blob: https://i.ytimg.com https://*.scdn.co https://*.mzstatic.com",
            "style-src 'self' 'unsafe-inline'",
          ].join("; "),
        },
      ],
    },
  ],
};

export default nextConfig;
