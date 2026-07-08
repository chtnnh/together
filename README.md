# Together

**Watch and listen together** — sync YouTube playback in real time, build a collaborative queue, vote to skip, and chat with friends. No account required.

**Live:** [together.chtnnhfoundation.org](https://together.chtnnhfoundation.org) · **Source:** [github.com/chtnnh/together](https://github.com/chtnnh/together)

---

## What makes Together different

Most watch-party apps assume desktop, always-on video, and one look for everyone. Together is built for how people actually listen:

| | |
|---|---|
| **Mobile-first** | Video on top, queue and chat in thumb-friendly tabs below. Install as a PWA for a full-screen session on your phone. |
| **Audio-only mode** | Hide the player and keep listening — perfect for music sessions, background listening, or saving bandwidth. Toggle per browser; doesn’t affect anyone else. |
| **Personal themes** | Pick your own accent theme (midnight, ocean, sunset, forest, lavender). Saved locally — your room, your colors. |

---

## Features

### Playback & sync
- Synchronized YouTube playback with drift correction
- **Now-playing bar** — pinned strip with seek, play/pause, skip, volume, and reactions
- **Keyboard shortcuts** — Space, arrows, M, N, `/`, `?` (desktop)
- Seek bar — scrub to any point when you have playback control
- Play any track from the queue on demand (not just “next”)
- Late-join sync (“tap to sync” when autoplay is blocked)
- Header **Sync playback** button and explicit connection status
- Host/co-host play, pause, and skip
- **Open controls mode** — unlock playback so every member can control play/skip/seek and add directly to the queue
- Loop modes: off, repeat current track, repeat queue
- Crossfade between tracks; volume normalization on track change
- Background playback on mobile (tab hidden without pausing the room)
- Unavailable or deleted YouTube videos blocked at import with inline error banner

### Queue & discovery
- Two-lane queue: member **requests** → host **DJ queue**
- Drag-and-drop queue reordering (host/co-host), including touch drag on mobile
- Democratic promote votes on requests (optional)
- Clear all requests or queue in one click
- Queue history with one-click re-add
- YouTube URL paste and search
- Smart track resolution (ISRC-first, fuzzy title/artist matching, alternate picker)
- **Recent rooms** on home and **live public room directory**
- Spotify & SoundCloud import — server routes in place; UI deferred (TODO v0.3)

### Room & moderation
- Public, unlisted, or password-protected rooms with **signed invite links**
- Custom room names; room settings persist across host refresh
- Kick, ban, promote and demote co-hosts
- **Ownership transfer** to signed-in participants
- Vote-to-skip with configurable threshold (votes reset when the track changes)
- Democratic request promotion (optional)

### Chat & personalization
- Text chat with emoji picker and **@mentions** (autocomplete + highlight)
- Slow mode and profanity filter (host settings)
- **Six theme presets** including **High contrast** — personal accent colors
- **Audio-only mode** — hide video on all screen sizes, keep the music going
- Stream quality preference (auto / 720p / 480p / 144p)
- **Reduced motion** toggle; respects `prefers-reduced-motion`
- Activity toasts (join, leave, kick, ban, promote, skip)
- **Share sheet**, **Open Graph** link previews, **Copy Discord status**

### PWA
- Installable app with **Create room** and **Join room** manifest shortcuts
- Service worker caches the app shell; offline fallback page

### Optional (requires Supabase auth)
- Sign in to save room settings, **save/load playlists**, and **sync preferences** across devices

---

## Architecture

```
┌──────────────────────────────┐     WebSocket      ┌────────────────────────────────────┐
│  Next.js (Vercel)            │ ◄────────────────► │  Cloudflare Worker                 │
│  together.chtnnhfoundation…  │                    │  realtime.together.chtnnhfound…    │
└──────────────┬───────────────┘                    │  + Durable Objects (rooms)         │
               │                                    └────────────────────────────────────┘
               │ SQL
               ▼
┌──────────────────────────────┐
│  Supabase Postgres           │
│  (rooms, settings, playlists)│
└──────────────────────────────┘
```

| Package / app | Role |
|---|---|
| `apps/web` | Next.js 15 UI, REST API routes, room pages |
| `services/realtime` | Cloudflare Worker + Durable Object for WebSocket rooms |
| `packages/shared` | Event protocol, Zod schemas, playback math |
| `packages/db` | Drizzle ORM schema + migrations |
| `packages/ui` | Shared React components |
| `packages/track-resolver` | YouTube / ISRC / fuzzy matching |

---

## Prerequisites

- **Node.js** ≥ 22 (required by Wrangler for the realtime dev server)
- **pnpm** 9 (`corepack enable && corepack prepare pnpm@9.15.9 --activate`)
- **PostgreSQL** (local or [Supabase](https://supabase.com))
- **YouTube Data API key** (required for search/import)
- **Cloudflare account** (optional — only if you deploy the realtime worker yourself)
- Optional: Spotify, Apple Music, Supabase auth keys

---

## Local development

### 1. Clone and install

```bash
git clone https://github.com/chtnnh/together.git
cd together
pnpm install
```

### 2. Environment

Copy the example env and fill in values at the **repo root** (monorepo-wide):

```bash
cp .env.example .env
```

Minimum for local dev:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/together
YOUTUBE_API_KEY=your_youtube_api_key
NEXT_PUBLIC_REALTIME_URL=ws://127.0.0.1:8787
NEXT_PUBLIC_APP_URL=http://localhost:3000
ROOM_TOKEN_SECRET=dev-secret-change-me
```

> Env is loaded from the repo root by `apps/web/next.config.ts` and `packages/db/drizzle.config.ts`. You do **not** need to duplicate keys into `apps/web/.env.local` unless you want overrides.

### 3. Database migrations

```bash
pnpm db:migrate
```

This applies all SQL in `packages/db/drizzle/` via Drizzle Kit.

**Production:** point at `.env.prod` without overwriting local `.env`:

```bash
ENV_FILE=.env.prod pnpm db:migrate
```

**Supabase:** use the **Session pooler** URI (port `5432`) for migrations if the direct host fails — `db.*.supabase.co` is IPv6-only and many networks cannot reach it.

Supabase → **Settings → Database → Connection string → Session pooler** (not Transaction / 6543).

```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

For **Vercel runtime**, use the **Transaction pooler** (port `6543`, `?pgbouncer=true`) instead.

Run migrations once from your machine (or CI), not from Vercel serverless.

### 4. Start services

Terminal 1 — realtime worker:

```bash
pnpm --filter @together/realtime dev
# listens on http://127.0.0.1:8787
```

Terminal 2 — web app:

```bash
pnpm --filter @together/web dev
# http://localhost:3000
```

### 5. Verify

- Open [http://localhost:3000](http://localhost:3000) and create a room
- Realtime health: [http://127.0.0.1:8787/health](http://127.0.0.1:8787/health)
- DB health: [http://localhost:3000/api/health/db](http://localhost:3000/api/health/db)

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps via Turborepo |
| `pnpm --filter @together/web dev` | Next.js dev server |
| `pnpm --filter @together/realtime dev` | Cloudflare Worker (Wrangler dev) |
| `pnpm db:migrate` | Apply Drizzle migrations |
| `pnpm db:generate` | Generate migration from schema changes |
| `pnpm --filter @together/web build` | Production build |
| `pnpm --filter @together/web test` | Playwright E2E tests |
| `pnpm typecheck` | Typecheck all packages |

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection (Supabase in prod) |
| `YOUTUBE_API_KEY` | Yes | YouTube Data API v3 |
| `NEXT_PUBLIC_REALTIME_URL` | Yes | WebSocket base — prod: `wss://realtime.together.chtnnhfoundation.org` |
| `NEXT_PUBLIC_APP_URL` | Yes | Public site URL |
| `ROOM_TOKEN_SECRET` | Yes | JWT secret for room tokens (long random string) |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server-side Supabase |
| `SPOTIFY_CLIENT_ID` / `SECRET` | Optional | Spotify playlist import |
| `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` | Optional | Spotify OAuth redirect (client) |
| `APPLE_MUSIC_*` | Optional | Apple MusicKit import |

See [`.env.example`](.env.example) for the full list.

---

## Project structure

```
together/
├── apps/web/              # Next.js app
├── services/realtime/     # Cloudflare Worker + Durable Object
├── packages/
│   ├── shared/            # Protocol & schemas
│   ├── db/                # Drizzle schema + migrations
│   ├── ui/                # Component library
│   └── track-resolver/    # Track matching
├── .env.example
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Testing

```bash
pnpm --filter @together/web test:install   # first time / CI: install Playwright browsers
pnpm --filter @together/web test           # starts web + realtime via Playwright webServer
```

Playwright specs live in `apps/web/e2e/`. Requires **Node.js 22+** (Wrangler dev server).

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| “Connecting…” forever | Worker unreachable — check [realtime health](https://realtime.together.chtnnhfoundation.org/health) and `NEXT_PUBLIC_REALTIME_URL` |
| YouTube search empty | Missing/invalid `YOUTUBE_API_KEY`, or empty override in `apps/web/.env.local` |
| Room create fails | `DATABASE_URL` wrong or migrations not applied |
| `EHOSTUNREACH` on migrate | Direct `db.*.supabase.co` is IPv6-only — use **Session pooler** URI (port 5432) in `.env` |
| WebSocket reconnect loop | Two tabs open for same room; close duplicate tabs |
| “Offline — start realtime server” | Worker unreachable from browser |

---

## Releases

### v0.3.0

- Unified playlist import via the room add bar (YouTube, Spotify, SoundCloud, Apple Music URLs)
- Google OAuth sign-in (Supabase)
- Live participant counts, ephemeral chat, DO lifecycle + room snapshots
- In-room account/playlists modals, 1080p/Max quality, superadmin console

### v0.2.3

- Auth, playlists, and room claim for signed-in users
- Playback sync fixes (server clock offset, drift correction)
- Open Graph preview images and favicon
- Cloudflare Workers Git integration build config

---

## License

Licensed under the [Apache License 2.0](LICENSE).

---

## Acknowledgments

Built by [chtnnh](https://me.chtnnhfoundation.org). v0.3.0 — [together.chtnnhfoundation.org](https://together.chtnnhfoundation.org) · [Source on GitHub](https://github.com/chtnnh/together)
