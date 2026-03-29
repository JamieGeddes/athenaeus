import type { Book, SortConfig } from '../types';
import BookCard from './BookCard';
import './BookGrid.css';

interface Props {
  books: Book[];
  sortConfig: SortConfig;
  onSortChange: (config: SortConfig) => void;
  onSelect: (book: Book) => void;
}

const sortOptions: { field: SortConfig['field']; label: string }[] = [
  { field: 'title', label: 'Title' },
  { field: 'author', label: 'Author' },
  { field: 'uploadDate', label: 'Date' },
];

export default function BookGrid({ books, sortConfig, onSortChange, onSelect }: Props) {
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
      {books.length === 0 ? (
        <div className="book-grid-empty">
          <p>No books yet. Upload a PDF to get started.</p>
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
