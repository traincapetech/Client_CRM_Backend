const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/calyxcrm')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

// Lead Schema
const leadSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  company: { type: String },
  source: { type: String, default: 'website' },
  status: { type: String, default: 'new' },
  estimatedValue: { type: Number },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags: [{ type: String }],
  nextFollowUpDate: { type: Date },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Customer Schema
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  company: { type: String },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  status: { type: String, default: 'active' },
  salesperson: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Opportunity Schema
const opportunitySchema = new mongoose.Schema({
  title: { type: String, required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  pipeline: { type: mongoose.Schema.Types.ObjectId, ref: 'Pipeline' },
  stage: { type: String, required: true },
  value: { type: Number, required: true },
  expectedCloseDate: { type: Date },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  probability: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Activity Schema
const activitySchema = new mongoose.Schema({
  type: { type: String, required: true },
  subject: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: 'pending' },
  priority: { type: String, default: 'medium' },
  opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  contactName: { type: String },
  email: { type: String },
  phone: { type: String },
  dueDate: { type: Date },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create Models
const User = mongoose.model('User', userSchema);
const Lead = mongoose.model('Lead', leadSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Opportunity = mongoose.model('Opportunity', opportunitySchema);
const Activity = mongoose.model('Activity', activitySchema);

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: 'error', message: 'Access token required' });
  }

  jwt.verify(token, 'supersecretjwtkey', (err, user) => {
    if (err) {
      return res.status(403).json({ status: 'error', message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'success', message: 'Calyx CRM API is running' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    // Generate token
    const token = jwt.sign({ id: user._id }, 'supersecretjwtkey', { expiresIn: '7d' });
    
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
    
    // Generate token
    const token = jwt.sign({ id: user._id }, 'supersecretjwtkey', { expiresIn: '7d' });
    
    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// CRM API Routes

// Leads API
app.get('/api/leads', authenticateToken, async (req, res) => {
  try {
    const leads = await Lead.find().populate('assignedTo', 'name email');
    res.json({
      status: 'success',
      data: { leads }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch leads'
    });
  }
});

app.post('/api/leads', authenticateToken, async (req, res) => {
  try {
    const leadData = {
      ...req.body,
      assignedTo: req.user.id
    };
    const lead = new Lead(leadData);
    await lead.save();
    
    const populatedLead = await Lead.findById(lead._id).populate('assignedTo', 'name email');
    
    res.status(201).json({
      status: 'success',
      message: 'Lead created successfully',
      data: { lead: populatedLead }
    });
  } catch (error) {
    console.error('Lead creation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create lead'
    });
  }
});

// Customers API
app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const customers = await Customer.find().populate('salesperson', 'name email');
    res.json({
      status: 'success',
      data: { customers }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch customers'
    });
  }
});

app.post('/api/customers', authenticateToken, async (req, res) => {
  try {
    const customerData = {
      ...req.body,
      salesperson: req.user.id
    };
    const customer = new Customer(customerData);
    await customer.save();
    
    const populatedCustomer = await Customer.findById(customer._id).populate('salesperson', 'name email');
    
    res.status(201).json({
      status: 'success',
      message: 'Customer created successfully',
      data: { customer: populatedCustomer }
    });
  } catch (error) {
    console.error('Customer creation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create customer'
    });
  }
});

// Activities API
app.get('/api/activities', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    let query = {};
    if (status) query.status = status;
    
    const activities = await Activity.find(query)
      .populate('assignedTo', 'name email')
      .populate('customer', 'name email')
      .populate('opportunity', 'title value')
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    res.json({
      status: 'success',
      data: { 
        activities,
        total: activities.length
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch activities'
    });
  }
});

app.post('/api/activities', authenticateToken, async (req, res) => {
  try {
    const activityData = {
      ...req.body,
      assignedTo: req.user.id
    };
    const activity = new Activity(activityData);
    await activity.save();
    
    const populatedActivity = await Activity.findById(activity._id)
      .populate('assignedTo', 'name email')
      .populate('customer', 'name email');
    
    res.status(201).json({
      status: 'success',
      message: 'Activity created successfully',
      data: { activity: populatedActivity }
    });
  } catch (error) {
    console.error('Activity creation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create activity'
    });
  }
});

// Dashboard Stats API
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const [
      totalOpportunities,
      totalValue,
      upcomingClosing,
      expectedClosing,
      pendingActivities
    ] = await Promise.all([
      Opportunity.countDocuments(),
      Opportunity.aggregate([
        { $group: { _id: null, total: { $sum: '$value' } } }
      ]),
      Opportunity.countDocuments({
        expectedCloseDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      }),
      Opportunity.countDocuments({
        expectedCloseDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        }
      }),
      Activity.countDocuments({ status: 'pending' })
    ]);

    const weightedValue = totalValue[0]?.total || 0;

    res.json({
      status: 'success',
      data: {
        totalOpportunities,
        totalValue: weightedValue,
        weightedValue: Math.round(weightedValue * 0.7), // 70% weighted
        upcomingClosing,
        expectedClosing,
        pendingActivities
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard stats'
    });
  }
});

const PORT = 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple Server running on port ${PORT}`);
  console.log(`📱 Android Emulator URL: http://10.0.2.2:${PORT}/api`);
});

module.exports = app;
