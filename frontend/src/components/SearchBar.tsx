import { useState, useEffect, useRef } from 'react';
import { searchBooks } from '../lib/api';
import type { SearchResult } from '../types';
import './SearchBar.css';

interface Props {
  onSelectBook: (bookId: string) => void;
}

export default function SearchBar({ onSelectBook }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchBooks(query.trim());
        setError(null);
        setResults(res);
        setOpen(res.length > 0);
      } catch (err) {
        console.error('Search failed:', err);
        setResults([]);
        setError('Search is temporarily unavailable');
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="search-bar" ref={containerRef}>
      <input
        type="text"
        placeholder="Search your library..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {loading && <span className="search-spinner" />}
      {open && (
        <div className="search-results">
          {error ? (
            <div className="search-error">{error}</div>
          ) : (
            results.map((r, i) => (
              <button
                key={i}
                className="search-result"
                onClick={() => {
                  onSelectBook(r.bookId);
                  setOpen(false);
                  setQuery('');
                }}
              >
                <span className="search-result-book">{r.bookTitle}</span>
                <span className="search-result-text">{r.chunkText.slice(0, 150)}...</span>
                <span className="search-result-score">{Math.round(r.score * 100)}%</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
