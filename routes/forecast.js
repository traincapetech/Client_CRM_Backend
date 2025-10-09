const express = require('express');
const Opportunity = require('../models/Opportunity');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { teamId, userId, period = 'month' } = req.query;
    const filter = { status: 'open' };

    if (teamId) filter.team = teamId;
    if (userId) filter.salesperson = userId;

    const opportunities = await Opportunity.find(filter)
      .populate('customer', 'name company')
      .populate('salesperson', 'name email')
      .sort({ expectedCloseDate: 1 });

    const upcomingClosing = opportunities.filter(opp => {
      const closeDate = new Date(opp.expectedCloseDate);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return closeDate >= now && closeDate <= thirtyDaysFromNow;
    });

    const expectedClosing = opportunities.filter(opp => {
      const closeDate = new Date(opp.expectedCloseDate);
      const now = new Date();
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      return closeDate >= now && closeDate <= sixtyDaysFromNow;
    });

    res.json({
      status: 'success',
      data: {
        upcomingClosing,
        expectedClosing,
        totalValue: opportunities.reduce((sum, opp) => sum + opp.value, 0),
        weightedValue: opportunities.reduce((sum, opp) => sum + (opp.value * opp.probability / 100), 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

module.exports = router;
