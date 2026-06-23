# Together — agent instructions

Monorepo for **Together** (synced YouTube watch/listen rooms). Default branch: **`main`**. Canonical remote: **`https://github.com/chtnnh/together`**.

## Before feature work

1. Read **`docs/v0.2.0-plan.md`** for the approved v0.2.0 scope and phase order.
2. Do not implement items marked **out of v0.2.0** (Apple Music, MP3 URLs, Last.fm, oEmbed, etc.).

## Repo layout

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js 15 UI + API routes |
| `services/realtime` | Cloudflare Worker + Durable Object (WebSocket rooms) |
| `packages/shared` | Events, Zod schemas, playback math |
| `packages/db` | Drizzle schema + migrations |
| `packages/ui` | Shared React components |
| `packages/track-resolver` | YouTube / ISRC matching |

## Commands

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm --filter @together/web test:install   # first time / CI
pnpm --filter @together/web test
pnpm --filter @together/realtime dev       # requires Node 22+
pnpm --filter @together/web dev
```

Env is loaded from repo root `.env` (see `.env.example`). Do not commit secrets.

## Conventions

- Client ↔ realtime events: `packages/shared/src/events.ts` + handler in `services/realtime/src/room-do.ts`
- Match existing naming and patterns; minimal diffs
- Mobile queue reorder: **touch drag-and-drop only** (no overflow move up/down menus)

---

## Cursor Cloud specific instructions

Cloud agents must use the **GitHub** repository **`chtnnh/together`**, branch **`main`**.

- A local **`forgejo`** remote may exist for mirroring; Cloud Agents do not use it.
- Environment config: **`.cursor/environment.json`** (Node 22 + pnpm install on startup).
- Set secrets in [Cursor Dashboard → Cloud Agents → Secrets](https://cursor.com/dashboard?tab=cloud-agents) (not in git): at minimum dummy values for local agent runs if testing web (`DATABASE_URL`, `YOUTUBE_API_KEY`, `ROOM_TOKEN_SECRET`, `NEXT_PUBLIC_*` — see `.env.example`).
- For v0.2.0 tasks, work **one phase at a time** from `docs/v0.2.0-plan.md` and run `pnpm typecheck` before finishing.

### Running locally (verified caveats)

- The core flow (create room → realtime connect → chat/queue) runs with **no Postgres and no YouTube key**: leave `DATABASE_URL` empty so `apps/web` uses the in-memory room store (`/api/health/db` reports `"mode":"memory"`), and an empty `YOUTUBE_API_KEY` only disables YouTube text search (URL paste still works). Do not request DB/YouTube secrets just to run/test the core product.
- Start the two services in separate terminals: `pnpm --filter @together/realtime dev` (`:8787`, health at `/health`) and `pnpm --filter @together/web dev` (`:3000`). The web SSR seeds the Durable Object via `POST {realtime}/room/{id}/init` on first room load.
- `wrangler dev` prints harmless `Unable to fetch the Request.cf object` / TLS `ECONNRESET` warnings in this sandbox (outbound egress is restricted); the worker still serves locally — ignore them.
- Playwright E2E (`pnpm --filter @together/web test:install` then `... test`) requires downloading the Chromium browser, which is **blocked by the restricted network egress** here. Until that domain is allowlisted, validate UI flows manually against the running dev servers instead.
