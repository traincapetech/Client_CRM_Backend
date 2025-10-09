const express = require('express');
const { body, validationResult } = require('express-validator');
const Opportunity = require('../models/Opportunity');
const Customer = require('../models/Customer');
const Pipeline = require('../models/Pipeline');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/opportunities
// @desc    Get all opportunities for the user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, stage, status = 'open', pipeline } = req.query;
    const filter = { 
      $or: [
        { salesperson: req.user._id },
        { createdBy: req.user._id }
      ],
      status
    };

    if (stage) filter.stage = stage;
    if (pipeline) filter.pipeline = pipeline;

    const opportunities = await Opportunity.find(filter)
      .populate('customer', 'name email company phone')
      .populate('salesperson', 'name email')
      .populate('pipeline', 'name')
      .populate('team', 'name')
      .sort({ expectedCloseDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Opportunity.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        opportunities,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get opportunities error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET /api/opportunities/:id
// @desc    Get single opportunity
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id)
      .populate('customer', 'name email company phone')
      .populate('salesperson', 'name email')
      .populate('pipeline', 'name stages')
      .populate('team', 'name')
      .populate('activities');

    if (!opportunity) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        opportunity
      }
    });
  } catch (error) {
    console.error('Get opportunity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   POST /api/opportunities
// @desc    Create new opportunity
// @access  Private
router.post('/', [
  auth,
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('value').isNumeric().withMessage('Value must be a number'),
  body('stage').trim().isLength({ min: 1 }).withMessage('Stage is required'),
  body('pipeline').isMongoId().withMessage('Valid pipeline ID is required'),
  body('customer').optional().isMongoId().withMessage('Valid customer ID is required'),
  body('salesperson').optional().isMongoId().withMessage('Valid salesperson ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      title,
      value,
      stage,
      pipeline,
      customer,
      salesperson,
      expectedCloseDate,
      description,
      source,
      tags,
      status
    } = req.body;

    // Verify pipeline exists and get stage probability
    const pipelineDoc = await Pipeline.findById(pipeline);
    if (!pipelineDoc) {
      return res.status(400).json({
        status: 'error',
        message: 'Pipeline not found'
      });
    }

    // Find stage probability
    const stageDoc = pipelineDoc.stages.find(s => s.name === stage);
    const probability = stageDoc ? stageDoc.probability : 0;

    // Verify customer exists if provided
    if (customer) {
      const customerDoc = await Customer.findById(customer);
      if (!customerDoc) {
        return res.status(400).json({
          status: 'error',
          message: 'Customer not found'
        });
      }
    }

    const opportunity = new Opportunity({
      title,
      value,
      stage,
      probability,
      pipeline,
      customer: customer || null,
      salesperson: salesperson || req.user._id,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
      description,
      source: source || 'other',
      status: status || 'open',
      tags: tags || [],
      createdBy: req.user._id
    });

    await opportunity.save();

    // Populate the created opportunity
    await opportunity.populate([
      { path: 'customer', select: 'name email company phone' },
      { path: 'salesperson', select: 'name email' },
      { path: 'pipeline', select: 'name' }
    ]);

    res.status(201).json({
      status: 'success',
      message: 'Opportunity created successfully',
      data: {
        opportunity
      }
    });
  } catch (error) {
    console.error('Create opportunity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   PUT /api/opportunities/:id
// @desc    Update opportunity
// @access  Private
router.put('/:id', [
  auth,
  body('title').optional().trim().isLength({ min: 1 }).withMessage('Title cannot be empty'),
  body('value').optional().isNumeric().withMessage('Value must be a number'),
  body('stage').optional().trim().isLength({ min: 1 }).withMessage('Stage cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found'
      });
    }

    // Check if user has permission to update this opportunity
    if (opportunity.salesperson.toString() !== req.user._id.toString() && 
        opportunity.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this opportunity'
      });
    }

    const {
      title,
      value,
      stage,
      expectedCloseDate,
      description,
      status,
      lostReason
    } = req.body;

    // Update fields
    if (title) opportunity.title = title;
    if (value !== undefined) opportunity.value = value;
    if (stage) {
      opportunity.stage = stage;
      // Update probability based on new stage
      const pipelineDoc = await Pipeline.findById(opportunity.pipeline);
      if (pipelineDoc) {
        const stageDoc = pipelineDoc.stages.find(s => s.name === stage);
        if (stageDoc) {
          opportunity.probability = stageDoc.probability;
        }
      }
    }
    if (expectedCloseDate) opportunity.expectedCloseDate = new Date(expectedCloseDate);
    if (description !== undefined) opportunity.description = description;
    if (status) {
      opportunity.status = status;
      if (status === 'won' || status === 'lost') {
        opportunity.actualCloseDate = new Date();
      }
    }
    if (lostReason) opportunity.lostReason = lostReason;

    await opportunity.save();

    res.json({
      status: 'success',
      message: 'Opportunity updated successfully',
      data: {
        opportunity
      }
    });
  } catch (error) {
    console.error('Update opportunity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/opportunities/:id
// @desc    Delete opportunity
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found'
      });
    }

    // Check if user has permission to delete this opportunity
    if (opportunity.salesperson.toString() !== req.user._id.toString() && 
        opportunity.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this opportunity'
      });
    }

    await Opportunity.findByIdAndDelete(req.params.id);

    res.json({
      status: 'success',
      message: 'Opportunity deleted successfully'
    });
  } catch (error) {
    console.error('Delete opportunity error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   PUT /api/opportunities/:id/stage
// @desc    Update opportunity stage with progression logic
// @access  Private
router.put('/:id/stage', [
  auth,
  body('stage').trim().notEmpty().withMessage('Stage is required'),
  body('reason').optional().trim().isString().withMessage('Reason must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({
        status: 'error',
        message: 'Opportunity not found'
      });
    }

    // Check permissions
    if (opportunity.salesperson.toString() !== req.user._id.toString() && 
        opportunity.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this opportunity'
      });
    }

    const { stage, reason } = req.body;
    const currentStage = opportunity.stage;
    
    // Validate stage progression
    const validStages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
    const currentIndex = validStages.indexOf(currentStage);
    const newIndex = validStages.indexOf(stage);

    if (newIndex === -1) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid stage'
      });
    }

    // Get pipeline to validate stage exists
    const pipeline = await Pipeline.findById(opportunity.pipeline);
    if (!pipeline) {
      return res.status(400).json({
        status: 'error',
        message: 'Pipeline not found'
      });
    }

    const stageExists = pipeline.stages.find(s => s.name === stage);
    if (!stageExists) {
      return res.status(400).json({
        status: 'error',
        message: 'Stage not found in pipeline'
      });
    }

    // Update opportunity
    opportunity.stage = stage;
    opportunity.probability = stageExists.probability;
    
    // Handle closed stages
    if (stage === 'Closed Won' || stage === 'Closed Lost') {
      opportunity.status = 'won';
      opportunity.actualCloseDate = new Date();
    } else {
      opportunity.status = 'open';
    }

    await opportunity.save();

    // Create activity log for stage change
    const Activity = require('../models/Activity');
    const stageChangeActivity = new Activity({
      type: 'note',
      subject: `Stage changed from ${currentStage} to ${stage}`,
      description: reason || `Opportunity progressed from ${currentStage} to ${stage} stage`,
      opportunity: opportunity._id,
      customer: opportunity.customer,
      assignedTo: req.user._id,
      status: 'completed',
      priority: 'medium',
      completedDate: new Date(),
      createdBy: req.user._id
    });

    await stageChangeActivity.save();

    res.json({
      status: 'success',
      message: 'Opportunity stage updated successfully',
      data: {
        opportunity,
        previousStage: currentStage,
        newStage: stage,
        stageChangeActivity
      }
    });
  } catch (error) {
    console.error('Update opportunity stage error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET /api/opportunities/stats/overview
// @desc    Get opportunity statistics
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { teamId, userId } = req.query;
    const filter = { 
      $or: [
        { salesperson: req.user._id },
        { createdBy: req.user._id }
      ]
    };

    if (teamId) filter.team = teamId;
    if (userId) filter.salesperson = userId;

    const stats = await Opportunity.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
          weightedValue: { $sum: { $multiply: ['$value', { $divide: ['$probability', 100] }] } }
        }
      }
    ]);

    const stageStats = await Opportunity.aggregate([
      { $match: { ...filter, status: 'open' } },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
          weightedValue: { $sum: { $multiply: ['$value', { $divide: ['$probability', 100] }] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      status: 'success',
      data: {
        statusStats: stats,
        stageStats,
        totalOpportunities: await Opportunity.countDocuments(filter)
      }
    });
  } catch (error) {
    console.error('Get opportunity stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

module.exports = router;
