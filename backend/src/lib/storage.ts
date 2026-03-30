import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db.js';
import type { Book, BookRow, ReadingStatus, Collection, CollectionRow, BookFilters } from '../types.js';

function rowToBook(row: BookRow, tags: string[] = [], collections: string[] = []): Book {
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
    readingStatus: (row.reading_status || 'unread') as ReadingStatus,
    notes: row.notes || '',
    collections,
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

function getCollectionIdsForBook(bookId: string): string[] {
  const db = getDb();
  const rows = db.prepare('SELECT collection_id FROM book_collections WHERE book_id = ?').all(bookId) as { collection_id: string }[];
  return rows.map((r) => r.collection_id);
}

function getCollectionIdsForAllBooks(): Map<string, string[]> {
  const db = getDb();
  const rows = db.prepare('SELECT book_id, collection_id FROM book_collections').all() as { book_id: string; collection_id: string }[];
  const map = new Map<string, string[]>();
  for (const row of rows) {
    const ids = map.get(row.book_id) || [];
    ids.push(row.collection_id);
    map.set(row.book_id, ids);
  }
  return map;
}

export function addBook(book: Book): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO books (id, title, author, upload_date, cover_image_path, pdf_path, summary, toc, original_filename, reading_status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    book.readingStatus,
    book.notes,
  );
}

export function getBook(id: string): Book | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as BookRow | undefined;
  if (!row) return null;
  return rowToBook(row, getTagsForBook(id), getCollectionIdsForBook(id));
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
  const collectionsMap = getCollectionIdsForAllBooks();
  return rows.map((row) => rowToBook(row, tagsMap.get(row.id) || [], collectionsMap.get(row.id) || []));
}

export function removeBook(id: string): Book | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as BookRow | undefined;
  if (!existing) return null;

  db.prepare('DELETE FROM book_collections WHERE book_id = ?').run(id);
  db.prepare('DELETE FROM book_tags WHERE book_id = ?').run(id);
  db.prepare('DELETE FROM books WHERE id = ?').run(id);
  return rowToBook(existing);
}

export function updateBookSummary(id: string, summary: string): void {
  const db = getDb();
  db.prepare('UPDATE books SET summary = ? WHERE id = ?').run(summary, id);
}

export function updateBook(id: string, updates: { title?: string; author?: string; tags?: string[]; readingStatus?: ReadingStatus; notes?: string }): Book | null {
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

  if (updates.readingStatus !== undefined) {
    db.prepare('UPDATE books SET reading_status = ? WHERE id = ?').run(updates.readingStatus, id);
  }

  if (updates.notes !== undefined) {
    db.prepare('UPDATE books SET notes = ? WHERE id = ?').run(updates.notes, id);
  }

  return getBook(id);
}

export function getAllTags(): string[] {
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT tag FROM book_tags ORDER BY tag').all() as { tag: string }[];
  return rows.map((r) => r.tag);
}

// Filtered queries

export function getFilteredBooks(
  filters: BookFilters,
  sort?: { field: 'title' | 'author' | 'uploadDate'; order: 'asc' | 'desc' },
): Book[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.authors && filters.authors.length > 0) {
    conditions.push(`author IN (${filters.authors.map(() => '?').join(', ')})`);
    params.push(...filters.authors);
  }

  if (filters.statuses && filters.statuses.length > 0) {
    conditions.push(`reading_status IN (${filters.statuses.map(() => '?').join(', ')})`);
    params.push(...filters.statuses);
  }

  if (filters.tags && filters.tags.length > 0) {
    conditions.push(`EXISTS (SELECT 1 FROM book_tags WHERE book_id = books.id AND tag IN (${filters.tags.map(() => '?').join(', ')}))`);
    params.push(...filters.tags);
  }

  if (filters.collections && filters.collections.length > 0) {
    conditions.push(`EXISTS (SELECT 1 FROM book_collections WHERE book_id = books.id AND collection_id IN (${filters.collections.map(() => '?').join(', ')}))`);
    params.push(...filters.collections);
  }

  const columnMap: Record<string, string> = { title: 'title', author: 'author', uploadDate: 'upload_date' };
  let query = 'SELECT * FROM books';
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  if (sort) {
    const col = columnMap[sort.field];
    const dir = sort.order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${col} ${dir}`;
  }

  const rows = db.prepare(query).all(...params) as BookRow[];
  const tagsMap = getTagsForAllBooks();
  const collectionsMap = getCollectionIdsForAllBooks();
  return rows.map((row) => rowToBook(row, tagsMap.get(row.id) || [], collectionsMap.get(row.id) || []));
}

export function getAllAuthors(): string[] {
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT author FROM books ORDER BY author').all() as { author: string }[];
  return rows.map((r) => r.author);
}

// Collections

export function createCollection(name: string, description = ''): Collection {
  const db = getDb();
  const id = uuidv4();
  const createdDate = new Date().toISOString();
  db.prepare('INSERT INTO collections (id, name, description, created_date) VALUES (?, ?, ?, ?)').run(id, name, description, createdDate);
  return { id, name, description, createdDate, bookCount: 0 };
}

export function getAllCollections(): Collection[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT c.*, COUNT(bc.book_id) as book_count
    FROM collections c
    LEFT JOIN book_collections bc ON c.id = bc.collection_id
    GROUP BY c.id
    ORDER BY c.name
  `).all() as (CollectionRow & { book_count: number })[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    createdDate: r.created_date,
    bookCount: r.book_count,
  }));
}

export function getCollection(id: string): Collection | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT c.*, COUNT(bc.book_id) as book_count
    FROM collections c
    LEFT JOIN book_collections bc ON c.id = bc.collection_id
    WHERE c.id = ?
    GROUP BY c.id
  `).get(id) as (CollectionRow & { book_count: number }) | undefined;
  if (!row) return null;
  return { id: row.id, name: row.name, description: row.description, createdDate: row.created_date, bookCount: row.book_count };
}

export function updateCollection(id: string, updates: { name?: string; description?: string }): Collection | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as CollectionRow | undefined;
  if (!existing) return null;
  const name = updates.name ?? existing.name;
  const description = updates.description ?? existing.description;
  db.prepare('UPDATE collections SET name = ?, description = ? WHERE id = ?').run(name, description, id);
  return getCollection(id);
}

export function deleteCollection(id: string): boolean {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as CollectionRow | undefined;
  if (!existing) return false;
  db.prepare('DELETE FROM book_collections WHERE collection_id = ?').run(id);
  db.prepare('DELETE FROM collections WHERE id = ?').run(id);
  return true;
}

export function addBookToCollection(bookId: string, collectionId: string): void {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO book_collections (book_id, collection_id) VALUES (?, ?)').run(bookId, collectionId);
}

export function removeBookFromCollection(bookId: string, collectionId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM book_collections WHERE book_id = ? AND collection_id = ?').run(bookId, collectionId);
}
