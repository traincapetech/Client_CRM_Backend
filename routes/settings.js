const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// @route   GET /api/settings
// @desc    Get user settings
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('settings');
    
    res.status(200).json({
      status: 'success',
      data: {
        settings: user.settings || {
          theme: 'light',
          language: 'en',
          notifications: {
            push: true,
            email: true,
            sms: false
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/settings
// @desc    Update user settings
// @access  Private
router.put('/', auth, async (req, res) => {
  try {
    const { theme, language, notifications } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user.settings) {
      user.settings = {};
    }
    
    if (theme !== undefined) {
      user.settings.theme = theme;
    }
    
    if (language !== undefined) {
      user.settings.language = language;
    }
    
    if (notifications !== undefined) {
      user.settings.notifications = {
        ...user.settings.notifications,
        ...notifications
      };
    }
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Settings updated successfully',
      data: {
        settings: user.settings
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/settings/theme
// @desc    Update theme preference
// @access  Private
router.put('/theme', auth, async (req, res) => {
  try {
    const { theme } = req.body;
    
    if (!['light', 'dark'].includes(theme)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid theme. Must be "light" or "dark"'
      });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user.settings) {
      user.settings = {};
    }
    
    user.settings.theme = theme;
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Theme updated successfully',
      data: {
        theme: user.settings.theme
      }
    });
  } catch (error) {
    console.error('Error updating theme:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating theme',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/settings/notifications
// @desc    Update notification preferences
// @access  Private
router.put('/notifications', auth, async (req, res) => {
  try {
    const { push, email, sms } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (!user.settings) {
      user.settings = {};
    }
    
    if (!user.settings.notifications) {
      user.settings.notifications = {};
    }
    
    if (push !== undefined) {
      user.settings.notifications.push = push;
    }
    
    if (email !== undefined) {
      user.settings.notifications.email = email;
    }
    
    if (sms !== undefined) {
      user.settings.notifications.sms = sms;
    }
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Notification preferences updated successfully',
      data: {
        notifications: user.settings.notifications
      }
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

