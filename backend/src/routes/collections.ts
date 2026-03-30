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
import {
  parseRequest,
  IdParamSchema,
  CreateCollectionBodySchema,
  UpdateCollectionBodySchema,
  AddBookToCollectionBodySchema,
  CollectionBookParamsSchema,
} from '../schemas.js';

export const collectionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/collections', async (request, reply) => {
    const body = parseRequest(CreateCollectionBodySchema, request.body, reply);
    if (!body) return;

    try {
      const collection = createCollection(body.name, body.description?.trim());
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
    const params = parseRequest(IdParamSchema, request.params, reply);
    if (!params) return;
    const body = parseRequest(UpdateCollectionBodySchema, request.body, reply);
    if (!body) return;

    const updates: { name?: string; description?: string } = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description.trim();

    try {
      const collection = updateCollection(params.id, updates);
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
    const params = parseRequest(IdParamSchema, request.params, reply);
    if (!params) return;
    const deleted = deleteCollection(params.id);
    if (!deleted) {
      return reply.code(404).send({ error: 'Collection not found' });
    }
    return { success: true };
  });

  fastify.post('/collections/:id/books', async (request, reply) => {
    const params = parseRequest(IdParamSchema, request.params, reply);
    if (!params) return;
    const body = parseRequest(AddBookToCollectionBodySchema, request.body, reply);
    if (!body) return;

    const collection = getCollection(params.id);
    if (!collection) {
      return reply.code(404).send({ error: 'Collection not found' });
    }

    addBookToCollection(body.bookId, params.id);
    return { success: true };
  });

  fastify.delete('/collections/:id/books/:bookId', async (request, reply) => {
    const params = parseRequest(CollectionBookParamsSchema, request.params, reply);
    if (!params) return;

    const collection = getCollection(params.id);
    if (!collection) {
      return reply.code(404).send({ error: 'Collection not found' });
    }

    removeBookFromCollection(params.bookId, params.id);
    return { success: true };
  });
};
