import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = path.resolve(__dirname, '../../../data');
export const PDFS_DIR = path.join(DATA_DIR, 'pdfs');
export const COVERS_DIR = path.join(DATA_DIR, 'covers');
export const VECTRA_DIR = path.join(DATA_DIR, 'vectra-index');
export const DB_PATH = path.join(DATA_DIR, 'athenaeus.db');

export const CHUNK_SIZE = 500;
export const CHUNK_OVERLAP = 50;
export const COVER_WIDTH = 400;
export const SUMMARY_MAX_CHUNKS = 10;
export const EMBEDDING_BATCH_SIZE = 32;
export const TEXT_EXTRACTION_CONCURRENCY = 5;
