const express = require('express');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Configuration endpoints for CRM settings
router.get('/activity-types', auth, (req, res) => {
  res.json({
    status: 'success',
    data: {
      activityTypes: [
        { value: 'call', label: 'Phone Call' },
        { value: 'email', label: 'Email' },
        { value: 'meeting', label: 'Meeting' },
        { value: 'task', label: 'Task' },
        { value: 'note', label: 'Note' },
        { value: 'demo', label: 'Demo' },
        { value: 'proposal', label: 'Proposal' },
        { value: 'follow_up', label: 'Follow Up' }
      ]
    }
  });
});

router.get('/lead-sources', auth, (req, res) => {
  res.json({
    status: 'success',
    data: {
      leadSources: [
        { value: 'website', label: 'Website' },
        { value: 'referral', label: 'Referral' },
        { value: 'cold_call', label: 'Cold Call' },
        { value: 'email', label: 'Email' },
        { value: 'social_media', label: 'Social Media' },
        { value: 'advertisement', label: 'Advertisement' },
        { value: 'event', label: 'Event' },
        { value: 'other', label: 'Other' }
      ]
    }
  });
});

router.get('/opportunity-statuses', auth, (req, res) => {
  res.json({
    status: 'success',
    data: {
      statuses: [
        { value: 'open', label: 'Open' },
        { value: 'won', label: 'Won' },
        { value: 'lost', label: 'Lost' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    }
  });
});

module.exports = router;
