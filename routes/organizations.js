const express = require('express');
const { body, validationResult } = require('express-validator');
const Organization = require('../models/Organization');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/organizations
// @desc    Create new organization (during registration)
// @access  Public
router.post('/', [
  body('name').trim().notEmpty().withMessage('Organization name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('industry').optional().isIn(['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education', 'Real Estate', 'Other'])
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

    const { name, email, industry, size, phone, website } = req.body;

    // Check if organization already exists
    const existingOrg = await Organization.findOne({ 
      $or: [{ name }, { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }]
    });

    if (existingOrg) {
      return res.status(400).json({
        status: 'error',
        message: 'Organization with this name already exists'
      });
    }

    // Create organization (owner will be set after user creation)
    const organization = new Organization({
      name,
      email,
      industry,
      size,
      phone,
      website,
      owner: req.body.owner || '507f1f77bcf86cd799439011' // Temporary, will be updated
    });

    await organization.save();

    res.status(201).json({
      status: 'success',
      data: { organization }
    });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET /api/organizations/my-organization
// @desc    Get current user's organization
// @access  Private
router.get('/my-organization', auth, async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.organization)
      .populate('owner', 'name email');

    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization not found'
      });
    }

    // Get total users count
    const totalUsers = await User.countDocuments({ organization: organization._id });

    res.json({
      status: 'success',
      data: {
        organization: {
          ...organization.toObject(),
          totalUsers
        }
      }
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   PUT /api/organizations/my-organization
// @desc    Update current user's organization
// @access  Private (Admin only)
router.put('/my-organization', [
  auth,
  authorize('admin'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
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

    const organization = await Organization.findByIdAndUpdate(
      req.user.organization,
      req.body,
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({
        status: 'error',
        message: 'Organization not found'
      });
    }

    res.json({
      status: 'success',
      data: { organization }
    });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   GET /api/organizations/users
// @desc    Get all users in current organization
// @access  Private (Admin/Manager)
router.get('/users', [auth, authorize('admin', 'manager')], async (req, res) => {
  try {
    const users = await User.find({ organization: req.user.organization })
      .select('-password')
      .populate('team', 'name')
      .sort({ createdAt: -1 });

    res.json({
      status: 'success',
      data: { users }
    });
  } catch (error) {
    console.error('Get organization users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   POST /api/organizations/invite-user
// @desc    Invite user to organization
// @access  Private (Admin/Manager)
router.post('/invite-user', [
  auth,
  authorize('admin', 'manager'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['admin', 'manager', 'salesperson', 'user']).withMessage('Valid role is required')
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

    const { email, role, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Check organization user limits
    const organization = await Organization.findById(req.user.organization);
    const userCount = await User.countDocuments({ organization: req.user.organization });

    if (userCount >= organization.subscription.maxUsers) {
      return res.status(400).json({
        status: 'error',
        message: `User limit reached. Your plan allows ${organization.subscription.maxUsers} users.`
      });
    }

    // In a real app, you would send an invitation email
    // For now, we'll just return success
    res.json({
      status: 'success',
      message: `Invitation sent to ${email}`,
      data: {
        email,
        role,
        organizationId: req.user.organization
      }
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

module.exports = router;

