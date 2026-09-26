const express = require('express');
const router = express.Router();
const multer = require('multer');
const ocrController = require('../controllers/ocrController');
const { protect } = require('../middleware/authMiddleware');
const { directMemoryUpload } = require('../middleware/directMemoryUpload');

// Setup multer for memory storage (OCR doesn't need to persist the file)
const storage = multer.memoryStorage();
const upload = directMemoryUpload(multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed!'), false);
    }
  },
}), 'ocr');

// @route   POST /api/ocr/process-id
// @desc    Upload an ID image and get extracted data
// @access  Private
router.post(
  '/process-id',
  protect,
  upload.single('idImage'),
  ocrController.processId,
);

module.exports = router;
