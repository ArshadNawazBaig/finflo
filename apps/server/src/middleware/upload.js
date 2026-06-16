const multer = require('multer');
const {
  generalStorage,
  customerStorage,
  userStorage,
  ticketStorage,
  loanDocStorage,
  chatStorage,
} = require('../config/cloudinary');

/**
 * Named Cloudinary storages, keyed by purpose. Each storage bakes in its
 * destination folder and `allowed_formats` (see config/cloudinary.js), so the
 * factory only has to layer on per-route size/count limits.
 * @type {Record<string, import('multer').StorageEngine>}
 */
const STORAGES = {
  general: generalStorage,
  customer: customerStorage,
  user: userStorage,
  ticket: ticketStorage,
  loanDoc: loanDocStorage,
  chat: chatStorage,
};

/**
 * Build a multer upload middleware for a named storage with size/count limits.
 * Replaces the six near-identical `*UploadMiddleware.js` files with one
 * factory; those files now delegate here.
 *
 * @param {keyof typeof STORAGES} [storageKey='general'] - Which Cloudinary storage to use.
 * @param {object} [options]
 * @param {number} [options.maxSizeMB=5] - Max size per file, in megabytes.
 * @param {number} [options.maxFiles] - Optional cap on the number of files.
 * @returns {import('multer').Multer} A configured multer instance.
 * @throws {Error} If `storageKey` is not a known storage.
 *
 * @example
 * const upload = createUploadMiddleware('customer', { maxSizeMB: 1, maxFiles: 5 });
 * router.post('/', upload.array('files', 5), handler);
 */
const createUploadMiddleware = (storageKey = 'general', { maxSizeMB = 5, maxFiles } = {}) => {
  const storage = STORAGES[storageKey];
  if (!storage) {
    throw new Error(
      `Unknown upload storage "${storageKey}". Expected one of: ${Object.keys(STORAGES).join(', ')}`,
    );
  }

  const limits = { fileSize: maxSizeMB * 1024 * 1024 };
  if (maxFiles) limits.files = maxFiles;

  return multer({ storage, limits });
};

module.exports = { createUploadMiddleware, STORAGES };
