# Contributing to Together

## Merge gate contract

**Green CI = safe to merge** (after you review intent). GitHub Actions runs the full suite via `pnpm ci:local` scripts:

| Job | Script | What it checks |
|-----|--------|----------------|
| `quality` | `pnpm ci:quality` | Biome lint/format + TypeScript |
| `build` | `pnpm ci:build` | Next.js + realtime worker build |
| `unit` | `pnpm ci:unit` | Vitest across all packages |
| `db` | `pnpm ci:db` | Drizzle journal / migration integrity |
| `test` | `pnpm ci:e2e` | Playwright E2E (desktop + mobile) |
| `visual` | `pnpm ci:visual` | Visual regression (Linux Docker baselines) |

Run the same locally before opening a PR:

```bash
pnpm install --frozen-lockfile
pnpm ci:local
```

## Git hooks (incremental)

Hooks catch most issues early without running the full ~15-minute suite on every commit.

**Shared hooks are committed** in `.husky/pre-commit` and `.husky/pre-push` — every contributor gets them after `pnpm install` (the `prepare` script runs Husky and wires Git’s `core.hooksPath`). Only **optional** know-code overlays (`.husky/*.local`) are gitignored.

| Hook | Command | Typical duration |
|------|---------|------------------|
| **pre-commit** | `pnpm ci:pre-commit` | ~30–90s |
| **pre-push** | `pnpm ci:pre-push` | ~1-5 min |

**pre-commit:** `lint-staged` (Biome auto-fix), Biome on changed files, affected typecheck, Vitest `--changed`, DB guard if `schema.ts` changed.

**pre-push:** full Biome, affected typecheck/unit, conditional build, DB guard if schema changed. Large diffs (>30 files) or CI infra changes run full quality + build + unit + db (no E2E/visual; CI covers those).

Skip hooks when necessary (you are responsible for CI):

```bash
SKIP_HOOKS=1 git commit
SKIP_HOOKS=1 git push
# or
git push --no-verify
```

## Optional: know-code comprehension gate

[know-code](https://kc.chtnnhfoundation.org) is an optional, **machine-local** layer on top of the shared hooks. It blocks `git commit` / `git push` until you pass a short quiz about the diff (useful when working with coding agents).

**Not enabled by default** — other contributors are unaffected.

### Opt in

```bash
npm i -g @chtnnh/know-code
know-code attest-init          # once per machine
bash scripts/enable-know-code-hooks.sh
```

This copies `.husky/pre-commit.local.example` → `.husky/pre-commit.local` (and the pre-push variant). Those files are **gitignored**; only your machine runs `know-code check` after the shared `ci:pre-commit` / `ci:pre-push` scripts.

Manual setup instead of the script:

```bash
cp .husky/pre-commit.local.example .husky/pre-commit.local
cp .husky/pre-push.local.example .husky/pre-push.local
```

### Typical workflow (range mode)

One quiz covers the **entire feature batch**, not each commit.

1. `know-code range begin` at the start of a feature batch.
2. Land all commits (`git commit` runs shared `ci:pre-commit` only — know-code does **not** gate each commit).
3. When the batch is complete: agent teaches → you run `know-code taught`.
4. Agent writes `.know-code/quiz.json` from `know-code questions` → `know-code ask` → `know-code grade propose` → `know-code grade --review` → `know-code pass` (quiz covers the **full range diff**).
5. `know-code range seal` (adds verification trailer / receipt).
6. `git push` (shared `ci:pre-push` + know-code `check` on pre-push).

Use `know-code commit -m "…"` only if you prefer the CLI wrapper after `pass`; regular `git commit` is fine while building the range. See [kc.chtnnhfoundation.org](https://kc.chtnnhfoundation.org) for the tutorial.

**Hooks:** enable know-code on **pre-push only** (`.husky/pre-push.local`). Do not add know-code to pre-commit — that forces a quiz per commit and breaks range mode.

### Disable on this machine

```bash
rm .husky/pre-commit.local .husky/pre-push.local
```

Emergency bypass (human TTY): `know-code override`, then `KNOW_CODE_OVERRIDE=1 git commit`. Do not use in CI or agent shells.

## Viewing CI failure screenshots

1. Open the failed GitHub Actions run (**CI → test** or **CI → visual**).
2. Scroll to **Artifacts** at the bottom of the summary.
3. Download **`test-results-…`** for failure screenshots, visual diffs (`*-expected.png`, `*-actual.png`, `*-diff.png`), and `trace.zip`.
4. Download **`playwright-report-…`** and open `index.html` in a browser for the interactive report.

## DB schema changes

1. Edit `packages/db/src/schema.ts`
2. Run `pnpm db:generate`
3. Commit new SQL under `packages/db/drizzle/` **and** `packages/db/drizzle/meta/`

## Testing layers

| Layer | Command |
|-------|---------|
| Unit | `pnpm test:unit` or `pnpm ci:unit` |
| E2E | `pnpm --filter @together/web test` |
| Visual update | `pnpm --filter @together/web test:visual:update` (Docker) |
| Full CI parity | `pnpm ci:local` |

## Formatting

```bash
pnpm format    # Biome write
pnpm lint      # Biome check
```

## Coverage notes

- **Keyboard shortcuts (mobile):** desktop-only interaction; mobile coverage is `keyboard-shortcuts-mobile.spec.ts` (verifies `?` in chat does not open help).
- **OG / favicon:** covered by `og-image.spec.ts` (desktop API); no separate mobile layout.
- **Playback sync visual:** no distinct layout — covered by E2E two-client specs and unit playback math.
