import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { TocEntry } from '../../types.js';

export async function extractToc(pdfDoc: PDFDocumentProxy): Promise<TocEntry[]> {
  const outline = await pdfDoc.getOutline();
  if (!outline) return [];

  function mapOutline(items: any[]): TocEntry[] {
    return items.map((item) => ({
      title: item.title,
      children: item.items?.length > 0 ? mapOutline(item.items) : undefined,
    }));
  }

  return mapOutline(outline);
}
