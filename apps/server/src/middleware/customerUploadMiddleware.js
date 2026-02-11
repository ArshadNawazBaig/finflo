const multer = require('multer');
const { customerStorage } = require('../config/cloudinary');

const upload = multer({
  storage: customerStorage,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB limit per file
    files: 5, // Max 5 files
  },
});

module.exports = upload;
