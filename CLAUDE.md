# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Root is an npm workspace (`backend`, `frontend`). Run everything from the repo root unless noted.

| Task | Command |
|------|---------|
| Dev (both servers) | `npm run dev` — starts backend on 3001, then frontend on 5173 once the backend port is open (via `wait-on`) |
| Backend only | `npm run dev:backend` (tsx watch) |
| Frontend only | `npm run dev:frontend` (Vite) |
| Backend tests | `npm test` (Vitest, run from backend workspace) |
| Single test file | `npm -w backend exec vitest run src/__tests__/storage.test.ts` |
| Watch a test | `npm -w backend exec vitest src/__tests__/storage.test.ts` |
| Frontend lint | `npm -w frontend run lint` (ESLint — no root-level lint script) |
| Typecheck frontend | `npm -w frontend exec tsc -b` (also runs as part of `npm run build`) |
| Production build | `npm run build` (frontend only — backend runs via `tsx`/`node` directly) |
| Production start | `NODE_ENV=production npm start` — serves API + frontend SPA on 3001 |

`.nvmrc` pins Node 24. `GEMINI_API_KEY` is optional; without it, summaries are skipped but the app still boots.

## Architecture

### Monorepo layout

- `backend/` — Fastify 5 server, ESM, strict TS. Entry: `backend/src/server.ts`.
- `frontend/` — React 19 + Vite 8. Entry: `frontend/src/App.tsx`.
- `data/` — runtime artifacts (gitignored): `athenaeus.db`, `pdfs/`, `covers/`, `vectra-index/`. Created on startup by `server.ts`.
- `tsconfig.base.json` — shared strict/ESNext config extended by both workspaces.

### ESM import convention

Backend is pure ESM (`"type": "module"`). **All intra-project imports must use a `.js` extension even though the source is `.ts`** (e.g. `import { getDb } from './lib/db.js'`). Breaking this convention breaks both `tsx` dev and `tsc` build.

### Ingestion pipeline (`backend/src/lib/pdf-processor.ts`)

PDF upload flows through `POST /api/books` → `processPdf()`:

1. `extractMetadata` (pdf-lib) for title/author.
2. pdfjs-dist document loaded once, then `extractCover`, `extractToc`, `extractText` run **in parallel** against that single doc.
3. Text is split via `chunkText` (500 chars, 50 overlap) with a page-number map built from cumulative offsets so each chunk carries its source page.
4. **Two-phase embedding** to overlap work with Gemini: phase 1 embeds enough chunks to satisfy `SUMMARY_MAX_CHUNKS * 3` (or `EMBEDDING_BATCH_SIZE`, whichever is larger) and flushes to Vectra via `endUpdate()`. Phase 2 embeds the remainder **in parallel** with `generateSummary`, which queries the phase-1 chunks. Preserve this ordering — summary generation depends on phase 1 being queryable.
5. pdfjs doc is always destroyed in `finally`.

### Upload progress contract (NDJSON)

`POST /api/books` uses `reply.hijack()` to stream newline-delimited JSON events while processing: `{ step, progress }` throughout, then either `{ done: true, book }` or `{ error }`. The frontend (`UploadModal`) reads the stream and updates its progress bar from these events. If you change event shape, update both sides.

### Embeddings + Vectra

- `backend/src/lib/embeddings.ts` lazy-loads `Xenova/all-MiniLM-L6-v2` on first call; `server.ts` pre-warms it at boot so first-request latency / failures surface early.
- `backend/src/lib/vectra-store.ts` wraps all batch inserts in `beginUpdate()` / `endUpdate()` — without this, each `insertItem` re-serializes the entire `index.json` (per Vectra internals). Always use `addChunks` for batch work; never loop `insertItem` directly.
- `initIndex()` re-creates the index if `index.json` is missing or structurally invalid.
- `deleteBookChunks` scans via `listItems()` — no secondary index, so cost is O(n).

### SQLite storage (`backend/src/lib/db.ts`, `backend/src/lib/storage.ts`)

- `better-sqlite3`, WAL mode. `getDb()` is a lazy singleton.
- Schema is created on startup via `CREATE TABLE IF NOT EXISTS`. **Migrations for columns added after v1 are `ALTER TABLE ... ADD COLUMN` calls wrapped in `try/catch {}`** (see `reading_status`, `notes`). When adding new columns to existing tables, follow this pattern rather than a migration framework.
- Tables: `books`, `book_tags`, `collections`, `book_collections`. Tags and collections are many-to-many join tables.

### Route validation (`backend/src/schemas.ts`)

Every route parses inputs via the shared `parseRequest(schema, data, reply)` helper, which Zod-validates and either returns typed data or sends a 400 with the first issue message. New routes should add a schema here rather than validate inline. `ReadingStatusSchema` is the runtime counterpart to the `ReadingStatus` TS type in `backend/src/types.ts` — update both when adding a status.

### Production mode

When `NODE_ENV=production`, `server.ts` serves the built frontend from `frontend/dist` and registers a SPA fallback that sends `index.html` for any non-API / non-asset 404. The backend does not have a `build` step in current scripts — it runs via `node dist/server.js` in `start`, so production builds assume `tsc` has been run (there is no orchestrator for this beyond `npm start` inside `backend/`). Check before shipping if this matters.

### Frontend ↔ backend wiring

Vite dev server (`frontend/vite.config.ts`) proxies `/api`, `/covers`, `/pdfs` to `http://localhost:3001`. CORS is configured on the backend for `http://localhost:5173` only. Keep these in sync if ports move.

Search results include a `pageNumber` so clicking a hit opens `/pdfs/<file>#page=N` in a new tab (see `App.handleSearchSelect`) — the PDF viewer honors the fragment.

## Tests

Vitest, Node environment, globals enabled. Tests live under `backend/src/__tests__/`. Integration-style tests (like `storage.test.ts`) build their own SQLite DB in a temp dir — do not point tests at the real `data/athenaeus.db`.
