const multer = require('multer');
const { ticketStorage } = require('../config/cloudinary');

const ticketUpload = multer({
  storage: ticketStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5, // Max 5 files
  },
});

module.exports = { ticketUpload };
