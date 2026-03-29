import { useRef } from 'react';
import type { Book } from '../types';
import './BookCarousel.css';

interface Props {
  books: Book[];
  onSelect: (book: Book) => void;
}

export default function BookCarousel({ books, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    scrollRef.current?.scrollBy({
      left: direction === 'left' ? -300 : 300,
      behavior: 'smooth',
    });
  };

  if (books.length === 0) return null;

  return (
    <section className="carousel">
      <h2>Featured</h2>
      <div className="carousel-container">
        <button className="carousel-btn carousel-btn-left" onClick={() => scroll('left')} aria-label="Scroll left">
          &#8249;
        </button>
        <div className="carousel-track" ref={scrollRef}>
          {books.map((book) => (
            <button
              key={book.id}
              className="carousel-item"
              onClick={() => onSelect(book)}
            >
              <img
                src={`/covers/${book.coverImagePath}`}
                alt={book.title}
                loading="lazy"
              />
            </button>
          ))}
        </div>
        <button className="carousel-btn carousel-btn-right" onClick={() => scroll('right')} aria-label="Scroll right">
          &#8250;
        </button>
      </div>
    </section>
  );
}
