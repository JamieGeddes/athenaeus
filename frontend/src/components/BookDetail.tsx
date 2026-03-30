import { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import type { Book, TocEntry } from '../types';
import { deleteBook, updateBook } from '../lib/api';
import './BookDetail.css';

interface Props {
  book: Book;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdate: (book: Book) => void;
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

function EditableField({ value, onSave, className }: { value: string; onSave: (val: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <span className={`editable-field ${className || ''}`} onClick={() => setEditing(true)} title="Click to edit">
        {value}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      className={`editable-input ${className || ''}`}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') { setDraft(value); setEditing(false); }
      }}
    />
  );
}

export default function BookDetail({ book, onClose, onDelete, onUpdate }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (updates: { title?: string; author?: string; tags?: string[] }) => {
    try {
      const updated = await updateBook(book.id, updates);
      onUpdate(updated);
    } catch (err) {
      console.error('Failed to update book:', err);
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !book.tags.includes(tag)) {
      handleSave({ tags: [...book.tags, tag] });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    handleSave({ tags: book.tags.filter((t) => t !== tag) });
  };

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
            <h2>
              <EditableField
                value={book.title}
                onSave={(title) => handleSave({ title })}
                className="editable-title"
              />
            </h2>
            <p className="detail-author">
              <EditableField
                value={book.author}
                onSave={(author) => handleSave({ author })}
                className="editable-author"
              />
            </p>
            <p className="detail-date">
              Uploaded {new Date(book.uploadDate).toLocaleDateString()}
            </p>

            <div className="detail-tags">
              {book.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                  <button className="tag-remove" onClick={() => handleRemoveTag(tag)}>&times;</button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                className="tag-input"
                type="text"
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
                  if (e.key === 'Escape') setTagInput('');
                }}
                onBlur={() => { if (tagInput.trim()) handleAddTag(); }}
              />
            </div>

            {book.summary && (
              <div className="detail-section">
                <h3>Summary</h3>
                <div className="detail-summary">
                  <Markdown>{book.summary}</Markdown>
                </div>
              </div>
            )}

            {book.toc.length > 0 && (
              <div className="detail-section">
                <h3>Table of Contents</h3>
                <TocList entries={book.toc} />
              </div>
            )}

            <div className="detail-actions">
              <a
                className="btn-primary"
                href={`/pdfs/${book.pdfPath}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read Book
              </a>
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
