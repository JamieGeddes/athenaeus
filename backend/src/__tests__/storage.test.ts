import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Book } from '../types.js';

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    upload_date TEXT NOT NULL,
    cover_image_path TEXT NOT NULL,
    pdf_path TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    toc TEXT NOT NULL DEFAULT '[]',
    original_filename TEXT NOT NULL
  )
`;

const INSERT_SQL = `
  INSERT INTO books (id, title, author, upload_date, cover_image_path, pdf_path, summary, toc, original_filename)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

function createTestDb(dbPath: string) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.prepare(CREATE_TABLE_SQL).run();
  return db;
}

function makeBook(overrides?: Partial<Book>): Book {
  return {
    id: overrides?.id ?? 'test-id-1',
    title: overrides?.title ?? 'Test Book',
    author: overrides?.author ?? 'Test Author',
    uploadDate: overrides?.uploadDate ?? '2026-01-01T00:00:00.000Z',
    coverImagePath: overrides?.coverImagePath ?? 'test-id-1.jpg',
    pdfPath: overrides?.pdfPath ?? 'test-id-1.pdf',
    summary: overrides?.summary ?? 'A test summary',
    toc: overrides?.toc ?? [{ title: 'Chapter 1' }],
    originalFilename: overrides?.originalFilename ?? 'test.pdf',
    tags: overrides?.tags ?? [],
    readingStatus: overrides?.readingStatus ?? 'unread',
    notes: overrides?.notes ?? '',
    collections: overrides?.collections ?? [],
  };
}

function insertBook(db: Database.Database, book: Book) {
  db.prepare(INSERT_SQL).run(
    book.id, book.title, book.author, book.uploadDate,
    book.coverImagePath, book.pdfPath, book.summary,
    JSON.stringify(book.toc), book.originalFilename,
  );
}

describe('Storage (SQLite)', () => {
  let tmpDir: string;
  let db: Database.Database;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), 'athenaeus-test-'));
    db = createTestDb(path.join(tmpDir, 'test.db'));
  });

  afterEach(() => {
    db.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('inserts and retrieves a book', () => {
    const book = makeBook();
    insertBook(db, book);

    const row = db.prepare('SELECT * FROM books WHERE id = ?').get(book.id) as any;
    expect(row).toBeTruthy();
    expect(row.title).toBe('Test Book');
    expect(row.author).toBe('Test Author');
    expect(JSON.parse(row.toc)).toEqual([{ title: 'Chapter 1' }]);
  });

  it('returns undefined for nonexistent book', () => {
    const row = db.prepare('SELECT * FROM books WHERE id = ?').get('nonexistent');
    expect(row).toBeUndefined();
  });

  it('deletes a book', () => {
    const book = makeBook();
    insertBook(db, book);

    db.prepare('DELETE FROM books WHERE id = ?').run(book.id);
    const row = db.prepare('SELECT * FROM books WHERE id = ?').get(book.id);
    expect(row).toBeUndefined();
  });

  it('lists books sorted by title', () => {
    const books = [
      makeBook({ id: '1', title: 'Zebra Book' }),
      makeBook({ id: '2', title: 'Alpha Book' }),
      makeBook({ id: '3', title: 'Middle Book' }),
    ];
    for (const b of books) insertBook(db, b);

    const rows = db.prepare('SELECT * FROM books ORDER BY title ASC').all() as any[];
    expect(rows[0].title).toBe('Alpha Book');
    expect(rows[1].title).toBe('Middle Book');
    expect(rows[2].title).toBe('Zebra Book');
  });

  it('updates summary', () => {
    const book = makeBook();
    insertBook(db, book);

    db.prepare('UPDATE books SET summary = ? WHERE id = ?').run('Updated summary', book.id);
    const row = db.prepare('SELECT * FROM books WHERE id = ?').get(book.id) as any;
    expect(row.summary).toBe('Updated summary');
  });
});
