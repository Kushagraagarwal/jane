const express = require('express');
const router = express.Router();
const {
  getRealtimeMetrics,
  getHistoricalAnalytics,
  getQueueConfig,
  updateQueueConfig
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.get('/realtime', protect, authorize('admin'), getRealtimeMetrics);
router.get('/historical', protect, authorize('admin'), getHistoricalAnalytics);

router.route('/queue/config')
  .get(protect, authorize('admin'), getQueueConfig)
  .put(protect, authorize('admin'), updateQueueConfig);

module.exports = router;
