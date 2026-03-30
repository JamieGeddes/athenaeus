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
}

export interface TocEntry {
  title: string;
  children?: TocEntry[];
}

export interface SortConfig {
  field: 'title' | 'author' | 'uploadDate';
  order: 'asc' | 'desc';
}

export interface SearchResult {
  bookId: string;
  bookTitle: string;
  chunkText: string;
  score: number;
}
