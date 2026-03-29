import { describe, it, expect } from 'vitest';
import { extractMetadata } from '../../lib/extractors/metadata.js';
import { createTestPdf } from '../fixtures/create-test-pdf.js';

describe('extractMetadata', () => {
  it('extracts title and author when present', async () => {
    const pdf = await createTestPdf({ title: 'My Book', author: 'Jane Doe' });
    const result = await extractMetadata(pdf);
    expect(result.title).toBe('My Book');
    expect(result.author).toBe('Jane Doe');
  });

  it('returns fallback values when metadata is missing', async () => {
    const pdf = await createTestPdf();
    const result = await extractMetadata(pdf);
    expect(result.title).toBe('Untitled');
    expect(result.author).toBe('Unknown Author');
  });
});
