import { PDFDocument } from 'pdf-lib';

export async function createTestPdf(options?: {
  title?: string;
  author?: string;
  pages?: number;
}): Promise<Buffer> {
  const doc = await PDFDocument.create();
  if (options?.title) doc.setTitle(options.title);
  if (options?.author) doc.setAuthor(options.author);

  const pageCount = options?.pages ?? 1;
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([612, 792]);
    page.drawText(`Page ${i + 1} content for testing Athenaeus.`, {
      x: 50,
      y: 700,
      size: 12,
    });
    page.drawText(`This is sample text on page ${i + 1} of the test document.`, {
      x: 50,
      y: 680,
      size: 10,
    });
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
