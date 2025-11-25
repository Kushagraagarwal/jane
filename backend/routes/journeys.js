const express = require('express');
const router = express.Router();
const {
  getJourneys,
  getJourney,
  createJourney,
  updateJourney,
  publishJourney,
  archiveJourney,
  getJourneyVersions,
  rollbackJourney
} = require('../controllers/journeyController');
const { protect, authorize } = require('../middleware/auth');

router.route('/')
  .get(protect, getJourneys)
  .post(protect, authorize('admin'), createJourney);

router.route('/:id')
  .get(protect, getJourney)
  .put(protect, authorize('admin'), updateJourney);

router.post('/:id/publish', protect, authorize('admin'), publishJourney);
router.post('/:id/archive', protect, authorize('admin'), archiveJourney);
router.get('/:id/versions', protect, authorize('admin'), getJourneyVersions);
router.post('/:id/rollback/:version', protect, authorize('admin'), rollbackJourney);

module.exports = router;
