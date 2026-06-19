// Thin delegate over the shared upload factory (user storage, 2MB/file).
const { createUploadMiddleware } = require('./upload');

module.exports = createUploadMiddleware('user', { maxSizeMB: 2 });
