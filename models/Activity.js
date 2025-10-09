const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Activity type is required'],
    enum: ['call', 'email', 'meeting', 'task', 'note', 'demo', 'proposal', 'follow_up']
  },
  subject: {
    type: String,
    required: [true, 'Activity subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  description: String,
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  opportunity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assigned user is required']
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: Date,
  completedDate: Date,
  duration: Number, // in minutes
  location: String,
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  outcome: String,
  nextAction: String,
  nextActionDate: Date,
  tags: [String],
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: Number,
    endDate: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better search performance
activitySchema.index({ assignedTo: 1 });
activitySchema.index({ customer: 1 });
activitySchema.index({ opportunity: 1 });
activitySchema.index({ team: 1 });
activitySchema.index({ status: 1 });
activitySchema.index({ dueDate: 1 });
activitySchema.index({ type: 1 });

// Virtual for overdue status
activitySchema.virtual('isOverdue').get(function() {
  return this.status === 'pending' && this.dueDate && new Date() > this.dueDate;
});

module.exports = mongoose.model('Activity', activitySchema);
