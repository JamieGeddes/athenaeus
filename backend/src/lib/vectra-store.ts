import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { LocalIndex } from 'vectra';
import { VECTRA_DIR, EMBEDDING_BATCH_SIZE } from './config.js';
import { embed, embedBatch } from './embeddings.js';
import type { SearchResult } from '../types.js';

const index = new LocalIndex(VECTRA_DIR);

async function isIndexValid(): Promise<boolean> {
  try {
    const content = await fs.readFile(path.join(VECTRA_DIR, 'index.json'), 'utf-8');
    const data = JSON.parse(content);
    return data !== null && typeof data === 'object' &&
      typeof data.version === 'number' && Array.isArray(data.items);
  } catch {
    return false;
  }
}

export async function initIndex(): Promise<void> {
  if (!(await index.isIndexCreated()) || !(await isIndexValid())) {
    console.log('Vectra index missing or invalid, creating fresh index...');
    await index.createIndex({ version: 1, deleteIfExists: true });
  }
  const stats = await index.getIndexStats();
  console.log(`Vectra index ready: ${stats.items} items`);
}

export async function addChunks(
  bookId: string,
  bookTitle: string,
  chunks: { text: string; index: number; pageNumber: number }[],
  onChunkProgress?: (completed: number, total: number) => void,
): Promise<void> {
  if (chunks.length === 0) return;

  // Wrap all inserts in a single Vectra transaction so insertItem skips disk
  // I/O per item (see LocalIndex.ts:194-195). Without this, each insert
  // serializes the entire index.json file to disk.
  await index.beginUpdate();

  try {
    for (let batchStart = 0; batchStart < chunks.length; batchStart += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(batchStart, batchStart + EMBEDDING_BATCH_SIZE);
      const texts = batch.map((c) => c.text);

      // Single batched forward pass through the transformer model.
      const vectors = await embedBatch(texts);

      for (let i = 0; i < batch.length; i++) {
        await index.insertItem({
          vector: vectors[i],
          metadata: {
            bookId,
            bookTitle,
            chunkIndex: batch[i].index,
            text: batch[i].text,
            pageNumber: batch[i].pageNumber,
          },
        });
      }

      const completed = Math.min(batchStart + batch.length, chunks.length);
      onChunkProgress?.(completed, chunks.length);
    }

    await index.endUpdate();
  } catch (err) {
    index.cancelUpdate();
    throw err;
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
      pageNumber: (r.item.metadata.pageNumber as number) ?? null,
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
