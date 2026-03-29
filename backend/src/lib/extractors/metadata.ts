import { PDFDocument } from 'pdf-lib';

export async function extractMetadata(pdfBuffer: Buffer): Promise<{ title: string; author: string }> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { updateMetadata: false });
  const title = pdfDoc.getTitle() || 'Untitled';
  const author = pdfDoc.getAuthor() || 'Unknown Author';
  return { title, author };
}
