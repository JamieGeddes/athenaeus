import type { Book, SortConfig } from '../types';
import BookCard from './BookCard';
import './BookGrid.css';

interface Props {
  books: Book[];
  sortConfig: SortConfig;
  onSortChange: (config: SortConfig) => void;
  onSelect: (book: Book) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
}

const sortOptions: { field: SortConfig['field']; label: string }[] = [
  { field: 'title', label: 'Title' },
  { field: 'author', label: 'Author' },
  { field: 'uploadDate', label: 'Date' },
];

export default function BookGrid({ books, sortConfig, onSortChange, onSelect, selectedTags, onTagToggle }: Props) {
  const allTags = [...new Set(books.flatMap((b) => b.tags))].sort();

  const filtered = selectedTags.length > 0
    ? books.filter((b) => selectedTags.every((t) => b.tags.includes(t)))
    : books;

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
      {allTags.length > 0 && (
        <div className="tag-filters">
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`tag-filter-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
              onClick={() => onTagToggle(tag)}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button className="tag-filter-clear" onClick={() => selectedTags.forEach(onTagToggle)}>
              Clear
            </button>
          )}
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="book-grid-empty">
          <p>{books.length === 0 ? 'No books yet. Upload a PDF to get started.' : 'No books match the selected tags.'}</p>
        </div>
      ) : (
        <div className="book-grid">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} onSelect={onSelect} />
          ))}
        </div>
      )}
    </section>
  );
}
