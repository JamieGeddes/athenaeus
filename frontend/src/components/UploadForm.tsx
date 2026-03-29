import { useState, useRef } from 'react';
import { uploadBook } from '../lib/api';
import type { Book } from '../types';
import './UploadForm.css';

interface Props {
  onUploadComplete: (book: Book) => void;
}

export default function UploadForm({ onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const book = await uploadBook(file);
      onUploadComplete(book);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        disabled={uploading}
      />
      <button type="submit" disabled={uploading}>
        {uploading ? 'Processing...' : 'Upload PDF'}
      </button>
      {error && <span className="upload-error">{error}</span>}
    </form>
  );
}
