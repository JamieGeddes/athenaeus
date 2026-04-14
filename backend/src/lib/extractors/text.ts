import type { PDFDocumentProxy } from 'pdfjs-dist';
import { TEXT_EXTRACTION_CONCURRENCY } from '../config.js';

async function extractPage(
  pdfDoc: PDFDocumentProxy,
  pageNumber: number,
): Promise<{ text: string; pageNumber: number }> {
  const page = await pdfDoc.getPage(pageNumber);
  const textContent = await page.getTextContent();

  let pageText = '';
  let lastY: number | null = null;

  for (const item of textContent.items) {
    if ('str' in item) {
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        pageText += '\n';
      }
      pageText += item.str;
      lastY = item.transform[5];
    }
  }

  page.cleanup();
  return { text: pageText.trim(), pageNumber };
}

export async function extractText(
  pdfDoc: PDFDocumentProxy,
): Promise<{ text: string; pageNumber: number }[]> {
  const totalPages = pdfDoc.numPages;
  const results: { text: string; pageNumber: number }[] = new Array(totalPages);

  // Worker pool: N workers pull the next page number from a shared counter.
  // JavaScript's single-threaded execution makes the counter safe between
  // awaits. Bounded concurrency keeps memory usage flat for very large PDFs
  // while still pipelining requests to the pdfjs worker.
  let nextPage = 1;

  async function worker(): Promise<void> {
    while (true) {
      const pageNum = nextPage++;
      if (pageNum > totalPages) break;
      results[pageNum - 1] = await extractPage(pdfDoc, pageNum);
    }
  }

  const concurrency = Math.min(TEXT_EXTRACTION_CONCURRENCY, totalPages);
  const workers: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return results;
}
