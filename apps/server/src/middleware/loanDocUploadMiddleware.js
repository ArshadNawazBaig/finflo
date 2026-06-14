// Thin delegate over the shared upload factory (loan-document storage, 5MB/file).
const { createUploadMiddleware } = require('./upload');

module.exports = createUploadMiddleware('loanDoc', { maxSizeMB: 5 });
