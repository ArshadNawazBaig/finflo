const multer = require('multer');
const { loanDocStorage } = require('../config/cloudinary');

const loanDocUpload = multer({
  storage: loanDocStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
  },
});

module.exports = loanDocUpload;
