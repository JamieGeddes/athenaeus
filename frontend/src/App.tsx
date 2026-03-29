import { useState, useEffect, useCallback } from 'react';
import { fetchBooks } from './lib/api';
import type { Book, SortConfig } from './types';
import SearchBar from './components/SearchBar';
import UploadForm from './components/UploadForm';
import BookCarousel from './components/BookCarousel';
import BookGrid from './components/BookGrid';
import BookDetail from './components/BookDetail';

import './App.css';

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'uploadDate', order: 'desc' });
  const [loading, setLoading] = useState(true);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBooks(sortConfig.field, sortConfig.order);
      setBooks(data);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  }, [sortConfig]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleUploadComplete = (book: Book) => {
    setBooks((prev) => [book, ...prev]);
  };

  const handleDelete = (id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id));
    setSelectedBook(null);
  };

  const handleSearchSelect = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (book) setSelectedBook(book);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Athenaeus</h1>
        <SearchBar onSelectBook={handleSearchSelect} />
        <UploadForm onUploadComplete={handleUploadComplete} />
      </header>

      <main className="app-main">
        {loading && books.length === 0 ? (
          <div className="app-loading">Loading library...</div>
        ) : (
          <>
            <BookCarousel books={books} onSelect={setSelectedBook} />
            <BookGrid
              books={books}
              sortConfig={sortConfig}
              onSortChange={setSortConfig}
              onSelect={setSelectedBook}
            />
          </>
        )}
      </main>

      {selectedBook && (
        <BookDetail
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
