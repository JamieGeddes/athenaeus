# Athenaeus

A digital library for managing ebooks with AI-powered summaries and semantic search. Upload PDFs, automatically extract metadata and covers, generate summaries via Gemini, and search across your collection using natural language.

## Features

- **PDF processing** -- extracts title, author, table of contents, and renders the first page as a cover image
- **AI summaries** -- generates book summaries using Gemini with RAG over extracted text chunks
- **Semantic search** -- search across all books using natural language, powered by local embeddings (Xenova/all-MiniLM-L6-v2) and Vectra vector index
- **Book management** -- upload, browse, sort, and delete books through a responsive UI

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, TypeScript |
| Backend | Fastify 5, TypeScript |
| Database | SQLite (better-sqlite3, WAL mode) |
| Vector search | Vectra (local), Xenova Transformers |
| AI | Google Gemini API |
| PDF | pdf-lib, pdfjs-dist, sharp |

## Prerequisites

- Node.js 24 (see `.nvmrc`)
- A [Gemini API key](https://ai.google.dev/) (optional -- the app works without it, but summaries will be unavailable)

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env  # then add your GEMINI_API_KEY

# Run in development (backend + frontend concurrently)
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API requests to the backend on port 3001.

### Production

```bash
npm run build   # Build frontend
npm start       # Serve backend + static frontend on port 3001
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend and frontend concurrently |
| `npm run dev:backend` | Start backend only (tsx watch) |
| `npm run dev:frontend` | Start frontend only (Vite) |
| `npm run build` | Build frontend for production |
| `npm start` | Start production server |
| `npm test` | Run backend tests (Vitest) |

## Project Structure

```
athenaeus/
├── backend/
│   └── src/
│       ├── server.ts              # Fastify entry point
│       ├── routes/
│       │   ├── books.ts           # CRUD endpoints for books
│       │   └── search.ts          # Semantic search endpoint
│       ├── lib/
│       │   ├── db.ts              # SQLite setup & schema
│       │   ├── storage.ts         # Book CRUD operations
│       │   ├── pdf-processor.ts   # Upload processing pipeline
│       │   ├── vectra-store.ts    # Vector index operations
│       │   ├── embeddings.ts      # Text embeddings (Xenova)
│       │   └── gemini.ts          # Summary generation
│       └── extractors/
│           ├── text.ts            # PDF text extraction
│           ├── metadata.ts        # Title/author extraction
│           ├── cover.ts           # Cover image rendering
│           └── toc.ts             # Table of contents extraction
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── lib/api.ts             # API client
│       └── components/
│           ├── SearchBar.tsx      # Semantic search with results
│           ├── UploadForm.tsx     # PDF upload with progress
│           ├── BookCarousel.tsx   # Featured books carousel
│           ├── BookGrid.tsx       # Sortable book grid
│           ├── BookCard.tsx       # Book card display
│           └── BookDetail.tsx     # Book modal (summary, TOC)
├── data/                          # Runtime data (gitignored)
│   ├── athenaeus.db                 # SQLite database
│   ├── pdfs/                      # Uploaded PDFs
│   ├── covers/                    # Generated cover images
│   └── vectra-index/              # Vector search index
├── package.json                   # Workspace root
└── tsconfig.base.json             # Shared TypeScript config
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/books` | Upload a PDF (multipart, 100MB max) |
| `GET` | `/api/books` | List books (`?sortBy=title\|author\|uploadDate&order=asc\|desc`) |
| `GET` | `/api/books/:id` | Get book details |
| `DELETE` | `/api/books/:id` | Delete book and associated files |
| `GET` | `/api/search` | Semantic search (`?q=query&limit=10`) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No | Enables AI-generated book summaries |
| `PORT` | No | Server port (default: 3001) |
