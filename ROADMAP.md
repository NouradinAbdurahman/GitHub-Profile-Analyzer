# AI Feature Roadmap

Backlog of AI-powered features to add on top of the existing OpenRouter
pipeline (`lib/ai-request.ts` → `lib/api-client.ts` → `/api/ai/chat` →
`lib/openrouter.ts`). Grouped by area; unordered within each group except
where marked in progress.

## Profile & repo analysis

- [x] **AI compare verdict** — on `/compare`, a generated narrative on who's
      stronger where and why. `components/compare-verdict.tsx` +
      `app/api/ai-tools/compare-verdict/route.ts` (POST, uses the repo data
      already loaded client-side, no extra GitHub calls).
- [x] **Repo health/README score** — AI reads a repo's README + file
      structure (via GitHub API) and scores documentation, onboarding
      clarity, activity signals. `type=health` on
      `app/api/ai-tools/repo/route.ts`, triggered from the "AI Insights"
      dialog (`components/repo-ai-insights.tsx`) on each repo card.
- [x] **Commit message / PR quality feedback** — sample recent commits, get
      a short critique + suggested style improvements. `type=commits` on
      the same `repo/route.ts`, same dialog.
- [x] **"Explain this repo" summary** — one-paragraph plain-English summary
      of what a repo does, for repos with thin/no descriptions. `type=explain`
      on the same `repo/route.ts`, same dialog.

## Career / growth tools

- [x] **AI-drafted bio & pinned-repo picks** — rewrite the GitHub bio,
      suggest which repos to pin, tailored to a target role (e.g.
      "frontend," "ML"). `type=bio-picks` on `app/api/ai-tools/[type]/route.ts`
      (now accepts an optional `role` query param), "Bio & Pins" tab in
      `components/profile-ai-tools.tsx` with a target-role input.
- [x] **Resume bullet generator** — turn top repos + contribution stats
      into resume-ready bullet points. `type=resume-bullets`, "Resume
      Bullets" tab (no role input needed).
- [x] **Cover-letter / "why hire me" blurb** — same idea, longer form,
      pulling from languages + repo themes. `type=cover-letter`, "Why
      Hire Me" tab, also accepts the optional target role.

## Interactive

- [ ] **"Ask about this profile" chat** — conversational Q&A grounded in
      the viewed profile's data, reusing the streaming chat endpoint.
- [ ] **AI-powered repo search/filter** — natural-language query over a
      user's repos ("show me my most active ML projects") instead of the
      current dropdown filters.

## Passive/background

- [ ] **Weekly digest** — AI summary of a watched profile's activity since
      last check (uses existing watch-profile + notifications infra).
- [ ] **Saved-analysis diffing** — when a user re-runs an analysis, AI
      highlights what changed since the last saved one.

---

Note: every item here is a live call through the OpenRouter free-model
fallback chain — fine for on-demand/user-triggered features, riskier for
anything that runs automatically per page view (cost is latency + free-tier
reliability, not $).
