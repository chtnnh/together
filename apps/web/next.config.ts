import type { NextConfig } from "next";
import { config as loadEnv } from "dotenv";
import path from "node:path";

// Load monorepo root .env so YOUTUBE_API_KEY etc. work without duplicating into apps/web
loadEnv({ path: path.join(__dirname, "../../.env") });
loadEnv({ path: path.join(__dirname, "../../.env.local") });

const nextConfig: NextConfig = {
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
