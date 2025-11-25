const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  journey_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'journeys',
      key: 'id'
    }
  },
  journey_data: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  status: {
    type: DataTypes.ENUM('new', 'assigned', 'in_progress', 'pending_customer', 'resolved', 'escalated'),
    defaultValue: 'new'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  assigned_agent_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'agents',
      key: 'id'
    }
  },
  customer_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  customer_email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  first_response_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sla_response_deadline: {
    type: DataTypes.DATE,
    allowNull: false
  },
  sla_resolution_deadline: {
    type: DataTypes.DATE,
    allowNull: false
  },
  escalation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'tickets',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['assigned_agent_id'] },
    { fields: ['customer_id'] },
    { fields: ['created_at'] },
    { fields: ['priority'] }
  ]
});

module.exports = Ticket;
