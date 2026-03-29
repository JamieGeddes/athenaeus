import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { COVERS_DIR, COVER_WIDTH } from '../config.js';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export async function extractCover(
  pdfDoc: PDFDocumentProxy,
  bookId: string,
): Promise<string> {
  const page = await pdfDoc.getPage(1);
  const defaultViewport = page.getViewport({ scale: 1.0 });
  const scale = (COVER_WIDTH * 2) / defaultViewport.width; // 2x for quality
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(
    Math.floor(viewport.width),
    Math.floor(viewport.height),
  );
  const context = canvas.getContext('2d');

  await page.render({
    canvasContext: context as any,
    viewport,
  }).promise;

  const pngBuffer = canvas.toBuffer('image/png');

  const jpegBuffer = await sharp(pngBuffer)
    .resize({ width: COVER_WIDTH })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  const coverFilename = `${bookId}.jpg`;
  await writeFile(path.join(COVERS_DIR, coverFilename), jpegBuffer);

  page.cleanup();
  return coverFilename;
}
