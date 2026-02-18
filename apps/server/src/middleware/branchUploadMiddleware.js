const multer = require('multer');
const { generalStorage } = require('../config/cloudinary');

const upload = multer({
  storage: generalStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

module.exports = upload;
