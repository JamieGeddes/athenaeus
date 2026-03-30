import Database from 'better-sqlite3';
import { DB_PATH } from './config.js';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.prepare(`
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
    `).run();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS book_tags (
        book_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (book_id, tag),
        FOREIGN KEY (book_id) REFERENCES books(id)
      )
    `).run();
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
