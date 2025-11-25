const express = require('express');
const router = express.Router();
const {
  getTickets,
  getTicket,
  createTicket,
  updateTicket,
  takeTicket,
  reassignTicket,
  getTicketMessages,
  addTicketMessage,
  getQueue
} = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getTickets)
  .post(protect, createTicket);

router.get('/queue', protect, authorize('agent', 'admin'), getQueue);

router.route('/:id')
  .get(protect, getTicket)
  .put(protect, authorize('agent', 'admin'), updateTicket);

router.post('/:id/take', protect, authorize('agent'), takeTicket);
router.post('/:id/reassign', protect, authorize('admin'), reassignTicket);

router.route('/:id/messages')
  .get(protect, getTicketMessages)
  .post(protect, addTicketMessage);

module.exports = router;
