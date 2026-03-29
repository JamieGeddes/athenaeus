import type { Book, SearchResult } from '../types';

export async function fetchBooks(sortBy?: string, order?: string): Promise<Book[]> {
  const params = new URLSearchParams();
  if (sortBy) params.set('sortBy', sortBy);
  if (order) params.set('order', order);

  const url = `/api/books${params.toString() ? `?${params}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch books');
  return res.json();
}

export async function fetchBook(id: string): Promise<Book> {
  const res = await fetch(`/api/books/${id}`);
  if (!res.ok) throw new Error('Failed to fetch book');
  return res.json();
}

export async function uploadBook(file: File): Promise<Book> {
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

  return res.json();
}

export async function deleteBook(id: string): Promise<void> {
  const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete book');
}

export async function searchBooks(query: string, limit: number = 10): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetch(`/api/search?${params}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}
