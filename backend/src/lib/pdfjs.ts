import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';

// Resolve the worker file path for Node.js fake-worker loader.
// pdfjs-dist v4.x requires a truthy workerSrc; the default relative path
// doesn't resolve correctly in Node, so we provide an absolute file:// URL.
const require = createRequire(import.meta.url);
GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs'),
).href;

export { getDocument };
