import { getDb } from './db.js';
import type { Book, BookRow } from '../types.js';

function rowToBook(row: BookRow, tags: string[] = []): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    uploadDate: row.upload_date,
    coverImagePath: row.cover_image_path,
    pdfPath: row.pdf_path,
    summary: row.summary,
    toc: JSON.parse(row.toc),
    originalFilename: row.original_filename,
    tags,
  };
}

function getTagsForBook(bookId: string): string[] {
  const db = getDb();
  const rows = db.prepare('SELECT tag FROM book_tags WHERE book_id = ? ORDER BY tag').all(bookId) as { tag: string }[];
  return rows.map((r) => r.tag);
}

function getTagsForAllBooks(): Map<string, string[]> {
  const db = getDb();
  const rows = db.prepare('SELECT book_id, tag FROM book_tags ORDER BY tag').all() as { book_id: string; tag: string }[];
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const tags = map.get(row.book_id) || [];
    tags.push(row.tag);
    map.set(row.book_id, tags);
  }
  return map;
}

export function addBook(book: Book): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO books (id, title, author, upload_date, cover_image_path, pdf_path, summary, toc, original_filename)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    book.id,
    book.title,
    book.author,
    book.uploadDate,
    book.coverImagePath,
    book.pdfPath,
    book.summary,
    JSON.stringify(book.toc),
    book.originalFilename,
  );
}

export function getBook(id: string): Book | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as BookRow | undefined;
  if (!row) return null;
  return rowToBook(row, getTagsForBook(id));
}

export function getAllBooks(sort?: { field: 'title' | 'author' | 'uploadDate'; order: 'asc' | 'desc' }): Book[] {
  const db = getDb();
  const columnMap: Record<string, string> = {
    title: 'title',
    author: 'author',
    uploadDate: 'upload_date',
  };

  let query = 'SELECT * FROM books';
  if (sort) {
    const col = columnMap[sort.field];
    const dir = sort.order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${col} ${dir}`;
  }

  const rows = db.prepare(query).all() as BookRow[];
  const tagsMap = getTagsForAllBooks();
  return rows.map((row) => rowToBook(row, tagsMap.get(row.id) || []));
}

export function removeBook(id: string): Book | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as BookRow | undefined;
  if (!existing) return null;

  db.prepare('DELETE FROM book_tags WHERE book_id = ?').run(id);
  db.prepare('DELETE FROM books WHERE id = ?').run(id);
  return rowToBook(existing);
}

export function updateBookSummary(id: string, summary: string): void {
  const db = getDb();
  db.prepare('UPDATE books SET summary = ? WHERE id = ?').run(summary, id);
}

export function updateBook(id: string, updates: { title?: string; author?: string; tags?: string[] }): Book | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as BookRow | undefined;
  if (!existing) return null;

  if (updates.title !== undefined || updates.author !== undefined) {
    const title = updates.title ?? existing.title;
    const author = updates.author ?? existing.author;
    db.prepare('UPDATE books SET title = ?, author = ? WHERE id = ?').run(title, author, id);
  }

  if (updates.tags !== undefined) {
    db.prepare('DELETE FROM book_tags WHERE book_id = ?').run(id);
    const insert = db.prepare('INSERT INTO book_tags (book_id, tag) VALUES (?, ?)');
    for (const tag of updates.tags) {
      insert.run(id, tag);
    }
  }

  return getBook(id);
}

export function getAllTags(): string[] {
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT tag FROM book_tags ORDER BY tag').all() as { tag: string }[];
  return rows.map((r) => r.tag);
}
