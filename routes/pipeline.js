const express = require('express');
const { body, validationResult } = require('express-validator');
const Pipeline = require('../models/Pipeline');
const Opportunity = require('../models/Opportunity');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/pipeline
// @desc    Get all pipelines
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    const filter = { isActive: isActive !== 'false' };

    const pipelines = await Pipeline.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Pipeline.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        pipelines,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get pipelines error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET /api/pipeline/:id
// @desc    Get single pipeline with opportunities
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const pipeline = await Pipeline.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!pipeline) {
      return res.status(404).json({
        status: 'error',
        message: 'Pipeline not found'
      });
    }

    // Get opportunities in this pipeline
    const opportunities = await Opportunity.find({ 
      pipeline: req.params.id,
      status: { $in: ['open'] }
    })
    .populate('customer', 'name email company')
    .populate('salesperson', 'name email')
    .sort({ createdAt: -1 });

    // Group opportunities by stage
    const stageData = {};
    pipeline.stages.forEach(stage => {
      stageData[stage.name] = {
        ...stage.toObject(),
        opportunities: opportunities.filter(opp => opp.stage === stage.name)
      };
    });

    res.json({
      status: 'success',
      data: {
        pipeline,
        stageData,
        totalOpportunities: opportunities.length
      }
    });
  } catch (error) {
    console.error('Get pipeline error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   POST /api/pipeline
// @desc    Create new pipeline
// @access  Private (Admin/Manager)
router.post('/', [
  auth,
  authorize('admin', 'manager'),
  body('name').trim().isLength({ min: 1 }).withMessage('Pipeline name is required'),
  body('stages').isArray({ min: 1 }).withMessage('At least one stage is required')
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

    const { name, description, stages, isDefault } = req.body;

    // Ensure stages have proper structure
    const processedStages = stages.map((stage, index) => ({
      ...stage,
      order: stage.order || index + 1
    }));

    const pipeline = new Pipeline({
      name,
      description,
      stages: processedStages,
      isDefault,
      createdBy: req.user._id
    });

    await pipeline.save();

    res.status(201).json({
      status: 'success',
      message: 'Pipeline created successfully',
      data: {
        pipeline
      }
    });
  } catch (error) {
    console.error('Create pipeline error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   PUT /api/pipeline/:id
// @desc    Update pipeline
// @access  Private (Admin/Manager)
router.put('/:id', [
  auth,
  authorize('admin', 'manager'),
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Pipeline name cannot be empty'),
  body('stages').optional().isArray({ min: 1 }).withMessage('At least one stage is required')
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

    const pipeline = await Pipeline.findById(req.params.id);
    if (!pipeline) {
      return res.status(404).json({
        status: 'error',
        message: 'Pipeline not found'
      });
    }

    const { name, description, stages, isActive } = req.body;

    // Update fields
    if (name) pipeline.name = name;
    if (description !== undefined) pipeline.description = description;
    if (isActive !== undefined) pipeline.isActive = isActive;

    // Update stages if provided
    if (stages) {
      const processedStages = stages.map((stage, index) => ({
        ...stage,
        order: stage.order || index + 1
      }));
      pipeline.stages = processedStages;
    }

    await pipeline.save();

    res.json({
      status: 'success',
      message: 'Pipeline updated successfully',
      data: {
        pipeline
      }
    });
  } catch (error) {
    console.error('Update pipeline error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/pipeline/:id
// @desc    Delete pipeline
// @access  Private (Admin/Manager)
router.delete('/:id', [auth, authorize('admin', 'manager')], async (req, res) => {
  try {
    const pipeline = await Pipeline.findById(req.params.id);
    if (!pipeline) {
      return res.status(404).json({
        status: 'error',
        message: 'Pipeline not found'
      });
    }

    // Check if pipeline has opportunities
    const opportunityCount = await Opportunity.countDocuments({ pipeline: req.params.id });
    if (opportunityCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete pipeline with existing opportunities'
      });
    }

    await Pipeline.findByIdAndDelete(req.params.id);

    res.json({
      status: 'success',
      message: 'Pipeline deleted successfully'
    });
  } catch (error) {
    console.error('Delete pipeline error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET /api/pipeline/:id/opportunities
// @desc    Get opportunities in a pipeline
// @access  Private
router.get('/:id/opportunities', auth, async (req, res) => {
  try {
    const { stage, status = 'open', page = 1, limit = 20 } = req.query;
    const filter = { pipeline: req.params.id, status };

    if (stage) {
      filter.stage = stage;
    }

    const opportunities = await Opportunity.find(filter)
      .populate('customer', 'name email company')
      .populate('salesperson', 'name email')
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
    console.error('Get pipeline opportunities error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET /api/pipeline/stats/overview
// @desc    Get pipeline statistics
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const { teamId, userId } = req.query;
    const filter = { status: 'open' };

    // Filter by team or user if specified
    if (teamId) filter.team = teamId;
    if (userId) filter.salesperson = userId;

    const stats = await Opportunity.aggregate([
      { $match: filter },
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

    const totalOpportunities = await Opportunity.countDocuments(filter);
    const totalValue = await Opportunity.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]);

    res.json({
      status: 'success',
      data: {
        stageStats: stats,
        totalOpportunities,
        totalValue: totalValue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get pipeline stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

module.exports = router;
