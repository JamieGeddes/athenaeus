import { useEffect } from 'react';
import type { Book } from '../types';
import './PdfReader.css';

interface Props {
  book: Book;
  onClose: () => void;
}

export default function PdfReader({ book, onClose }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="reader-overlay">
      <div className="reader-toolbar">
        <button className="reader-back" onClick={onClose}>
          &larr; Back to Library
        </button>
        <span className="reader-title">{book.title}</span>
      </div>
      <iframe
        className="reader-frame"
        src={`/pdfs/${book.pdfPath}`}
        title={book.title}
      />
    </div>
  );
}
