const mongoose = require('mongoose');
const User = require('./models/User');
const Customer = require('./models/Customer');
const Pipeline = require('./models/Pipeline');
const Opportunity = require('./models/Opportunity');
const Activity = require('./models/Activity');
const Team = require('./models/Team');
const Lead = require('./models/Lead');

// Sample data for seeding
const sampleCustomers = [
  {
    name: 'Acme Corp',
    email: 'contact@acmecorp.com',
    phone: '+1-555-0123',
    company: 'Acme Corporation',
    industry: 'Technology',
    address: {
      street: '123 Business Ave',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    }
  },
  {
    name: 'TechStart Inc',
    email: 'info@techstart.com',
    phone: '+1-555-0456',
    company: 'TechStart Inc',
    industry: 'Software',
    address: {
      street: '456 Innovation St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'USA'
    }
  },
  {
    name: 'Global Systems',
    email: 'sales@globalsystems.com',
    phone: '+1-555-0789',
    company: 'Global Systems Ltd',
    industry: 'Enterprise Software',
    address: {
      street: '789 Enterprise Blvd',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA'
    }
  },
  {
    name: 'Digital Solutions',
    email: 'hello@digitalsolutions.com',
    phone: '+1-555-0321',
    company: 'Digital Solutions Co',
    industry: 'Digital Marketing',
    address: {
      street: '321 Digital Way',
      city: 'Austin',
      state: 'TX',
      zipCode: '73301',
      country: 'USA'
    }
  }
];

const sampleOpportunities = [
  {
    title: 'Enterprise Software Deal',
    value: 50000,
    stage: 'Lead',
    expectedCloseDate: new Date('2024-03-15'),
    description: 'Large enterprise software implementation project'
  },
  {
    title: 'Marketing Automation Platform',
    value: 25000,
    stage: 'Qualified',
    expectedCloseDate: new Date('2024-02-28'),
    description: 'Marketing automation and CRM integration'
  },
  {
    title: 'Cloud Migration Project',
    value: 75000,
    stage: 'Proposal',
    expectedCloseDate: new Date('2024-04-30'),
    description: 'Complete cloud infrastructure migration'
  },
  {
    title: 'Digital Transformation Initiative',
    value: 100000,
    stage: 'Negotiation',
    expectedCloseDate: new Date('2024-05-15'),
    description: 'Full digital transformation consulting engagement'
  },
  {
    title: 'Mobile App Development',
    value: 35000,
    stage: 'Qualified',
    expectedCloseDate: new Date('2024-03-30'),
    description: 'Custom mobile application development'
  }
];

const sampleActivities = [
  {
    type: 'call',
    subject: 'Follow up call with Acme Corp',
    description: 'Discuss pricing and implementation timeline for the enterprise software deal',
    priority: 'high',
    status: 'pending',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
  },
  {
    type: 'email',
    subject: 'Send proposal to TechStart Inc',
    description: 'Email the detailed proposal for marketing automation platform',
    priority: 'medium',
    status: 'in_progress',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
  },
  {
    type: 'meeting',
    subject: 'Product demo with Global Systems',
    description: 'Schedule and conduct product demonstration for cloud migration project',
    priority: 'high',
    status: 'completed',
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    completedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    type: 'task',
    subject: 'Prepare contract for Digital Solutions',
    description: 'Draft and review contract terms for digital transformation initiative',
    priority: 'urgent',
    status: 'pending',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
  },
  {
    type: 'note',
    subject: 'Meeting notes with Acme Corp',
    description: 'Key points from the initial discovery call - they need integration with their existing ERP system',
    priority: 'low',
    status: 'completed',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    completedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    type: 'demo',
    subject: 'Technical demo for TechStart Inc',
    description: 'Show advanced features of the marketing automation platform',
    priority: 'medium',
    status: 'pending',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
  },
  {
    type: 'proposal',
    subject: 'Create proposal for Global Systems',
    description: 'Prepare detailed proposal for cloud migration project including timeline and costs',
    priority: 'high',
    status: 'in_progress',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
  },
  {
    type: 'follow_up',
    subject: 'Follow up with Digital Solutions',
    description: 'Check on contract review status and answer any questions',
    priority: 'medium',
    status: 'pending',
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
  }
];

