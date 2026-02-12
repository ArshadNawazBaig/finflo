const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  uploadDocuments,
  deleteDocument,
  updateDocumentStatus,
} = require('../controllers/customerController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/customerUploadMiddleware');

router.route('/').get(protect, getCustomers).post(protect, createCustomer);

router
  .route('/:id')
  .get(protect, getCustomerById)
  .put(protect, updateCustomer)
  .delete(protect, deleteCustomer);

router
  .route('/:id/documents')
  .post(protect, upload.array('documents', 5), uploadDocuments);

router
  .route('/:id/documents/:docId')
  .delete(protect, deleteDocument)
  .patch(protect, updateDocumentStatus);

module.exports = router;
