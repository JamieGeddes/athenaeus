import type { FastifyPluginAsync } from 'fastify';
import { queryChunks } from '../lib/vectra-store.js';
import { parseRequest, SearchQuerySchema } from '../schemas.js';

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/search', async (request, reply) => {
    const query = parseRequest(SearchQuerySchema, request.query, reply);
    if (!query) return;

    try {
      const results = await queryChunks(query.q.trim(), query.limit);
      return results;
    } catch (err) {
      request.log.error(err, 'Search query failed');
      return reply.code(503).send({ error: 'Search index is unavailable' });
    }
  });
};
