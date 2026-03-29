import { useState } from 'react';
import type { Book, TocEntry } from '../types';
import { deleteBook } from '../lib/api';
import './BookDetail.css';

interface Props {
  book: Book;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function TocList({ entries }: { entries: TocEntry[] }) {
  return (
    <ul className="toc-list">
      {entries.map((entry, i) => (
        <li key={i}>
          {entry.title}
          {entry.children && <TocList entries={entry.children} />}
        </li>
      ))}
    </ul>
  );
}

export default function BookDetail({ book, onClose, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBook(book.id);
      onDelete(book.id);
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose} aria-label="Close">
          &times;
        </button>

        <div className="detail-content">
          <div className="detail-cover">
            <img src={`/covers/${book.coverImagePath}`} alt={book.title} />
          </div>

          <div className="detail-info">
            <h2>{book.title}</h2>
            <p className="detail-author">{book.author}</p>
            <p className="detail-date">
              Uploaded {new Date(book.uploadDate).toLocaleDateString()}
            </p>

            {book.summary && (
              <div className="detail-section">
                <h3>Summary</h3>
                <p className="detail-summary">{book.summary}</p>
              </div>
            )}

            {book.toc.length > 0 && (
              <div className="detail-section">
                <h3>Table of Contents</h3>
                <TocList entries={book.toc} />
              </div>
            )}

            <div className="detail-actions">
              {confirming ? (
                <div className="detail-confirm">
                  <span>Delete this book?</span>
                  <button
                    className="btn-danger"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Yes, delete'}
                  </button>
                  <button onClick={() => setConfirming(false)}>Cancel</button>
                </div>
              ) : (
                <button className="btn-danger" onClick={() => setConfirming(true)}>
                  Delete Book
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
