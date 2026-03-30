import { z } from 'zod';
import type { ZodType } from 'zod';
import type { FastifyReply } from 'fastify';

// --- Shared building blocks ---

export const ReadingStatusSchema = z.enum(['unread', 'want_to_read', 'reading', 'finished']);

export const IdParamSchema = z.object({
  id: z.string().min(1),
});

// --- Book schemas ---

export const GetBooksQuerySchema = z.object({
  sortBy: z.enum(['title', 'author', 'uploadDate']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  authors: z.string().optional(),
  tags: z.string().optional(),
  statuses: z.string().optional(),
  collections: z.string().optional(),
});
export type GetBooksQuery = z.infer<typeof GetBooksQuerySchema>;

export const UpdateBookBodySchema = z.object({
  title: z.string().trim().min(1, { error: 'Title must be a non-empty string' }).optional(),
  author: z.string().trim().min(1, { error: 'Author must be a non-empty string' }).optional(),
  tags: z.array(z.string(), { error: 'Tags must be an array of strings' }).optional(),
  readingStatus: ReadingStatusSchema.optional(),
  notes: z.string({ error: 'Notes must be a string' }).optional(),
});
export type UpdateBookBody = z.infer<typeof UpdateBookBodySchema>;

// --- Collection schemas ---

export const CreateCollectionBodySchema = z.object({
  name: z.string().trim().min(1, { error: 'Name must be a non-empty string' }),
  description: z.string().optional(),
});
export type CreateCollectionBody = z.infer<typeof CreateCollectionBodySchema>;

export const UpdateCollectionBodySchema = z.object({
  name: z.string().trim().min(1, { error: 'Name must be a non-empty string' }).optional(),
  description: z.string().optional(),
});
export type UpdateCollectionBody = z.infer<typeof UpdateCollectionBodySchema>;

export const AddBookToCollectionBodySchema = z.object({
  bookId: z.string().min(1, { error: 'bookId is required' }),
});
export type AddBookToCollectionBody = z.infer<typeof AddBookToCollectionBodySchema>;

export const CollectionBookParamsSchema = z.object({
  id: z.string().min(1),
  bookId: z.string().min(1),
});

// --- Search schemas ---

export const SearchQuerySchema = z.object({
  q: z.string().min(1, { error: 'Query parameter "q" is required' }),
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return 10;
      const n = parseInt(val, 10);
      return isNaN(n) ? 10 : Math.min(n, 50);
    }),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

// --- Parse helper ---

export function parseRequest<T>(
  schema: ZodType<T>,
  data: unknown,
  reply: FastifyReply,
): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const message = firstIssue
      ? (firstIssue.path.length > 0
          ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
          : firstIssue.message)
      : 'Invalid request';
    reply.code(400).send({ error: message });
    return null;
  }
  return result.data;
}
