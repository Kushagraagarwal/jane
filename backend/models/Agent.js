const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Agent = sequelize.define('Agent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('available', 'busy', 'away', 'offline'),
    defaultValue: 'offline'
  },
  current_shift_start: {
    type: DataTypes.DATE,
    allowNull: true
  },
  current_shift_end: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tickets_handled: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  avg_resolution_time: {
    type: DataTypes.INTEGER, // in seconds
    allowNull: true
  },
  avg_rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true
  },
  sla_compliance_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  }
}, {
  tableName: 'agents',
  timestamps: true,
  underscored: true
});

module.exports = Agent;
