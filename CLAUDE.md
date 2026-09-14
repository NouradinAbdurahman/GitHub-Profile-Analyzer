# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (pnpm-lock.yaml is authoritative; Vercel is configured with `pnpm install`).

```bash
pnpm dev              # start Next.js dev server (http://localhost:3000)
pnpm build            # production build
pnpm start            # run production build
pnpm lint             # next lint
pnpm lint:ci          # eslint, non-blocking (always exits 0) — used in CI-style checks
pnpm check-secrets    # scans changed files for likely-secret patterns (scripts/check-secrets.js)
pnpm prepare-push     # check-secrets && lint — run before pushing
```

There is no automated test suite/runner configured in this repo (no test files, no test script).

`next.config.mjs` sets `eslint.ignoreDuringBuilds: true` and `typescript.ignoreBuildErrors: true`, so `pnpm build` will succeed even with type or lint errors. Run `pnpm lint` and `npx tsc --noEmit` explicitly to catch issues.

## Architecture

Next.js 15 (App Router) + React 19 + TypeScript, Tailwind CSS + shadcn/ui (`components/ui`, config in `components.json`).

### Auth

GitHub OAuth is implemented manually (no NextAuth/Auth.js):
- `app/api/auth/login` builds the GitHub authorize URL with a signed `state` (nonce + returnTo).
- `app/api/auth/callback/github` verifies the nonce, exchanges the code for an access token, fetches the GitHub user, and stores everything (including the raw `access_token`) in an encrypted `iron-session` cookie.
- `lib/session.ts` defines the `iron-session` config/shape (`sessionOptions`, `IronSessionData.user`). Requires `SESSION_SECRET` (32+ chars) — generate with `scripts/generate-session-secret.js`.
- The stored `access_token` is what server-side GitHub API routes use to call the GitHub REST API on the user's behalf (private repo access requires the `repo` OAuth scope).

### Data layer — dual Firebase setup

- `lib/firebase.ts` — Firebase **client** SDK, used from client components/`lib/github-data-service.ts` client-side exports.
- `lib/firebase-admin.ts` / `lib/firebase-admin-wrapper.ts` — Firebase **Admin** SDK, used from API routes (server-side). Reads credentials from `FIREBASE_SERVICE_ACCOUNT_KEY` env var or `config/firebase-service-account.json`.
- If no admin credentials are found, `firebase-admin-wrapper.ts` silently falls back to an in-memory mock Firestore instead of throwing — API routes keep working in dev without Firebase configured, but writes are non-persistent. Don't assume Firestore is real without checking this fallback.
- `lib/github-data-service.ts` is the caching layer on top of Firestore: `github-users/{login}` docs plus a `repositories` subcollection, with a 24h staleness check (`needsRefresh`). It exposes both client-side functions (top-level exports) and a `serverGitHubService` object for use inside API routes — pick the right one depending on whether the caller runs on client or server.

### AI integration

- `lib/openrouter.ts` is the single point of contact with the AI provider (OpenRouter). It does **not** call one hardcoded model — `buildModelChain()` fetches OpenRouter's currently-free models (6h cache, static fallback list if the fetch fails) and `chatWithFallback` / `chatStreamWithFallback` try them in order until one succeeds. This exists so AI features don't hard-fail when a single free model is deprecated or rate-limited.
- Client code never calls OpenRouter directly. The path is: component → `lib/ai-request.ts` (`callAI`) → `lib/api-client.ts` (`post`/`fetchWithRetry`, has its own timeout/retry/backoff) → `POST /api/ai/chat` → `lib/openrouter.ts`.
- AI-powered feature routes live under `app/api/ai-tools/*` and `app/api/ai/*` (chat, status):
  - `app/api/ai-tools/[type]/route.ts` — profile-scoped tools selected by `type`: `summary`, `optimizer`, `recommendations`, `bio-picks`, `resume-bullets`, `cover-letter`. Takes `?username=` (required) and `?role=` (optional, used by `bio-picks`/`cover-letter` to tailor the output to a target role).
  - `app/api/ai-tools/repo/route.ts` — single-repo tools selected by `?type=explain|health|commits`, plus `?owner=` and `?repo=`. Fetches README/file-listing/commits directly from the GitHub REST API server-side (via `lib/github-server-fetch.ts`) rather than through the cached Firestore layer.
  - `app/api/ai-tools/compare-verdict/route.ts` — POST only; takes the repo array already loaded client-side on `/compare` (see `repo-comparison-provider.tsx`) in the body, no extra GitHub calls.
  - `app/api/ai/status` and `app/api/ai-tools/status` report whether `OPENROUTER_API_KEY` is configured (`lib/env-utils.ts`).
- `lib/ai-tool-stream.ts` (`streamAIToolResult`) is the one client-side SSE parser for all of the above — don't reimplement the `data:`-line/JSON-delta loop in a component, import this instead.
- AI output is rendered via `dangerouslySetInnerHTML` (because `lib/text-normalizer.ts`'s `stripMarkdownSymbols()` turns light markdown into a few HTML tags) — always pass it through `lib/sanitize-ai-html.ts` (`sanitizeAIHtml`, DOMPurify-backed, allowlists only `b/strong/i/em/p/br/ul/ol/li` with no attributes) first, since the underlying text can echo back third-party content (repo READMEs, commit messages, another user's bio) that a prompt injection could otherwise turn into a script/event-handler payload.
- Streaming responses need `duplex: "half"` on the fetch to work on Vercel/edge runtimes (see comment in `openrouter.ts`) — keep this if touching the streaming path.
- Raw AI markdown output is cleaned/normalized before rendering by `lib/text-formatter.ts`, `lib/text-normalizer.ts`, `lib/server-text-processor.ts`, `lib/garbage-text-detector.ts`, `lib/html-parser.ts`, consumed by `components/ai/formatted-ai-response.tsx` / `components/ai/ai-response.tsx`.

### GitHub data access

All GitHub REST API calls happen server-side under `app/api/github/*` (user, repos, repo languages, contributions, activity, starred, rate-limit, watch-profile, refresh-data) so OAuth tokens never reach the client. Client code fetches through these routes, not `api.github.com` directly.

### Not part of the active app

`github-profile-analyzer/` (nested directory at repo root) is a stale/unrelated old scaffold with its own `package.json` (uses `mongodb`/`axios`, not part of this project's stack). It's excluded from ESLint via `.eslintrc.json`'s `ignorePatterns`. Don't confuse it with the real app root, and don't "fix" it as if it were live code.

## AI feature roadmap

`ROADMAP.md` tracks the backlog of planned AI features and which are done. Status as of this writing: **Profile & repo analysis** and **Career / growth tools** are shipped (see the AI integration section above for the routes). **Interactive** (ask-about-this-profile chat, natural-language repo search) and **Passive/background** (weekly digest, saved-analysis diffing) are not started — check `ROADMAP.md` before picking the next item.

## Environment variables

See `.env.example` for the full list (OpenRouter key, GitHub OAuth client id/secret, GitHub personal access token, Firebase client config). Secrets belong in `.env.local` (gitignored) or Vercel project env vars — see `DEPLOYMENT.md` and `scripts/vercel-env-vars.txt`. `pnpm check-secrets` runs a pattern scan over changed files before push to catch accidental secret commits.
