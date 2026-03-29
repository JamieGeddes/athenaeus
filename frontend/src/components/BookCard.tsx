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
        <h3 className="book-card-title">{book.title}</h3>
        <p className="book-card-author">{book.author}</p>
      </div>
    </button>
  );
}
