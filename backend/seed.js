const { sequelize, User, Agent, Journey, QueueConfig } = require('./models');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    console.log('Starting database seed...');

    // Sync database
    await sequelize.sync({ force: true });
    console.log('Database synced (all tables dropped and recreated)');

    // Create admin user
    const admin = await User.create({
      email: 'admin@example.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin'
    });
    console.log('✓ Admin user created');

    // Create agent users
    const agent1User = await User.create({
      email: 'agent1@example.com',
      password: 'agent123',
      name: 'Agent One',
      role: 'agent'
    });

    const agent2User = await User.create({
      email: 'agent2@example.com',
      password: 'agent123',
      name: 'Agent Two',
      role: 'agent'
    });
    console.log('✓ Agent users created');

    // Create agent profiles
    await Agent.create({
      user_id: agent1User.id,
      status: 'offline',
      current_shift_start: null,
      current_shift_end: null
    });

    await Agent.create({
      user_id: agent2User.id,
      status: 'offline',
      current_shift_start: null,
      current_shift_end: null
    });
    console.log('✓ Agent profiles created');

    // Create sample customer
    const customer = await User.create({
      email: 'customer@example.com',
      password: 'customer123',
      name: 'John Customer',
      role: 'customer'
    });
    console.log('✓ Sample customer created');

    // Create sample journey
    const journey = await Journey.create({
      name: 'General Support',
      description: 'Main customer support journey for general inquiries',
      version: 1,
      status: 'active',
      created_by: admin.id,
      published_at: new Date(),
      nodes: {
        startNode: 'node-1',
        nodes: {
          'node-1': {
            id: 'node-1',
            type: 'question',
            questionType: 'single_choice',
            question: 'What do you need help with?',
            options: [
              { label: 'Order Issue', value: 'order_issue' },
              { label: 'Product Question', value: 'product_question' },
              { label: 'Refund Request', value: 'refund' },
              { label: 'Other', value: 'other' }
            ],
            nextNodeMap: {
              'order_issue': 'node-2',
              'product_question': 'node-3',
              'refund': 'node-4',
              'other': 'node-5'
            },
            required: true
          },
          'node-2': {
            id: 'node-2',
            type: 'question',
            questionType: 'text_input',
            question: 'Please provide your order number',
            validation: {
              required: true,
              minLength: 5
            },
            nextNodeId: 'node-6'
          },
          'node-3': {
            id: 'node-3',
            type: 'question',
            questionType: 'text_input',
            question: 'Which product are you asking about?',
            validation: {
              required: true
            },
            nextNodeId: 'node-6'
          },
          'node-4': {
            id: 'node-4',
            type: 'question',
            questionType: 'image_upload',
            question: 'Please upload your order receipt or proof of purchase',
            validation: {
              required: true,
              maxFiles: 5
            },
            nextNodeId: 'node-6'
          },
          'node-5': {
            id: 'node-5',
            type: 'question',
            questionType: 'text_input',
            question: 'Please describe your issue in detail',
            validation: {
              required: true,
              minLength: 10
            },
            nextNodeId: 'node-6'
          },
          'node-6': {
            id: 'node-6',
            type: 'question',
            questionType: 'text_input',
            question: 'Is there anything else you would like to add?',
            validation: {
              required: false
            },
            nextNodeId: 'end'
          },
          'end': {
            id: 'end',
            type: 'end',
            message: 'Thank you! Your ticket has been submitted. Our support team will get back to you shortly.'
          }
        }
      }
    });
    console.log('✓ Sample journey created and activated');

    // Create queue configuration
    await QueueConfig.create({
      last_assigned_agent_index: 0,
      sla_response_hours: 2,
      sla_resolution_hours: 24
    });
    console.log('✓ Queue configuration created');

    console.log('\n=== Seed Complete ===');
    console.log('\nLogin Credentials:');
    console.log('Admin:     admin@example.com     / admin123');
    console.log('Agent 1:   agent1@example.com    / agent123');
    console.log('Agent 2:   agent2@example.com    / agent123');
    console.log('Customer:  customer@example.com  / customer123');
    console.log('\n=====================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();
