import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchBooks, fetchCollections, fetchAuthors, createCollection, deleteCollectionApi } from './lib/api';
import type { Book, SortConfig, ReadingStatus, Collection, BookFilters, SearchResult } from './types';

const STATUS_LABELS: Record<ReadingStatus, string> = {
  unread: 'Unread',
  want_to_read: 'Want to Read',
  reading: 'Reading',
  finished: 'Finished',
};
import SearchBar from './components/SearchBar';
import UploadModal from './components/UploadModal';
import BookCarousel from './components/BookCarousel';
import BookGrid from './components/BookGrid';
import BookDetail from './components/BookDetail';

import './App.css';

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'uploadDate', order: 'desc' });
  const [filters, setFilters] = useState<BookFilters>({ authors: [], tags: [], statuses: [], collections: [] });
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allAuthors, setAllAuthors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const hasActiveFilters = filters.authors.length > 0 || filters.tags.length > 0 || filters.statuses.length > 0 || filters.collections.length > 0;

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBooks(sortConfig.field, sortConfig.order, hasActiveFilters ? filters : undefined);
      setBooks(data);
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  }, [sortConfig, filters, hasActiveFilters]);

  const loadCollections = useCallback(async () => {
    try {
      const data = await fetchCollections();
      setCollections(data);
    } catch (err) {
      console.error('Failed to load collections:', err);
    }
  }, []);

  const loadAuthors = useCallback(async () => {
    try {
      const data = await fetchAuthors();
      setAllAuthors(data);
    } catch (err) {
      console.error('Failed to load authors:', err);
    }
  }, []);

  useEffect(() => {
    loadBooks();
    loadCollections();
    loadAuthors();
  }, [loadBooks, loadCollections, loadAuthors]);

  const handleUploadComplete = (book: Book) => {
    setBooks((prev) => [book, ...prev]);
  };

  const handleDelete = (id: string) => {
    setBooks((prev) => prev.filter((b) => b.id !== id));
    setSelectedBook(null);
  };

  const handleUpdate = (updated: Book) => {
    setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setSelectedBook(updated);
    loadCollections();
  };

  const handleCreateCollection = async (name: string) => {
    try {
      const collection = await createCollection(name);
      setCollections((prev) => [...prev, collection].sort((a, b) => a.name.localeCompare(b.name)));
      return collection;
    } catch (err) {
      console.error('Failed to create collection:', err);
      throw err;
    }
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await deleteCollectionApi(id);
      setCollections((prev) => prev.filter((c) => c.id !== id));
      if (filters.collections.includes(id)) {
        setFilters((prev) => ({ ...prev, collections: prev.collections.filter((c) => c !== id) }));
      }
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  };

  const handleSearchSelect = (result: SearchResult) => {
    const book = books.find((b) => b.id === result.bookId);
    if (book) {
      const pageFragment = result.pageNumber ? `#page=${result.pageNumber}` : '';
      window.open(`/pdfs/${book.pdfPath}${pageFragment}`, '_blank');
    }
  };

  const stats = useMemo(() => {
    const s = { unread: 0, want_to_read: 0, reading: 0, finished: 0 };
    books.forEach((b) => { s[b.readingStatus || 'unread']++; });
    return s;
  }, [books]);

  const handleFiltersChange = (newFilters: BookFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Athenaeus</h1>
        <SearchBar onSelectResult={handleSearchSelect} />
        <button className="upload-btn" onClick={() => setShowUploadModal(true)}>Upload</button>
      </header>

      {books.length > 0 && (
        <div className="stats-bar">
          {(Object.entries(STATUS_LABELS) as [ReadingStatus, string][]).map(([status, label]) => (
            <div key={status} className={`stats-card stats-card--${status}`}>
              <span className="stats-count">{stats[status]}</span>
              <span className="stats-label">{label}</span>
            </div>
          ))}
        </div>
      )}

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
              filters={filters}
              onFiltersChange={handleFiltersChange}
              collections={collections}
              allAuthors={allAuthors}
              onCreateCollection={handleCreateCollection}
              onDeleteCollection={handleDeleteCollection}
            />
          </>
        )}
      </main>

      {showUploadModal && (
        <UploadModal
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {selectedBook && (
        <BookDetail
          book={selectedBook}
          onClose={() => setSelectedBook(null)}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          collections={collections}
        />
      )}
    </div>
  );
}
