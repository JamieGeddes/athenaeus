import type { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { PDFS_DIR, COVERS_DIR } from '../lib/config.js';
import { addBook, getBook, getAllBooks, removeBook, updateBook, getAllTags } from '../lib/storage.js';
import { processPdf } from '../lib/pdf-processor.js';
import { deleteBookChunks } from '../lib/vectra-store.js';
import type { Book } from '../types.js';

export const bookRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/books', async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    if (file.mimetype !== 'application/pdf') {
      return reply.code(400).send({ error: 'Only PDF files are accepted' });
    }

    const bookId = uuidv4();
    const pdfBuffer = await file.toBuffer();
    const pdfFilename = `${bookId}.pdf`;
    const pdfPath = path.join(PDFS_DIR, pdfFilename);

    await writeFile(pdfPath, pdfBuffer);

    // Hijack the response to stream NDJSON progress events
    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    });

    const sendEvent = (event: object) => {
      raw.write(JSON.stringify(event) + '\n');
    };

    try {
      const result = await processPdf(pdfBuffer, bookId, (step, progress) => {
        sendEvent({ step, progress });
      });

      const book: Book = {
        id: bookId,
        title: result.title,
        author: result.author,
        uploadDate: new Date().toISOString(),
        coverImagePath: result.coverImagePath,
        pdfPath: pdfFilename,
        summary: result.summary,
        toc: result.toc,
        originalFilename: file.filename,
        tags: [],
      };

      addBook(book);
      sendEvent({ done: true, book });
    } catch (err) {
      sendEvent({ error: err instanceof Error ? err.message : 'Processing failed' });
    } finally {
      raw.end();
    }
  });

  fastify.get('/books', async (request) => {
    const { sortBy, order } = request.query as { sortBy?: string; order?: string };

    const validFields = ['title', 'author', 'uploadDate'] as const;
    const validOrders = ['asc', 'desc'] as const;

    const sort = sortBy && validFields.includes(sortBy as any)
      ? {
          field: sortBy as 'title' | 'author' | 'uploadDate',
          order: (validOrders.includes(order as any) ? order : 'asc') as 'asc' | 'desc',
        }
      : undefined;

    return getAllBooks(sort);
  });

  fastify.get('/books/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const book = getBook(id);
    if (!book) {
      return reply.code(404).send({ error: 'Book not found' });
    }
    return book;
  });

  fastify.patch('/books/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { title?: string; author?: string; tags?: string[] };

    if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) {
      return reply.code(400).send({ error: 'Title must be a non-empty string' });
    }
    if (body.author !== undefined && (typeof body.author !== 'string' || !body.author.trim())) {
      return reply.code(400).send({ error: 'Author must be a non-empty string' });
    }
    if (body.tags !== undefined && (!Array.isArray(body.tags) || !body.tags.every((t) => typeof t === 'string'))) {
      return reply.code(400).send({ error: 'Tags must be an array of strings' });
    }

    const updates: { title?: string; author?: string; tags?: string[] } = {};
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.author !== undefined) updates.author = body.author.trim();
    if (body.tags !== undefined) updates.tags = [...new Set(body.tags.map((t) => t.trim()).filter(Boolean))];

    const book = updateBook(id, updates);
    if (!book) {
      return reply.code(404).send({ error: 'Book not found' });
    }
    return book;
  });

  fastify.get('/tags', async () => {
    return getAllTags();
  });

  fastify.delete('/books/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const book = removeBook(id);
    if (!book) {
      return reply.code(404).send({ error: 'Book not found' });
    }

    // Clean up files
    const pdfPath = path.join(PDFS_DIR, book.pdfPath);
    const coverPath = path.join(COVERS_DIR, book.coverImagePath);
    await Promise.allSettled([
      unlink(pdfPath),
      unlink(coverPath),
      deleteBookChunks(id),
    ]);

    return { success: true };
  });
};
