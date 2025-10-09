const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [100, 'Team name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Team manager is required']
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['member', 'senior', 'lead'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  targetRevenue: {
    type: Number,
    default: 0
  },
  currentRevenue: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowMemberAdd: {
      type: Boolean,
      default: true
    },
    allowMemberRemove: {
      type: Boolean,
      default: false
    },
    notificationSettings: {
      newLead: Boolean,
      newOpportunity: Boolean,
      dealClosed: Boolean,
      activityReminder: Boolean
    }
  }
}, {
  timestamps: true
});

// Virtual for member count
teamSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Virtual for target completion percentage
teamSchema.virtual('targetCompletion').get(function() {
  if (this.targetRevenue === 0) return 0;
  return Math.round((this.currentRevenue / this.targetRevenue) * 100);
});

module.exports = mongoose.model('Team', teamSchema);
