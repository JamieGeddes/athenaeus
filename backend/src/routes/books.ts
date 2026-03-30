import type { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { PDFS_DIR, COVERS_DIR } from '../lib/config.js';
import { addBook, getBook, getAllBooks, removeBook, updateBook, getAllTags, getFilteredBooks, getAllAuthors } from '../lib/storage.js';
import { processPdf } from '../lib/pdf-processor.js';
import { deleteBookChunks } from '../lib/vectra-store.js';
import type { Book, ReadingStatus } from '../types.js';
import {
  parseRequest,
  IdParamSchema,
  GetBooksQuerySchema,
  UpdateBookBodySchema,
} from '../schemas.js';

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
        readingStatus: 'unread',
        notes: '',
        collections: [],
      };

      addBook(book);
      sendEvent({ done: true, book });
    } catch (err) {
      sendEvent({ error: err instanceof Error ? err.message : 'Processing failed' });
    } finally {
      raw.end();
    }
  });

  fastify.get('/books', async (request, reply) => {
    const query = parseRequest(GetBooksQuerySchema, request.query, reply);
    if (!query) return;

    const { sortBy, order, authors, tags, statuses, collections } = query;

    const sort = sortBy
      ? { field: sortBy, order: (order ?? 'asc') as 'asc' | 'desc' }
      : undefined;

    const hasFilters = authors || tags || statuses || collections;
    if (hasFilters) {
      const filters = {
        authors: authors ? authors.split(',').filter(Boolean) : undefined,
        tags: tags ? tags.split(',').filter(Boolean) : undefined,
        statuses: statuses ? statuses.split(',').filter(Boolean) as ReadingStatus[] : undefined,
        collections: collections ? collections.split(',').filter(Boolean) : undefined,
      };
      return getFilteredBooks(filters, sort);
    }

    return getAllBooks(sort);
  });

  fastify.get('/authors', async () => {
    return getAllAuthors();
  });

  fastify.get('/books/:id', async (request, reply) => {
    const params = parseRequest(IdParamSchema, request.params, reply);
    if (!params) return;
    const book = getBook(params.id);
    if (!book) {
      return reply.code(404).send({ error: 'Book not found' });
    }
    return book;
  });

  fastify.patch('/books/:id', async (request, reply) => {
    const params = parseRequest(IdParamSchema, request.params, reply);
    if (!params) return;
    const body = parseRequest(UpdateBookBodySchema, request.body, reply);
    if (!body) return;

    const updates: { title?: string; author?: string; tags?: string[]; readingStatus?: ReadingStatus; notes?: string } = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.author !== undefined) updates.author = body.author;
    if (body.tags !== undefined) updates.tags = [...new Set(body.tags.map((t) => t.trim()).filter(Boolean))];
    if (body.readingStatus !== undefined) updates.readingStatus = body.readingStatus;
    if (body.notes !== undefined) updates.notes = body.notes;

    const book = updateBook(params.id, updates);
    if (!book) {
      return reply.code(404).send({ error: 'Book not found' });
    }
    return book;
  });

  fastify.get('/tags', async () => {
    return getAllTags();
  });

  fastify.delete('/books/:id', async (request, reply) => {
    const params = parseRequest(IdParamSchema, request.params, reply);
    if (!params) return;
    const book = removeBook(params.id);
    if (!book) {
      return reply.code(404).send({ error: 'Book not found' });
    }

    // Clean up files
    const pdfPath = path.join(PDFS_DIR, book.pdfPath);
    const coverPath = path.join(COVERS_DIR, book.coverImagePath);
    await Promise.allSettled([
      unlink(pdfPath),
      unlink(coverPath),
      deleteBookChunks(params.id),
    ]);

    return { success: true };
  });
};
