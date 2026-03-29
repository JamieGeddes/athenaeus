import { LocalIndex } from 'vectra';
import { VECTRA_DIR } from './config.js';
import { embed } from './embeddings.js';
import type { SearchResult } from '../types.js';

const index = new LocalIndex(VECTRA_DIR);

export async function initIndex(): Promise<void> {
  if (!(await index.isIndexCreated())) {
    await index.createIndex();
  }
}

export async function addChunks(
  bookId: string,
  bookTitle: string,
  chunks: { text: string; index: number }[],
): Promise<void> {
  for (const chunk of chunks) {
    const vector = await embed(chunk.text);
    await index.insertItem({
      vector,
      metadata: {
        bookId,
        bookTitle,
        chunkIndex: chunk.index,
        text: chunk.text,
      },
    });
  }
}

export async function queryChunks(
  queryText: string,
  topK: number = 10,
  bookId?: string,
): Promise<SearchResult[]> {
  const queryVector = await embed(queryText);
  const results = await index.queryItems(queryVector, topK);

  return results
    .filter((r) => !bookId || r.item.metadata.bookId === bookId)
    .map((r) => ({
      bookId: r.item.metadata.bookId as string,
      bookTitle: r.item.metadata.bookTitle as string,
      chunkText: r.item.metadata.text as string,
      score: r.score,
    }));
}

export async function deleteBookChunks(bookId: string): Promise<void> {
  const items = await index.listItems();
  for (const item of items) {
    if (item.metadata.bookId === bookId) {
      await index.deleteItem(item.id);
    }
  }
}
