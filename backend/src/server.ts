import Fastify from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_DIR, PDFS_DIR, COVERS_DIR, VECTRA_DIR } from './lib/config.js';
import { getDb } from './lib/db.js';
import { initIndex } from './lib/vectra-store.js';
import { bookRoutes } from './routes/books.js';
import { searchRoutes } from './routes/search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure data directories exist
for (const dir of [DATA_DIR, PDFS_DIR, COVERS_DIR, VECTRA_DIR]) {
  mkdirSync(dir, { recursive: true });
}

// Initialize database
getDb();

// Validate required env vars
if (!process.env.GEMINI_API_KEY) {
  console.warn('WARNING: GEMINI_API_KEY not set. Book summaries will be unavailable.');
}

const server = Fastify({ logger: true });

server.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
  server.log.error(error);
  const statusCode = error.statusCode ?? 500;
  reply.code(statusCode).send({
    error: statusCode >= 500 ? 'Internal server error' : error.message,
    statusCode,
  });
});

await server.register(fastifyCors, { origin: 'http://localhost:5173' });
await server.register(fastifyMultipart, { limits: { fileSize: 100 * 1024 * 1024 } });
await server.register(fastifyStatic, {
  root: COVERS_DIR,
  prefix: '/covers/',
});

await server.register(bookRoutes, { prefix: '/api' });
await server.register(searchRoutes, { prefix: '/api' });

// Initialize Vectra index
await initIndex();

// Production: serve frontend build
if (process.env.NODE_ENV === 'production') {
  await server.register(fastifyStatic, {
    root: path.resolve(__dirname, '../../frontend/dist'),
    prefix: '/',
    decorateReply: false,
  });

  server.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/') || request.url.startsWith('/covers/')) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return reply.sendFile('index.html');
  });
}

const port = parseInt(process.env.PORT || '3001', 10);
await server.listen({ port, host: '0.0.0.0' });
