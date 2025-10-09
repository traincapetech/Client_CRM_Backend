const express = require('express');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .populate('team', 'name')
      .select('-password')
      .sort({ name: 1 });

    res.json({
      status: 'success',
      data: { users }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

module.exports = router;
