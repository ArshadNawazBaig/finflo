const multer = require('multer');
const { userStorage } = require('../config/cloudinary');

const upload = multer({
  storage: userStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit per file
  },
});

module.exports = upload;
