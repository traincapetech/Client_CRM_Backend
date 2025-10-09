const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true,
    unique: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  industry: {
    type: String,
    enum: ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education', 'Real Estate', 'Other'],
    default: 'Other'
  },
  size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
    default: '1-10'
  },
  website: String,
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  logo: String,
  settings: {
    currency: {
      type: String,
      default: 'USD'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY'
    },
    fiscalYearStart: {
      type: Number,
      default: 1, // January
      min: 1,
      max: 12
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'trial', 'cancelled'],
      default: 'trial'
    },
    trialEndsAt: Date,
    subscriptionEndsAt: Date,
    maxUsers: {
      type: Number,
      default: 5
    },
    maxLeads: {
      type: Number,
      default: 100
    },
    maxCustomers: {
      type: Number,
      default: 50
    }
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
organizationSchema.index({ slug: 1 });
organizationSchema.index({ owner: 1 });
organizationSchema.index({ 'subscription.status': 1 });

// Virtual for total users
organizationSchema.virtual('totalUsers', {
  ref: 'User',
  localField: '_id',
  foreignField: 'organization',
  count: true
});

// Generate slug from name
organizationSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  next();
});

module.exports = mongoose.model('Organization', organizationSchema);

