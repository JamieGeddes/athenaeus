import { useState, useRef } from 'react';
import { uploadBook } from '../lib/api';
import type { UploadProgress } from '../lib/api';
import type { Book } from '../types';
import './UploadForm.css';

interface Props {
  onUploadComplete: (book: Book) => void;
}

export default function UploadForm({ onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(null);

    try {
      const book = await uploadBook(file, (p) => setProgress(p));
      onUploadComplete(book);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(null);
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
      {progress && (
        <div className="upload-progress">
          <div className="upload-progress-bar">
            <div
              className="upload-progress-fill"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
          <span className="upload-progress-label">{progress.step}</span>
        </div>
      )}
    </form>
  );
}
