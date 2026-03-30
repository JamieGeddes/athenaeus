export type ReadingStatus = 'unread' | 'want_to_read' | 'reading' | 'finished';

export interface Book {
  id: string;
  title: string;
  author: string;
  uploadDate: string;
  coverImagePath: string;
  pdfPath: string;
  summary: string;
  toc: TocEntry[];
  originalFilename: string;
  tags: string[];
  readingStatus: ReadingStatus;
  notes: string;
  collections: string[];
}

export interface TocEntry {
  title: string;
  children?: TocEntry[];
}

export interface SearchResult {
  bookId: string;
  bookTitle: string;
  chunkText: string;
  score: number;
}

export interface BookRow {
  id: string;
  title: string;
  author: string;
  upload_date: string;
  cover_image_path: string;
  pdf_path: string;
  summary: string;
  toc: string;
  original_filename: string;
  reading_status: string;
  notes: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  createdDate: string;
  bookCount: number;
}

export interface BookFilters {
  authors?: string[];
  tags?: string[];
  statuses?: ReadingStatus[];
  collections?: string[];
}

export interface CollectionRow {
  id: string;
  name: string;
  description: string;
  created_date: string;
}
