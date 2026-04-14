import { describe, it, expect } from 'vitest';
import { extractText } from '../../lib/extractors/text.js';
import { createTestPdf } from '../fixtures/create-test-pdf.js';
import { getDocument } from '../../lib/pdfjs.js';

describe('extractText', () => {
  it('extracts text from a single-page PDF', async () => {
    const pdf = await createTestPdf({ title: 'Text Test', pages: 1 });
    const doc = await getDocument({ data: new Uint8Array(pdf) }).promise;
    const pages = await extractText(doc);
    expect(pages).toHaveLength(1);
    expect(pages[0].pageNumber).toBe(1);
    const fullText = pages.map((p) => p.text).join('\n');
    expect(fullText).toContain('Page 1 content');
    expect(fullText).toContain('sample text');
    await doc.destroy();
  });

  it('extracts text from multi-page PDF', async () => {
    const pdf = await createTestPdf({ pages: 3 });
    const doc = await getDocument({ data: new Uint8Array(pdf) }).promise;
    const pages = await extractText(doc);
    expect(pages).toHaveLength(3);
    expect(pages.map((p) => p.pageNumber)).toEqual([1, 2, 3]);
    const fullText = pages.map((p) => p.text).join('\n');
    expect(fullText).toContain('Page 1 content');
    expect(fullText).toContain('Page 2 content');
    expect(fullText).toContain('Page 3 content');
    await doc.destroy();
  });
});
