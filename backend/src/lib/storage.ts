import { getDb } from './db.js';
import type { Book, BookRow } from '../types.js';

function rowToBook(row: BookRow): Book {
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
  };
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
  return row ? rowToBook(row) : null;
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
  return rows.map(rowToBook);
}

export function removeBook(id: string): Book | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as BookRow | undefined;
  if (!existing) return null;

  db.prepare('DELETE FROM books WHERE id = ?').run(id);
  return rowToBook(existing);
}

export function updateBookSummary(id: string, summary: string): void {
  const db = getDb();
  db.prepare('UPDATE books SET summary = ? WHERE id = ?').run(summary, id);
}
