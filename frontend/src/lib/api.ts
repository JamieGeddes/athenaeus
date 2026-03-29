import type { Book, SearchResult } from '../types';

async function fetchWithRetry(url: string, init?: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, init);
      return res;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Unreachable');
}

export async function fetchBooks(sortBy?: string, order?: string): Promise<Book[]> {
  const params = new URLSearchParams();
  if (sortBy) params.set('sortBy', sortBy);
  if (order) params.set('order', order);

  const url = `/api/books${params.toString() ? `?${params}` : ''}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error('Failed to fetch books');
  return res.json();
}

export async function fetchBook(id: string): Promise<Book> {
  const res = await fetchWithRetry(`/api/books/${id}`);
  if (!res.ok) throw new Error('Failed to fetch book');
  return res.json();
}

export interface UploadProgress {
  step: string;
  progress: number;
}

export async function uploadBook(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<Book> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/books', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let book: Book | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (!line.trim()) continue;
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }
      if (event.error) {
        throw new Error(event.error as string);
      }
      if (event.done) {
        book = event.book as Book;
      } else if (event.step) {
        onProgress?.({ step: event.step as string, progress: event.progress as number });
      }
    }
  }

  if (buffer.trim()) {
    try {
      const event = JSON.parse(buffer);
      if (event.error) throw new Error(event.error);
      if (event.done) book = event.book;
    } catch (err) {
      if (err instanceof Error && err.message !== buffer.trim()) throw err;
    }
  }

  if (!book) {
    throw new Error('Processing failed unexpectedly');
  }

  return book;
}

export async function deleteBook(id: string): Promise<void> {
  const res = await fetchWithRetry(`/api/books/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete book');
}

export async function searchBooks(query: string, limit: number = 10): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetchWithRetry(`/api/search?${params}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}
