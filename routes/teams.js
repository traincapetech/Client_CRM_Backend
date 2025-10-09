const express = require('express');
const { body, validationResult } = require('express-validator');
const Team = require('../models/Team');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/teams
// @desc    Get all teams
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;
    const filter = { isActive: isActive !== 'false' };

    const teams = await Team.find(filter)
      .populate('manager', 'name email')
      .populate('members.user', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Team.countDocuments(filter);

    res.json({
      status: 'success',
      data: {
        teams,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET /api/teams/:id
// @desc    Get single team with detailed info
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('manager', 'name email avatar')
      .populate('members.user', 'name email avatar role');

    if (!team) {
      return res.status(404).json({
        status: 'error',
        message: 'Team not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        team
      }
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   POST /api/teams
// @desc    Create new team
// @access  Private (Admin/Manager)
router.post('/', [
  auth,
  authorize('admin', 'manager'),
  body('name').trim().isLength({ min: 1 }).withMessage('Team name is required'),
  body('manager').isMongoId().withMessage('Valid team manager is required')
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

    const team = new Team(req.body);
    await team.save();

    await team.populate('manager', 'name email');
    await team.populate('members.user', 'name email');

    res.status(201).json({
      status: 'success',
      message: 'Team created successfully',
      data: {
        team
      }
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   PUT /api/teams/:id
// @desc    Update team
// @access  Private (Admin/Manager)
router.put('/:id', [
  auth,
  authorize('admin', 'manager'),
  body('name').optional().trim().isLength({ min: 1 }).withMessage('Team name cannot be empty')
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

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('manager', 'name email')
    .populate('members.user', 'name email');

    if (!team) {
      return res.status(404).json({
        status: 'error',
        message: 'Team not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Team updated successfully',
      data: {
        team
      }
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   POST /api/teams/:id/members
// @desc    Add member to team
// @access  Private (Admin/Manager)
router.post('/:id/members', [
  auth,
  authorize('admin', 'manager'),
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('role').optional().isIn(['member', 'senior', 'lead']).withMessage('Invalid role')
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

    const { userId, role = 'member' } = req.body;

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({
        status: 'error',
        message: 'Team not found'
      });
    }

    // Check if user is already a member
    const existingMember = team.members.find(member => member.user.toString() === userId);
    if (existingMember) {
      return res.status(400).json({
        status: 'error',
        message: 'User is already a member of this team'
      });
    }

    team.members.push({ user: userId, role });
    await team.save();

    await team.populate('members.user', 'name email avatar');

    res.json({
      status: 'success',
      message: 'Member added to team successfully',
      data: {
        team
      }
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/teams/:id/members/:memberId
// @desc    Remove member from team
// @access  Private (Admin/Manager)
router.delete('/:id/members/:memberId', [auth, authorize('admin', 'manager')], async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({
        status: 'error',
        message: 'Team not found'
      });
    }

    team.members = team.members.filter(member => member._id.toString() !== req.params.memberId);
    await team.save();

    await team.populate('members.user', 'name email avatar');

    res.json({
      status: 'success',
      message: 'Member removed from team successfully',
      data: {
        team
      }
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/teams/:id
// @desc    Delete team
// @access  Private (Admin)
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!team) {
      return res.status(404).json({
        status: 'error',
        message: 'Team not found'
      });
    }

    res.json({
      status: 'success',
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

module.exports = router;
