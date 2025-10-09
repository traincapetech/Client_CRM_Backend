const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Opportunity title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  pipeline: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pipeline',
    required: [true, 'Pipeline is required']
  },
  stage: {
    type: String,
    required: [true, 'Stage is required']
  },
  value: {
    type: Number,
    required: [true, 'Opportunity value is required'],
    min: [0, 'Value cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD'
  },
  probability: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  expectedCloseDate: Date,
  actualCloseDate: Date,
  salesperson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Salesperson is required']
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  source: {
    type: String,
    enum: ['website', 'referral', 'cold_call', 'email', 'social_media', 'other'],
    default: 'other'
  },
  leadReason: String,
  tags: [String],
  description: String,
  status: {
    type: String,
    enum: ['open', 'won', 'lost', 'cancelled'],
    default: 'open'
  },
  lostReason: String,
  products: [{
    name: String,
    quantity: Number,
    price: Number,
    total: Number
  }],
  activities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  }],
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better search performance
opportunitySchema.index({ customer: 1 });
opportunitySchema.index({ salesperson: 1 });
opportunitySchema.index({ team: 1 });
opportunitySchema.index({ pipeline: 1, stage: 1 });
opportunitySchema.index({ status: 1 });
opportunitySchema.index({ expectedCloseDate: 1 });

// Virtual for weighted value
opportunitySchema.virtual('weightedValue').get(function() {
  return (this.value * this.probability) / 100;
});

module.exports = mongoose.model('Opportunity', opportunitySchema);
