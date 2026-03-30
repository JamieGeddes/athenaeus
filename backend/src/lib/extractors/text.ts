import type { PDFDocumentProxy } from 'pdfjs-dist';

export async function extractText(
  pdfDoc: PDFDocumentProxy,
): Promise<{ text: string; pageNumber: number }[]> {
  const pages: { text: string; pageNumber: number }[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
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

    pages.push({ text: pageText.trim(), pageNumber: i });
    page.cleanup();
  }

  return pages;
}