const sampleTeams = [
  {
    name: 'Sales Team Alpha',
    description: 'Primary sales team handling enterprise accounts and major deals',
    department: 'Sales',
    targetRevenue: 500000,
    currentRevenue: 125000,
  },
  {
    name: 'Marketing Team',
    description: 'Digital marketing and lead generation team',
    department: 'Marketing',
    targetRevenue: 200000,
    currentRevenue: 75000,
  },
  {
    name: 'Customer Success',
    description: 'Post-sales support and customer relationship management',
    department: 'Customer Success',
    targetRevenue: 100000,
    currentRevenue: 45000,
  },
  {
    name: 'Business Development',
    description: 'Strategic partnerships and business expansion',
    department: 'Business Development',
    targetRevenue: 300000,
    currentRevenue: 90000,
  }
];

const sampleLeads = [
  {
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '+1-555-0123',
    company: 'TechCorp Solutions',
    source: 'website',
    estimatedValue: 45000,
    status: 'new',
    notes: 'Interested in enterprise software solutions'
  },
  {
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'm.chen@startup.io',
    phone: '+1-555-0456',
    company: 'StartupIO',
    source: 'referral',
    estimatedValue: 25000,
    status: 'contacted',
    notes: 'Referred by existing customer, looking for CRM solution'
  },
  {
    firstName: 'Emily',
    lastName: 'Rodriguez',
    email: 'emily@digitalagency.com',
    phone: '+1-555-0789',
    company: 'Digital Agency Pro',
    source: 'cold_call',
    estimatedValue: 35000,
    status: 'qualified',
    notes: 'Qualified lead, ready for proposal'
  },
  {
    firstName: 'David',
    lastName: 'Kim',
    email: 'david.kim@ecommerce.com',
    phone: '+1-555-0321',
    company: 'E-Commerce Plus',
    source: 'social_media',
    estimatedValue: 55000,
    status: 'new',
    notes: 'Found through LinkedIn, interested in automation tools'
  },
  {
    firstName: 'Lisa',
    lastName: 'Thompson',
    email: 'lisa@consulting.com',
    phone: '+1-555-0654',
    company: 'Thompson Consulting',
    source: 'website',
    estimatedValue: 40000,
    status: 'contacted',
    notes: 'Downloaded whitepaper, scheduled follow-up call'
  }
];

