# Second Brain — Premium AI Knowledge OS

A cinematic, dark-space personal knowledge system: pages, ideas, links, projects and conversation summaries, connected into a living knowledge graph, with Claude-powered AI on top.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: add keys (see below)
npm run dev                  # http://localhost:3000
```

It works immediately with **no configuration**: data persists in your browser and a realistic demo workspace is loaded on first run. AI features show a "Connect AI" state until a key is added.

## Credentials (where they're required)

| Feature | Variable | Where it's used |
| --- | --- | --- |
| AI summaries, idea expansion, auto-categorisation, conversation summaries, **Ask your Second Brain** | `ANTHROPIC_API_KEY` (server only), optional `ANTHROPIC_MODEL` (default `claude-opus-5-5`) | `src/app/api/ai/route.ts` |
| Sign-in (magic link) + Postgres persistence | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase.ts`, `src/lib/store/supabase-adapter.ts` |

With Supabase configured, run `supabase/migrations/0001_second_brain.sql` (SQL editor or `supabase db push`). Every table is keyed by `(user_id, id)` with row-level security limiting each user to their own rows. The app then requires sign-in and syncs only changed rows.

Nothing in the UI fakes AI output: without a key, AI surfaces say so. Search, related-content suggestions (TF-IDF cosine similarity), analytics and the graph are computed locally and need no key.

## What's inside

- **Cinematic intro** — real-time WebGL black hole (`src/components/cosmos/black-hole.tsx`): thin-lens gravitational lensing of a procedural starfield, photon ring, inclined accretion disk with Keplerian differential rotation and Doppler beaming, the lensed "halo" of the far disk, smoke, filmic tone-mapping and adaptive resolution. Camera push-in → title reveal → dive through the horizon. Skip / Enter / Esc, remembered after first view, replayable in Settings, skipped under reduced motion.
- **Home** — live black-hole hero with greeting, "since you were last here" digest, upcoming deadlines and category constellations; instant search; four animated stat cards; analytics (pages updated over time, ideas by category, knowledge growth, most-connected, activity heatmap, idea pipeline); activity timeline; conversation summaries (paste a transcript → AI digest, or write manually).
- **Pages** — grid/list, categories, tags, pin, sort, filter; distraction-free editor with Markdown toolbar, list continuation, `[[wiki link]]` autocomplete, write/split/read modes, focus mode, autosave, backlinks, AI summary and categorisation, related content, manual connections.
- **Ideas** — instant capture (inline `#tags`), kanban board with drag-and-drop across Inbox / Thinking / In progress / Completed, list view, filters, AI expansion, convert-to-project.
- **Links** — save with server-side title/description unfurl (SSRF-guarded `/api/unfurl`), paste-a-URL-anywhere capture, categories, tags.
- **Projects** — grid/list (table) views, status, deadlines, colour, progress ring, drag-reorderable tasks (progress auto-computes; completes the project when all are done), connected pages and ideas.
- **Graph** — force-directed canvas map: gold core, category hubs, travelling light pulses, hover neighbourhoods, highlight search, kind filters, pan/zoom/drag, fullscreen; click to inspect, double-click to open.
- **Archive** — restore or permanently delete anything archived.
- **Settings** — profile, intro & motion, AI status, storage mode, JSON export/import, demo reset, keyboard shortcuts.
- **Everywhere** — ⌘K command palette (search + actions + AI), ⌘J Ask panel with cited answers, `/` quick search, toasts with undo, confirm dialogs, loading and error states, responsive down to phone widths.

## Architecture

```
src/
  app/                    routes (App Router) + api/ai, api/unfurl
  components/
    cosmos/               WebGL black hole, starfield, orbit rings
    intro/                cinematic intro
    shell/                app shell, nav, command palette, ask panel
    dashboard/ charts/    home sections and hand-built SVG charts
    pages/ ideas/ projects/ graph/ ai/ ui/ common/
  lib/
    store/                BrainStore (external store) + Local / Supabase adapters
    ai/                   request contracts + streaming client
    search.ts similarity.ts graph.ts analytics.ts entities.ts seed.ts
supabase/migrations/      schema + RLS
```

- **State:** a single `BrainStore` exposed through `useSyncExternalStore`; writes are optimistic and flushed to the active `StorageAdapter` in debounced batches (with retry on failure). Activity is logged and coalesced automatically.
- **Charts:** dependency-free SVG with hover layers; series colours validated for colour-vision deficiency on the dark surface.
- **Dependencies:** Next.js, React, Tailwind CSS 4, Framer Motion, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `lucide-react`. No chart, graph or 3D libraries — WebGL and canvas are hand-written for performance.

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run typecheck`
