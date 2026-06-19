// Thin delegate over the shared upload factory (ticket storage, 5MB/file, max 5).
// Exported as `{ ticketUpload }` to preserve the existing import shape.
const { createUploadMiddleware } = require('./upload');

const ticketUpload = createUploadMiddleware('ticket', { maxSizeMB: 5, maxFiles: 5 });

module.exports = { ticketUpload };
