const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  probability: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  color: {
    type: String,
    default: '#2196F3'
  },
  order: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const pipelineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Pipeline name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  stages: [stageSchema],
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better search performance
pipelineSchema.index({ team: 1 });
pipelineSchema.index({ createdBy: 1 });
pipelineSchema.index({ isDefault: 1 });

// Virtual for total opportunities in pipeline
pipelineSchema.virtual('opportunityCount', {
  ref: 'Opportunity',
  localField: '_id',
  foreignField: 'pipeline',
  count: true
});

module.exports = mongoose.model('Pipeline', pipelineSchema);