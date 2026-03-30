import { useState } from 'react';
import type { Book } from '../types';
import './BookCard.css';

interface Props {
  book: Book;
  onSelect: (book: Book) => void;
}

export default function BookCard({ book, onSelect }: Props) {
  const [imgError, setImgError] = useState(false);

  return (
    <button className="book-card" onClick={() => onSelect(book)}>
      <div className="book-card-cover">
        {imgError ? (
          <div className="book-card-placeholder">
            <span>{book.title.charAt(0)}</span>
          </div>
        ) : (
          <img
            src={`/covers/${book.coverImagePath}`}
            alt={book.title}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="book-card-info">
        {book.readingStatus && book.readingStatus !== 'unread' && (
          <span className={`book-card-status book-card-status--${book.readingStatus}`}>
            {({ want_to_read: 'Want to Read', reading: 'Reading', finished: 'Finished' } as Record<string, string>)[book.readingStatus]}
          </span>
        )}
        <h3 className="book-card-title">{book.title}</h3>
        <p className="book-card-author">{book.author}</p>
        {book.tags.length > 0 && (
          <div className="book-card-tags">
            {book.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="book-card-tag">{tag}</span>
            ))}
            {book.tags.length > 3 && (
              <span className="book-card-tag book-card-tag-more">+{book.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
