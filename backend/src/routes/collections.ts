import type { FastifyPluginAsync } from 'fastify';
import {
  createCollection,
  getAllCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  addBookToCollection,
  removeBookFromCollection,
} from '../lib/storage.js';

export const collectionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/collections', async (request, reply) => {
    const body = request.body as { name?: string; description?: string };

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return reply.code(400).send({ error: 'Name must be a non-empty string' });
    }

    try {
      const collection = createCollection(body.name.trim(), body.description?.trim());
      return reply.code(201).send(collection);
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint')) {
        return reply.code(409).send({ error: 'A collection with that name already exists' });
      }
      throw err;
    }
  });

  fastify.get('/collections', async () => {
    return getAllCollections();
  });

  fastify.patch('/collections/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; description?: string };

    if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
      return reply.code(400).send({ error: 'Name must be a non-empty string' });
    }

    const updates: { name?: string; description?: string } = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description.trim();

    try {
      const collection = updateCollection(id, updates);
      if (!collection) {
        return reply.code(404).send({ error: 'Collection not found' });
      }
      return collection;
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint')) {
        return reply.code(409).send({ error: 'A collection with that name already exists' });
      }
      throw err;
    }
  });

  fastify.delete('/collections/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = deleteCollection(id);
    if (!deleted) {
      return reply.code(404).send({ error: 'Collection not found' });
    }
    return { success: true };
  });

  fastify.post('/collections/:id/books', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { bookId?: string };

    if (!body.bookId || typeof body.bookId !== 'string') {
      return reply.code(400).send({ error: 'bookId is required' });
    }

    const collection = getCollection(id);
    if (!collection) {
      return reply.code(404).send({ error: 'Collection not found' });
    }

    addBookToCollection(body.bookId, id);
    return { success: true };
  });

  fastify.delete('/collections/:id/books/:bookId', async (request, reply) => {
    const { id, bookId } = request.params as { id: string; bookId: string };

    const collection = getCollection(id);
    if (!collection) {
      return reply.code(404).send({ error: 'Collection not found' });
    }

    removeBookFromCollection(bookId, id);
    return { success: true };
  });
};
