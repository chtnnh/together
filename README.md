# Together

**Watch and listen together** — sync YouTube playback in real time, build a collaborative queue, vote to skip, and chat with friends. No account required.

**Production:** [https://together.chtnnhfoundation.org](https://together.chtnnhfoundation.org) · Realtime: `wss://realtime.together.chtnnhfoundation.org`

**Repository:** [github.com/chtnnh/together](https://github.com/chtnnh/together)

---

## Features (v0.1.0)

### Playback & sync
- Synchronized YouTube playback with drift correction
- Late-join sync (“tap to sync” when autoplay is blocked)
- Host/co-host play, pause, and skip
- **Open controls mode** — unlock playback so every member can control play/skip and add directly to the queue
- Loop modes: off, repeat current track, repeat queue
- Queue history (played / skipped tracks)

### Queue & discovery
- Two-lane queue: member **requests** → host **DJ queue**
- YouTube URL paste and search
- Spotify & Apple Music playlist import (optional OAuth / API keys)
- Smart track resolution (ISRC-first, fuzzy title/artist matching, alternate picker)

### Room & moderation
- Public, unlisted, or password-protected rooms
- Custom room names
- Kick, ban, promote co-hosts
- Vote-to-skip with configurable threshold
- Democratic request promotion (optional)

### Chat & personalization
- Text chat with emoji picker
- Slow mode and profanity filter (host settings)
- Per-user theme, audio-only mode, and stream quality (local to each browser)
- Mobile layout + PWA install
- Activity toasts (join, leave, kick, ban, promote)

### Optional (requires Supabase auth)
- Sign in to save room settings and cross-provider playlists

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

- **Node.js** ≥ 20
- **pnpm** 9 (`corepack enable && corepack prepare pnpm@9.15.9 --activate`)
- **PostgreSQL** (local or [Supabase](https://supabase.com))
- **YouTube Data API key** (required for search/import)
- **Cloudflare account** (production realtime)
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

## Production deployment

Target: **https://together.chtnnhfoundation.org**

### Step 1 — Supabase (database)

1. Create a Supabase project (if not done).
2. **Settings → Database → Connection string → URI** (direct, port 5432).
3. From your machine (Session pooler URI in `.env` — see note above):

   ```bash
   pnpm db:migrate
   ```

4. Confirm tables exist in the Supabase SQL editor (`rooms`, `users`, etc.).

5. **Auth (v0.1.0):** Supabase dashboard → Authentication → URL configuration:
   - **Site URL:** `https://together.chtnnhfoundation.org`
   - **Redirect URLs:** `https://together.chtnnhfoundation.org/settings` (magic-link sign-in)

For the **Vercel runtime**, use the **Transaction pooler** URI (port 6543, `?pgbouncer=true`) as `DATABASE_URL` — better for serverless.

### Step 2 — Cloudflare Worker (realtime)

Realtime: **`wss://realtime.together.chtnnhfoundation.org`**

1. Deploy (Custom Domain + DNS are configured on deploy):

   ```bash
   cd services/realtime
   npx wrangler deploy --env production
   ```

   `wrangler.toml` uses `custom_domain = true`, so Cloudflare creates the DNS record and TLS cert for `realtime.together.chtnnhfoundation.org` automatically (zone `chtnnhfoundation.org` must be on the same account).

2. If the subdomain still doesn’t resolve, add it manually in **Workers → together-realtime-production → Settings → Domains & Routes → Add → Custom domain** → `realtime.together.chtnnhfoundation.org`.

3. Health check:

   ```bash
   curl https://realtime.together.chtnnhfoundation.org/health
   ```

4. Set on Vercel: `NEXT_PUBLIC_REALTIME_URL=wss://realtime.together.chtnnhfoundation.org`

### Step 2b — DNS summary (Cloudflare zone: chtnnhfoundation.org)

| Hostname | Type | Target | Notes |
|---|---|---|---|
| `realtime.together` | (auto) | Worker custom domain | Created by `wrangler deploy --env production` |
| `together` | CNAME | `cname.vercel-dns.com` (Vercel gives exact target) | **DNS only** (grey cloud) recommended for Vercel SSL |

### Step 3 — Vercel (web)

Vercel fits this stack (Next.js 15, serverless API routes, custom domains). Point **together.chtnnhfoundation.org** at the Vercel project.

1. Import [github.com/chtnnh/together](https://github.com/chtnnh/together) in [Vercel](https://vercel.com).
2. Set **Root Directory** to `apps/web`.
3. Vercel reads [`apps/web/vercel.json`](apps/web/vercel.json):
   - Install: `cd ../.. && pnpm install`
   - Build: `cd ../.. && pnpm --filter @together/web build`
4. Add environment variables (Production):

   ```env
   DATABASE_URL=postgresql://...pooler...6543/postgres?pgbouncer=true
   YOUTUBE_API_KEY=...
   NEXT_PUBLIC_REALTIME_URL=wss://realtime.together.chtnnhfoundation.org
   NEXT_PUBLIC_APP_URL=https://together.chtnnhfoundation.org
   ROOM_TOKEN_SECRET=<openssl rand -hex 32>
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

   Supabase auth is enabled for v0.1.0 (saved playlists / owned rooms). Spotify and Apple Music imports are optional — skip those env vars unless you add them later.

5. Add domain **together.chtnnhfoundation.org** in Vercel → **Settings → Domains**.
6. Vercel shows a CNAME target (e.g. `cname.vercel-dns.com`). In **Cloudflare DNS**, add:

   | Type | Name | Target | Proxy |
   |---|---|---|---|
   | CNAME | `together` | *(paste from Vercel)* | DNS only (grey cloud) |

7. Wait for Vercel to show **Valid Configuration**, then deploy (or redeploy).

### Step 4 — Post-deploy checks

- [ ] Landing page loads at production URL
- [ ] Create room → redirects to `/r/{slug}`
- [ ] WebSocket connects (no perpetual “Connecting…” in room header)
- [ ] YouTube search/add works
- [ ] Two browsers stay in sync
- [ ] `/api/health/db` returns OK

### CSP / CORS notes

- `next.config.ts` CSP allows `ws:` / `wss:` for realtime.
- Realtime is served from `realtime.together.chtnnhfoundation.org` — no extra CSP changes needed.
- YouTube API key: restrict by HTTP referrer to `https://together.chtnnhfoundation.org/*` in Google Cloud Console.

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
# Start web + realtime dev servers first, then:
pnpm --filter @together/web test
```

Playwright specs live in `apps/web/e2e/`.

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

## License

Licensed under the [Apache License 2.0](LICENSE).

---

## Acknowledgments

Built by [chtnnh](https://me.chtnnhfoundation.org). v0.1.0 — [together.chtnnhfoundation.org](https://together.chtnnhfoundation.org) · [Source on GitHub](https://github.com/chtnnh/together)
