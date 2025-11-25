const express = require('express');
const router = express.Router();
const {
  getAgents,
  getAgent,
  createAgent,
  updateAgent,
  updateAgentStatus,
  getAgentPerformance,
  getAgentsPerformance
} = require('../controllers/agentController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, authorize('admin'), getAgents)
  .post(protect, authorize('admin'), createAgent);

router.get('/performance', protect, authorize('admin'), getAgentsPerformance);

router.route('/:id')
  .get(protect, getAgent)
  .put(protect, authorize('admin'), updateAgent);

router.put('/:id/status', protect, updateAgentStatus);
router.get('/:id/performance', protect, getAgentPerformance);

module.exports = router;
