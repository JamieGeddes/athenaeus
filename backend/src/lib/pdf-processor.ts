import { getDocument } from './pdfjs.js';
import { extractMetadata } from './extractors/metadata.js';
import { extractCover } from './extractors/cover.js';
import { extractToc } from './extractors/toc.js';
import { extractText } from './extractors/text.js';
import { addChunks, queryChunks } from './vectra-store.js';
import { generateSummary } from './gemini.js';
import { CHUNK_SIZE, CHUNK_OVERLAP, SUMMARY_MAX_CHUNKS } from './config.js';
import type { TocEntry } from '../types.js';

function chunkText(text: string): { text: string; index: number }[] {
  const chunks: { text: string; index: number }[] = [];
  let start = 0;
  let idx = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunk = text.substring(start, end).trim();
    if (chunk.length > 0) {
      chunks.push({ text: chunk, index: idx++ });
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
    const [coverImagePath, toc, fullText] = await Promise.all([
      extractCover(pdfDoc, bookId),
      extractToc(pdfDoc),
      extractText(pdfDoc),
    ]);

    // Chunk and ingest into Vectra
    onProgress?.('Generating embeddings', 40);
    const chunks = chunkText(fullText);
    let lastEmittedProgress = 40;
    await addChunks(bookId, title, chunks, (completed, total) => {
      const progress = 40 + Math.round((completed / total) * 40);
      if (progress >= lastEmittedProgress + 2) {
        lastEmittedProgress = progress;
        onProgress?.('Generating embeddings', progress);
      }
    });

    // Generate summary via RAG
    onProgress?.('Generating summary', 85);
    const topChunks = await queryChunks(title, SUMMARY_MAX_CHUNKS, bookId);
    const chunkTexts = topChunks.map((c) => c.chunkText);
    const summary = chunkTexts.length > 0
      ? await generateSummary(chunkTexts, title)
      : 'No text content could be extracted from this PDF.';

    onProgress?.('Finalizing', 95);
    return { title, author, coverImagePath, toc, summary };
  } finally {
    await pdfDoc.destroy();
  }
}
