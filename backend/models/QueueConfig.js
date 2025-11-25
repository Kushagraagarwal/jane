const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QueueConfig = sequelize.define('QueueConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  last_assigned_agent_index: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  sla_response_hours: {
    type: DataTypes.INTEGER,
    defaultValue: 2
  },
  sla_resolution_hours: {
    type: DataTypes.INTEGER,
    defaultValue: 24
  }
}, {
  tableName: 'queue_config',
  timestamps: true,
  underscored: true
});

module.exports = QueueConfig;
