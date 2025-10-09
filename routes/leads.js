const express = require('express');
const { body, validationResult } = require('express-validator');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Opportunity = require('../models/Opportunity');
const Pipeline = require('../models/Pipeline');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      source, 
      assignedTo, 
      team,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = { isActive: true };

    if (status) filter.status = status;
    if (source) filter.source = source;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (team) filter.team = team;

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name email')
      .populate('team', 'name')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lead.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        leads,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

router.post('/', [
  auth,
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required')
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

    const leadData = {
      ...req.body,
      assignedTo: req.body.assignedTo || req.user._id
    };

    const lead = new Lead(leadData);
    await lead.save();

    await lead.populate('assignedTo', 'name email');
    await lead.populate('team', 'name');

    res.status(201).json({
      status: 'success',
      message: 'Lead created successfully',
      data: { lead }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   PUT /api/leads/:id
// @desc    Update lead
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found'
      });
    }

    res.json({
      status: 'success',
      data: { lead }
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/leads/:id
// @desc    Delete lead
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   PUT /api/leads/:id/assign
// @desc    Assign lead to salesperson
// @access  Private (Admin/Manager)
router.put('/:id/assign', [
  auth,
  authorize('admin', 'manager'),
  body('assignedTo').isMongoId().withMessage('Valid user ID is required')
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

    const { assignedTo, team } = req.body;

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { 
        assignedTo,
        team: team || null,
        status: 'contacted' // Auto-update status when assigned
      },
      { new: true }
    ).populate('assignedTo', 'name email')
     .populate('team', 'name');

    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Lead assigned successfully',
      data: { lead }
    });
  } catch (error) {
    console.error('Assign lead error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   POST /api/leads/:id/convert
// @desc    Convert lead to customer and create opportunity
// @access  Private
router.post('/:id/convert', [
  auth,
  body('createOpportunity').optional().isBoolean(),
  body('opportunityTitle').optional().trim(),
  body('opportunityValue').optional().isNumeric()
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

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found'
      });
    }

    // Create customer from lead
    const customer = new Customer({
      name: `${lead.firstName} ${lead.lastName}`,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: lead.source,
      createdBy: req.user._id
    });

    await customer.save();

    // Create opportunity if requested
    let opportunity = null;
    if (req.body.createOpportunity !== false) {
      // Get default pipeline
      const pipeline = await Pipeline.findOne();
      
      if (pipeline) {
        const initialStage = pipeline.stages[0]; // First stage (usually 'Lead')
        
        opportunity = new Opportunity({
          title: req.body.opportunityTitle || `${customer.name} - ${customer.company || 'Opportunity'}`,
          value: req.body.opportunityValue || lead.estimatedValue || 0,
          stage: initialStage.name,
          probability: initialStage.probability,
          pipeline: pipeline._id,
          customer: customer._id,
          salesperson: lead.assignedTo || req.user._id,
          source: lead.source,
          status: 'open',
          createdBy: req.user._id
        });

        await opportunity.save();
      }
    }

    // Mark lead as converted
    lead.status = 'converted';
    lead.convertedToCustomer = customer._id;
    lead.convertedAt = new Date();
    lead.isActive = false;
    await lead.save();

    res.json({
      status: 'success',
      message: 'Lead converted successfully',
      data: {
        customer,
        opportunity,
        lead
      }
    });
  } catch (error) {
    console.error('Convert lead error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
