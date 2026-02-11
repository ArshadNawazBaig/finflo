const express = require('express');
const router = express.Router();
const {
  createTicket,
  getUserTickets,
  getAllTickets,
  getTicketById,
  addReply,
  updateTicketStatus,
  deleteTicket,
} = require('../controllers/supportTicketController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminProtect } = require('../middleware/superAdminMiddleware');
const { ticketUpload } = require('../middleware/ticketUploadMiddleware');

router.route('/').post(protect, createTicket).get(protect, getUserTickets);

router.route('/all').get(protect, superAdminProtect, getAllTickets);

router.route('/:id').get(protect, getTicketById).delete(protect, deleteTicket);

router
  .route('/:id/reply')
  .post(protect, ticketUpload.array('attachments', 5), addReply);

router
  .route('/:id/status')
  .patch(protect, superAdminProtect, updateTicketStatus);

module.exports = router;
