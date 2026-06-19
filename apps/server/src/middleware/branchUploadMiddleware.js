// Thin delegate over the shared upload factory (general storage, 5MB/file).
const { createUploadMiddleware } = require('./upload');

module.exports = createUploadMiddleware('general', { maxSizeMB: 5 });