const seedData = async () => {
  try {
    console.log('🌱 Starting data seeding...');

    // Get the first user (assuming there's at least one user)
    const user = await User.findOne().select('+password');
    if (!user) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }
    console.log(`✅ Found user: ${user.name} (${user.email})`);

    // Create customers
    console.log('👥 Creating customers...');
    const customers = [];
    for (const customerData of sampleCustomers) {
      const existingCustomer = await Customer.findOne({ email: customerData.email });
      if (!existingCustomer) {
        const customer = new Customer({
          ...customerData,
          createdBy: user._id
        });
        await customer.save();
        customers.push(customer);
        console.log(`✅ Created customer: ${customer.name}`);
      } else {
        customers.push(existingCustomer);
        console.log(`ℹ️  Customer already exists: ${existingCustomer.name}`);
      }
    }

    // Create default pipeline if it doesn't exist
    console.log('🔄 Creating default pipeline...');
    let pipeline = await Pipeline.findOne({ isDefault: true });
    if (!pipeline) {
      pipeline = new Pipeline({
        name: 'Sales Pipeline',
        description: 'Default sales pipeline for tracking opportunities',
        isDefault: true,
        createdBy: user._id,
        stages: [
          { name: 'Lead', probability: 10, color: '#FF9800', order: 1 },
          { name: 'Qualified', probability: 25, color: '#2196F3', order: 2 },
          { name: 'Proposal', probability: 50, color: '#9C27B0', order: 3 },
          { name: 'Negotiation', probability: 75, color: '#FF5722', order: 4 },
          { name: 'Closed Won', probability: 100, color: '#4CAF50', order: 5 },
        ]
      });
      await pipeline.save();
      console.log('✅ Created default pipeline');
    } else {
      console.log('ℹ️  Default pipeline already exists');
    }

    // Create opportunities
    console.log('💰 Creating opportunities...');
    for (let i = 0; i < sampleOpportunities.length; i++) {
      const oppData = sampleOpportunities[i];
      const customer = customers[i % customers.length];
      
      // Check if opportunity already exists
      const existingOpp = await Opportunity.findOne({ 
        title: oppData.title,
        customer: customer._id
      });
      
      if (!existingOpp) {
        // Get stage probability from pipeline
        const stage = pipeline.stages.find(s => s.name === oppData.stage);
        const probability = stage ? stage.probability : 0;

        const opportunity = new Opportunity({
          title: oppData.title,
          value: oppData.value,
          stage: oppData.stage,
          probability,
          pipeline: pipeline._id,
          customer: customer._id,
          salesperson: user._id,
          expectedCloseDate: oppData.expectedCloseDate,
          description: oppData.description,
          source: 'website',
          createdBy: user._id
        });
        
        await opportunity.save();
        console.log(`✅ Created opportunity: ${opportunity.title}`);
      } else {
        console.log(`ℹ️  Opportunity already exists: ${existingOpp.title}`);
      }
    }

    // Create teams
    console.log('👥 Creating teams...');
    let teamCount = 0;
    for (const teamData of sampleTeams) {
      const existingTeam = await Team.findOne({ 
        name: teamData.name
      });
      
      if (!existingTeam) {
        const team = new Team({
          ...teamData,
          manager: user._id,
          createdBy: user._id
        });
        
        await team.save();
        teamCount++;
        console.log(`✅ Created team: ${team.name}`);
      } else {
        console.log(`ℹ️  Team already exists: ${existingTeam.name}`);
      }
    }

    // Create leads
    console.log('🎯 Creating leads...');
    let leadCount = 0;
    for (const leadData of sampleLeads) {
      const existingLead = await Lead.findOne({ 
        email: leadData.email
      });
      
      if (!existingLead) {
        const lead = new Lead({
          ...leadData,
          createdBy: user._id
        });
        
        await lead.save();
        leadCount++;
        console.log(`✅ Created lead: ${lead.firstName} ${lead.lastName}`);
      } else {
        console.log(`ℹ️  Lead already exists: ${existingLead.firstName} ${existingLead.lastName}`);
      }
    }

    // Create activities
    console.log('📋 Creating activities...');
    let activityCount = 0;
    for (const activityData of sampleActivities) {
      const existingActivity = await Activity.findOne({ 
        subject: activityData.subject
      });
      
      if (!existingActivity) {
        const activity = new Activity({
          ...activityData,
          assignedTo: user._id,
          createdBy: user._id
        });
        
        await activity.save();
        activityCount++;
        console.log(`✅ Created activity: ${activity.subject}`);
      } else {
        console.log(`ℹ️  Activity already exists: ${existingActivity.subject}`);
      }
    }

    console.log('🎉 Data seeding completed successfully!');
    console.log(`📊 Created/Found:`);
    console.log(`   - ${customers.length} customers`);
    console.log(`   - 1 pipeline`);
    console.log(`   - ${sampleOpportunities.length} opportunities`);
    console.log(`   - ${teamCount} teams`);
    console.log(`   - ${leadCount} leads`);
    console.log(`   - ${activityCount} activities`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  // Connect to MongoDB using the same config as server
  const dotenv = require('dotenv');
  dotenv.config({ path: './config.env' });
  
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/calyx-crm';
  console.log('Connecting to:', mongoUri);
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('🔗 Connected to MongoDB');
      return seedData();
    })
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedData };
