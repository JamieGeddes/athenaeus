import { getDocument } from './pdfjs.js';
import { extractMetadata } from './extractors/metadata.js';
import { extractCover } from './extractors/cover.js';
import { extractToc } from './extractors/toc.js';
import { extractText } from './extractors/text.js';
import { addChunks, queryChunks } from './vectra-store.js';
import { generateSummary } from './gemini.js';
import { CHUNK_SIZE, CHUNK_OVERLAP, SUMMARY_MAX_CHUNKS, EMBEDDING_BATCH_SIZE } from './config.js';
import type { TocEntry } from '../types.js';

export function chunkText(
  pages: { text: string; pageNumber: number }[],
): { text: string; index: number; pageNumber: number }[] {
  const fullText = pages.map((p) => p.text).join('\n\n');

  // Build a mapping of character offsets to page numbers
  const pageStarts: { offset: number; pageNumber: number }[] = [];
  let offset = 0;
  for (const page of pages) {
    pageStarts.push({ offset, pageNumber: page.pageNumber });
    offset += page.text.length + 2; // +2 for '\n\n' separator
  }

  const chunks: { text: string; index: number; pageNumber: number }[] = [];
  let start = 0;
  let idx = 0;

  while (start < fullText.length) {
    const end = Math.min(start + CHUNK_SIZE, fullText.length);
    const chunk = fullText.substring(start, end).trim();
    if (chunk.length > 0) {
      // Find the page this chunk starts on
      let pageNumber = pageStarts[0].pageNumber;
      for (const ps of pageStarts) {
        if (ps.offset <= start) pageNumber = ps.pageNumber;
        else break;
      }
      chunks.push({ text: chunk, index: idx++, pageNumber });
    }
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

export async function processPdf(
  pdfBuffer: Buffer,
  bookId: string,
  onProgress?: (step: string, progress: number) => void,
): Promise<{
  title: string;
  author: string;
  coverImagePath: string;
  toc: TocEntry[];
  summary: string;
}> {
  // Extract metadata via pdf-lib
  onProgress?.('Extracting metadata', 5);
  const { title, author } = await extractMetadata(pdfBuffer);

  // Load pdfjs-dist document once
  onProgress?.('Extracting content', 20);
  const loadingTask = getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdfDoc = await loadingTask.promise;

  try {
    // Run extractors in parallel
    const [coverImagePath, toc, pages] = await Promise.all([
      extractCover(pdfDoc, bookId),
      extractToc(pdfDoc),
      extractText(pdfDoc),
    ]);

    // Chunk text and ingest in two phases so summary generation can overlap
    // with the remaining embedding work.
    onProgress?.('Generating embeddings', 40);
    const chunks = chunkText(pages);

    // Phase 1: embed and commit enough chunks to cover summary needs. This
    // commit flushes to disk via endUpdate(), making these chunks queryable
    // before phase 2 starts.
    const phase1Size = Math.min(
      Math.max(SUMMARY_MAX_CHUNKS * 3, EMBEDDING_BATCH_SIZE),
      chunks.length,
    );
    const phase1Chunks = chunks.slice(0, phase1Size);
    const phase2Chunks = chunks.slice(phase1Size);

    let lastEmittedProgress = 40;
    const emitProgress = (completed: number) => {
      const progress = 40 + Math.round((completed / chunks.length) * 40);
      if (progress >= lastEmittedProgress + 2) {
        lastEmittedProgress = progress;
        onProgress?.('Generating embeddings', progress);
      }
    };

    await addChunks(bookId, title, phase1Chunks, (completed) => {
      emitProgress(completed);
    });

    // Phase 2: remaining chunks embed in parallel with summary generation.
    const phase2Promise: Promise<void> = phase2Chunks.length > 0
      ? addChunks(bookId, title, phase2Chunks, (completed) => {
          emitProgress(phase1Size + completed);
        })
      : Promise.resolve();

    onProgress?.('Generating summary', 85);
    const summaryPromise = (async () => {
      const topChunks = await queryChunks(title, SUMMARY_MAX_CHUNKS, bookId);
      const chunkTexts = topChunks.map((c) => c.chunkText);
      return chunkTexts.length > 0
        ? await generateSummary(chunkTexts, title)
        : 'No text content could be extracted from this PDF.';
    })();

    const [, summary] = await Promise.all([phase2Promise, summaryPromise]);

    onProgress?.('Finalizing', 95);
    return { title, author, coverImagePath, toc, summary };
  } finally {
    await pdfDoc.destroy();
  }
}
