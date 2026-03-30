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
}
