# Together — agent instructions

Monorepo for **Together** (synced YouTube watch/listen rooms). Default branch: **`main`**. Canonical remote: **`https://github.com/chtnnh/together`**.

## Before feature work

1. Read **`docs/v0.3.0-plan.md`** for the approved v0.3.0 scope and phase order (v0.2.0 plan in `docs/v0.2.0-plan.md` is historical).
2. Do not implement items marked **out of v0.3.0** unless explicitly requested.

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
- For v0.3.0 tasks, work **one phase at a time** from `docs/v0.3.0-plan.md` and run `pnpm typecheck` before finishing.
