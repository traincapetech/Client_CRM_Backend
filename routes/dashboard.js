const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Opportunity = require('../models/Opportunity');
const Activity = require('../models/Activity');
const Lead = require('../models/Lead');

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // Get total opportunities count and value
    const opportunities = await Opportunity.find({
      $or: [
        { assignedTo: userId },
        { createdBy: userId }
      ],
      status: { $in: ['prospecting', 'qualification', 'proposal', 'negotiation'] }
    });

    const totalOpportunities = opportunities.length;
    const totalValue = opportunities.reduce((sum, opp) => sum + (opp.value || 0), 0);
    const weightedValue = opportunities.reduce((sum, opp) => {
      const probability = opp.probability || 0;
      return sum + ((opp.value || 0) * (probability / 100));
    }, 0);

    // Count opportunities closing in next 30 days
    const upcomingClosing = await Opportunity.countDocuments({
      $or: [
        { assignedTo: userId },
        { createdBy: userId }
      ],
      expectedCloseDate: {
        $gte: now,
        $lte: thirtyDaysFromNow
      },
      status: { $in: ['prospecting', 'qualification', 'proposal', 'negotiation'] }
    });

    // Count opportunities expected to close in next 60 days
    const expectedClosing = await Opportunity.countDocuments({
      $or: [
        { assignedTo: userId },
        { createdBy: userId }
      ],
      expectedCloseDate: {
        $gte: now,
        $lte: sixtyDaysFromNow
      },
      status: { $in: ['prospecting', 'qualification', 'proposal', 'negotiation'] }
    });

    // Count pending activities
    const pendingActivities = await Activity.countDocuments({
      assignedTo: userId,
      status: { $in: ['pending', 'in_progress'] }
    });

    // Get recent activities
    const recentActivities = await Activity.find({
      $or: [
        { assignedTo: userId },
        { createdBy: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customer', 'name')
      .populate('assignedTo', 'name email');

    // Get pipeline breakdown by stage
    const pipelineBreakdown = await Opportunity.aggregate([
      {
        $match: {
          $or: [
            { assignedTo: userId },
            { createdBy: userId }
          ],
          status: 'open'
        }
      },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' }
        }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        totalOpportunities,
        totalValue: Math.round(totalValue),
        weightedValue: Math.round(weightedValue),
        upcomingClosing,
        expectedClosing,
        pendingActivities,
        recentActivities,
        pipelineBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/dashboard/recent-activities
// @desc    Get recent activities for dashboard
// @access  Private
router.get('/recent-activities', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;

    const activities = await Activity.find({
      $or: [
        { assignedTo: userId },
        { createdBy: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('customer', 'name email')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    res.status(200).json({
      status: 'success',
      data: {
        activities
      }
    });
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching recent activities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

