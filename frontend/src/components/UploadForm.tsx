import { useState, useRef } from 'react';
import { uploadBook } from '../lib/api';
import type { UploadProgress } from '../lib/api';
import type { Book } from '../types';
import './UploadForm.css';

interface Props {
  onUploadComplete: (book: Book) => void;
}

interface QueueItem {
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: UploadProgress | null;
  error: string | null;
}

export default function UploadForm({ onUploadComplete }: Props) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  const processQueue = async (items: QueueItem[]) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status !== 'pending') continue;

      setQueue((prev) => prev.map((q, idx) =>
        idx === i ? { ...q, status: 'processing' as const } : q
      ));

      try {
        const book = await uploadBook(item.file, (p) => {
          setQueue((prev) => prev.map((q, idx) =>
            idx === i ? { ...q, progress: p } : q
          ));
        });

        setQueue((prev) => prev.map((q, idx) =>
          idx === i ? { ...q, status: 'done' as const, progress: null } : q
        ));
        onUploadComplete(book);
      } catch (err) {
        setQueue((prev) => prev.map((q, idx) =>
          idx === i ? { ...q, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed', progress: null } : q
        ));
      }
    }

    processingRef.current = false;
    setProcessing(false);
    // Clear completed items after a short delay
    setTimeout(() => {
      setQueue((prev) => prev.filter((q) => q.status !== 'done'));
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;

    const newItems: QueueItem[] = Array.from(files).map((file) => ({
      file,
      status: 'pending' as const,
      progress: null,
      error: null,
    }));

    const combined = [...queue.filter((q) => q.status === 'error' || q.status === 'pending'), ...newItems];
    setQueue(combined);
    if (fileInputRef.current) fileInputRef.current.value = '';
    processQueue(combined);
  };

  const activeItem = queue.find((q) => q.status === 'processing');

  return (
    <div className="upload-container">
      <form className="upload-form" onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          disabled={processing}
        />
        <button type="submit" disabled={processing}>
          {processing ? 'Processing...' : 'Upload'}
        </button>
      </form>
      {activeItem?.progress && (
        <div className="upload-progress">
          <div className="upload-progress-bar">
            <div
              className="upload-progress-fill"
              style={{ width: `${activeItem.progress.progress}%` }}
            />
          </div>
          <span className="upload-progress-label">
            {queue.filter((q) => q.status !== 'done').length > 1 && (
              <span className="upload-queue-count">
                ({queue.filter((q) => q.status === 'done').length + 1}/{queue.length}){' '}
              </span>
            )}
            {activeItem.file.name}: {activeItem.progress.step}
          </span>
        </div>
      )}
      {queue.some((q) => q.status === 'error') && (
        <div className="upload-errors">
          {queue.filter((q) => q.status === 'error').map((q, i) => (
            <span key={i} className="upload-error">{q.file.name}: {q.error}</span>
          ))}
        </div>
      )}
    </div>
  );
}
