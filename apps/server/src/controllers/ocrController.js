const ocrService = require('../services/ocrService');
const { logActivity } = require('./activityLogController');

/**
 * Controller to handle OCR requests
 */
const ocrController = {
  /**
   * Process an uploaded ID card
   * @route POST /api/ocr/process-id
   * @access Private
   */
  processId: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      // Use the buffer from multer memoryStorage
      const data = await ocrService.extractIdData(
        req.file.buffer,
        req.file.mimetype,
      );

      // Log the activity
      await logActivity({
        userId: req.user._id,
        action: 'ocr_processed',
        category: 'member',
        details: `Processed OCR for ${data.name || 'unknown member'}`,
        metadata: {
          confidence: data.confidence,
          hasName: !!data.name,
          hasCnic: !!data.cnic,
        },
        req,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('OCR Controller Error:', error);
      res.status(500).json({ message: 'Failed to process ID card OCR' });
    }
  },
};

module.exports = ocrController;
