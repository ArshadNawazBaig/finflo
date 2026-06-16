// Thin delegate over the shared upload factory (customer storage, 1MB/file, max 5).
const { createUploadMiddleware } = require('./upload');

module.exports = createUploadMiddleware('customer', { maxSizeMB: 1, maxFiles: 5 });
