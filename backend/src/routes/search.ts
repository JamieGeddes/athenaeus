import type { FastifyPluginAsync } from 'fastify';
import { queryChunks } from '../lib/vectra-store.js';

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/search', async (request, reply) => {
    const { q, limit } = request.query as { q?: string; limit?: string };

    if (!q || q.trim().length === 0) {
      return reply.code(400).send({ error: 'Query parameter "q" is required' });
    }

    const topK = limit ? Math.min(parseInt(limit, 10) || 10, 50) : 10;

    try {
      const results = await queryChunks(q.trim(), topK);
      return results;
    } catch (err) {
      request.log.error(err, 'Search query failed');
      return reply.code(503).send({ error: 'Search index is unavailable' });
    }
  });
};
