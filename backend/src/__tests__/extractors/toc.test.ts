import { describe, it, expect } from 'vitest';
import { extractToc } from '../../lib/extractors/toc.js';
import { createTestPdf } from '../fixtures/create-test-pdf.js';
import { getDocument } from '../../lib/pdfjs.js';

describe('extractToc', () => {
  it('returns empty array for PDF with no outline', async () => {
    const pdf = await createTestPdf({ title: 'No TOC' });
    const doc = await getDocument({ data: new Uint8Array(pdf) }).promise;
    const toc = await extractToc(doc);
    expect(toc).toEqual([]);
    await doc.destroy();
  });
});
