import { useState, useRef, useEffect, useCallback } from 'react';
import { uploadBook } from '../lib/api';
import type { UploadProgress } from '../lib/api';
import type { Book } from '../types';
import './UploadModal.css';

interface Props {
  onUploadComplete: (book: Book) => void;
  onClose: () => void;
}

interface QueueItem {
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: UploadProgress | null;
  error: string | null;
}

type ModalPhase = 'select' | 'uploading' | 'complete' | 'error';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadModal({ onUploadComplete, onClose }: Props) {
  const [phase, setPhase] = useState<ModalPhase>('select');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  // Escape key handler — only when not uploading
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'uploading') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [phase, onClose]);

  // Auto-close on complete
  useEffect(() => {
    if (phase === 'complete') {
      const timer = setTimeout(onClose, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, onClose]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (pdfFiles.length === 0) return;

    const newItems: QueueItem[] = pdfFiles.map((file) => ({
      file,
      status: 'pending' as const,
      progress: null,
      error: null,
    }));

    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  const removeFile = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const processQueue = async (items: QueueItem[]) => {
    if (processingRef.current) return;
    processingRef.current = true;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status !== 'pending') continue;

      setQueue((prev) =>
        prev.map((q, idx) =>
          idx === i ? { ...q, status: 'processing' as const } : q
        )
      );

      try {
        const book = await uploadBook(item.file, (p) => {
          setQueue((prev) =>
            prev.map((q, idx) =>
              idx === i ? { ...q, progress: p } : q
            )
          );
        });

        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i ? { ...q, status: 'done' as const, progress: null } : q
          )
        );
        onUploadComplete(book);
      } catch (err) {
        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? {
                  ...q,
                  status: 'error' as const,
                  error: err instanceof Error ? err.message : 'Upload failed',
                  progress: null,
                }
              : q
          )
        );
      }
    }

    processingRef.current = false;

    // Determine final phase based on results
    setQueue((prev) => {
      const hasErrors = prev.some((q) => q.status === 'error');
      setPhase(hasErrors ? 'error' : 'complete');
      return prev;
    });
  };

  const startUpload = () => {
    const pendingItems = queue.filter((q) => q.status === 'pending');
    if (pendingItems.length === 0) return;
    setPhase('uploading');
    processQueue(queue);
  };

  const handleRetry = () => {
    setQueue((prev) =>
      prev
        .filter((q) => q.status === 'error')
        .map((q) => ({ ...q, status: 'pending' as const, error: null }))
    );
    setPhase('uploading');
    const retryItems = queue
      .filter((q) => q.status === 'error')
      .map((q) => ({ ...q, status: 'pending' as const, error: null }));
    processQueue(retryItems);
  };

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleOverlayClick = () => {
    if (phase !== 'uploading') onClose();
  };

  const activeItem = queue.find((q) => q.status === 'processing');
  const doneCount = queue.filter((q) => q.status === 'done').length;
  const totalCount = queue.length;

  return (
    <div className="upload-overlay" onClick={handleOverlayClick}>
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
        {phase === 'select' && (
          <>
            <button className="upload-close" onClick={onClose}>&times;</button>
            <h2>Upload PDFs</h2>
            <div
              className={`upload-dropzone${dragging ? ' upload-dropzone--active' : ''}`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-dropzone-icon">PDF</div>
              <div className="upload-dropzone-text">
                Drop PDF files here or{' '}
                <span className="upload-dropzone-browse">browse</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                hidden
                onChange={handleFileInput}
              />
            </div>

            {queue.length > 0 && (
              <div className="upload-file-list">
                {queue.map((item, i) => (
                  <div key={i} className="upload-file-item">
                    <div className="upload-file-info">
                      <span className="upload-file-name">{item.file.name}</span>
                      <span className="upload-file-size">{formatSize(item.file.size)}</span>
                    </div>
                    <button className="upload-file-remove" onClick={() => removeFile(i)}>&times;</button>
                  </div>
                ))}
              </div>
            )}

            <button
              className="upload-start-btn"
              disabled={queue.length === 0}
              onClick={startUpload}
            >
              Upload {queue.length > 0 ? `(${queue.length} file${queue.length > 1 ? 's' : ''})` : ''}
            </button>
          </>
        )}

        {phase === 'uploading' && (
          <>
            <h2>Processing files...</h2>
            <div className="upload-progress">
              <div className="upload-progress-bar">
                <div
                  className="upload-progress-fill"
                  style={{ width: `${activeItem?.progress?.progress ?? 0}%` }}
                />
              </div>
              <span className="upload-progress-label">
                {totalCount > 1 && (
                  <span className="upload-queue-count">
                    ({doneCount + 1}/{totalCount}){' '}
                  </span>
                )}
                {activeItem ? `${activeItem.file.name}: ${activeItem.progress?.step ?? 'Starting...'}` : 'Finishing up...'}
              </span>
            </div>
          </>
        )}

        {phase === 'complete' && (
          <div className="upload-complete">
            <div className="upload-complete-icon">&#10003;</div>
            <h2>Upload complete</h2>
            <p>{doneCount} file{doneCount !== 1 ? 's' : ''} added to your library</p>
            <button className="upload-done-btn" onClick={onClose}>Done</button>
          </div>
        )}

        {phase === 'error' && (
          <>
            <button className="upload-close" onClick={onClose}>&times;</button>
            <h2>Some uploads failed</h2>
            {doneCount > 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 1rem' }}>
                {doneCount} file{doneCount !== 1 ? 's' : ''} uploaded successfully
              </p>
            )}
            <div className="upload-error-list">
              {queue.filter((q) => q.status === 'error').map((item, i) => (
                <div key={i} className="upload-error-item">
                  <div className="upload-file-name">{item.file.name}</div>
                  <div className="upload-error-msg">{item.error}</div>
                </div>
              ))}
            </div>
            <div className="upload-error-actions">
              <button className="upload-retry-btn" onClick={handleRetry}>Retry Failed</button>
              <button className="upload-close-btn" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
