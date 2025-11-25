const sequelize = require('../config/database');
const User = require('./User');
const Agent = require('./Agent');
const Journey = require('./Journey');
const Ticket = require('./Ticket');
const TicketMessage = require('./TicketMessage');
const QueueConfig = require('./QueueConfig');

// Define associations
User.hasOne(Agent, { foreignKey: 'user_id', as: 'agentProfile' });
Agent.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Journey.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Ticket.belongsTo(User, { foreignKey: 'customer_id', as: 'customer' });
Ticket.belongsTo(Journey, { foreignKey: 'journey_id', as: 'journey' });
Ticket.belongsTo(Agent, { foreignKey: 'assigned_agent_id', as: 'assignedAgent' });

TicketMessage.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });
TicketMessage.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

module.exports = {
  sequelize,
  User,
  Agent,
  Journey,
  Ticket,
  TicketMessage,
  QueueConfig
};
