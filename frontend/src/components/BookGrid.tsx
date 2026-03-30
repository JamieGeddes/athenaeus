import { useState } from 'react';
import type { Book, SortConfig, Collection, BookFilters, ReadingStatus } from '../types';
import BookCard from './BookCard';
import './BookGrid.css';

interface Props {
  books: Book[];
  sortConfig: SortConfig;
  onSortChange: (config: SortConfig) => void;
  onSelect: (book: Book) => void;
  filters: BookFilters;
  onFiltersChange: (filters: BookFilters) => void;
  collections: Collection[];
  allAuthors: string[];
  onCreateCollection: (name: string) => Promise<Collection>;
  onDeleteCollection: (id: string) => void;
}

const sortOptions: { field: SortConfig['field']; label: string }[] = [
  { field: 'title', label: 'Title' },
  { field: 'author', label: 'Author' },
  { field: 'uploadDate', label: 'Date' },
];

const STATUS_OPTIONS: { value: ReadingStatus; label: string }[] = [
  { value: 'unread', label: 'Unread' },
  { value: 'want_to_read', label: 'Want to Read' },
  { value: 'reading', label: 'Reading' },
  { value: 'finished', label: 'Finished' },
];

export default function BookGrid({ books, sortConfig, onSortChange, onSelect, filters, onFiltersChange, collections, allAuthors, onCreateCollection, onDeleteCollection }: Props) {
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollection, setShowNewCollection] = useState(false);
  const allTags = [...new Set(books.flatMap((b) => b.tags))].sort();

  const hasFilters = filters.authors.length > 0 || filters.tags.length > 0 || filters.statuses.length > 0 || filters.collections.length > 0;

  const toggleFilter = <K extends keyof BookFilters>(key: K, value: BookFilters[K][number]) => {
    const current = filters[key] as string[];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: updated });
  };

  const clearFilters = () => {
    onFiltersChange({ authors: [], tags: [], statuses: [], collections: [] });
  };

  const handleAddCollection = async () => {
    const name = newCollectionName.trim();
    if (!name) return;
    try {
      await onCreateCollection(name);
      setNewCollectionName('');
      setShowNewCollection(false);
    } catch {}
  };

  const handleSort = (field: SortConfig['field']) => {
    if (sortConfig.field === field) {
      onSortChange({ field, order: sortConfig.order === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ field, order: 'asc' });
    }
  };

  return (
    <section className="book-grid-section">
      <div className="book-grid-header">
        <h2>Library</h2>
        <div className="sort-controls">
          {sortOptions.map((opt) => (
            <button
              key={opt.field}
              className={`sort-btn ${sortConfig.field === opt.field ? 'active' : ''}`}
              onClick={() => handleSort(opt.field)}
            >
              {opt.label}
              {sortConfig.field === opt.field && (
                <span className="sort-arrow">
                  {sortConfig.order === 'asc' ? ' \u2191' : ' \u2193'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-bar">
        {hasFilters && (
          <button className="tag-filter-clear filter-clear-all" onClick={clearFilters}>
            Clear all filters
          </button>
        )}

        <div className="filter-category">
          <div className="filter-category-header">Status</div>
          <div className="filter-pills">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`tag-filter-btn ${filters.statuses.includes(opt.value) ? 'active' : ''}`}
                onClick={() => toggleFilter('statuses', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {allAuthors.length > 1 && (
          <div className="filter-category">
            <div className="filter-category-header">Author</div>
            <div className="filter-pills">
              {allAuthors.map((author) => (
                <button
                  key={author}
                  className={`tag-filter-btn ${filters.authors.includes(author) ? 'active' : ''}`}
                  onClick={() => toggleFilter('authors', author)}
                >
                  {author}
                </button>
              ))}
            </div>
          </div>
        )}

        {allTags.length > 0 && (
          <div className="filter-category">
            <div className="filter-category-header">Tags</div>
            <div className="filter-pills">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className={`tag-filter-btn ${filters.tags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleFilter('tags', tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="filter-category">
          <div className="filter-category-header">Collections</div>
          <div className="filter-pills">
            {collections.map((col) => (
              <button
                key={col.id}
                className={`tag-filter-btn ${filters.collections.includes(col.id) ? 'active' : ''}`}
                onClick={() => toggleFilter('collections', col.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (confirm(`Delete collection "${col.name}"?`)) onDeleteCollection(col.id);
                }}
              >
                {col.name} <span className="collection-count">({col.bookCount})</span>
              </button>
            ))}
            {showNewCollection ? (
              <input
                className="collection-add-input"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCollection();
                  if (e.key === 'Escape') { setShowNewCollection(false); setNewCollectionName(''); }
                }}
                onBlur={() => { if (!newCollectionName.trim()) setShowNewCollection(false); }}
                placeholder="Collection name..."
                autoFocus
              />
            ) : (
              <button className="tag-filter-btn collection-add-btn" onClick={() => setShowNewCollection(true)}>
                + New
              </button>
            )}
          </div>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="book-grid-empty">
          <p>{hasFilters ? 'No books match the selected filters.' : 'No books yet. Upload a PDF to get started.'}</p>
        </div>
      ) : (
        <div className="book-grid">
          {books.map((book) => (
            <BookCard key={book.id} book={book} onSelect={onSelect} />
          ))}
        </div>
      )}
    </section>
  );
}
