const { Ticket, Agent, User, QueueConfig } = require('../models');
const { Op } = require('sequelize');

class QueueService {
  constructor(io) {
    this.io = io;
    this.assignmentInterval = null;
  }

  // Start auto-assignment interval
  start() {
    console.log('Queue service started');
    this.assignmentInterval = setInterval(() => {
      this.assignNextTicket();
    }, 10000); // Run every 10 seconds
  }

  // Stop auto-assignment interval
  stop() {
    if (this.assignmentInterval) {
      clearInterval(this.assignmentInterval);
      console.log('Queue service stopped');
    }
  }

  // Check if agent is currently in shift
  isInShift(agent) {
    if (!agent.current_shift_start || !agent.current_shift_end) {
      return true; // No shift restriction
    }

    const now = new Date();
    const shiftStart = new Date(agent.current_shift_start);
    const shiftEnd = new Date(agent.current_shift_end);

    return now >= shiftStart && now <= shiftEnd;
  }

  // Round-robin ticket assignment
  async assignNextTicket() {
    try {
      // Get unassigned tickets ordered by priority (DESC) and created_at (ASC)
      const tickets = await Ticket.findAll({
        where: {
          status: 'new',
          assigned_agent_id: null
        },
        order: [
          ['priority', 'DESC'],
          ['created_at', 'ASC']
        ],
        limit: 1
      });

      if (tickets.length === 0) {
        return null;
      }

      // Get available agents
      const agents = await Agent.findAll({
        where: {
          status: 'available'
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }]
      });

      // Filter agents who are in shift
      const availableAgents = agents.filter(agent => this.isInShift(agent));

      if (availableAgents.length === 0) {
        return null;
      }

      // Get or create queue config
      let config = await QueueConfig.findOne();
      if (!config) {
        config = await QueueConfig.create({
          last_assigned_agent_index: 0,
          sla_response_hours: parseInt(process.env.SLA_RESPONSE_HOURS) || 2,
          sla_resolution_hours: parseInt(process.env.SLA_RESOLUTION_HOURS) || 24
        });
      }

      // Calculate next agent index (round-robin)
      let nextIndex = (config.last_assigned_agent_index + 1) % availableAgents.length;
      const nextAgent = availableAgents[nextIndex];
      const nextTicket = tickets[0];

      // Assign ticket
      nextTicket.assigned_agent_id = nextAgent.id;
      nextTicket.status = 'assigned';
      await nextTicket.save();

      // Update config
      config.last_assigned_agent_index = nextIndex;
      await config.save();

      // Reload ticket with associations
      const assignedTicket = await Ticket.findByPk(nextTicket.id, {
        include: [
          { model: User, as: 'customer', attributes: ['id', 'name', 'email'] },
          { model: Agent, as: 'assignedAgent', include: [{ model: User, as: 'user' }] }
        ]
      });

      // Emit socket event to the assigned agent
      if (this.io) {
        this.io.to(`agent-${nextAgent.user_id}`).emit('ticket-assigned', assignedTicket);

        // Emit queue update to all agents
        this.io.to('agents-room').emit('queue-updated');
      }

      console.log(`Ticket ${nextTicket.id} assigned to agent ${nextAgent.user.name}`);
      return assignedTicket;

    } catch (error) {
      console.error('Error in assignNextTicket:', error);
      return null;
    }
  }

  // Manual ticket assignment (admin only)
  async reassignTicket(ticketId, agentId) {
    try {
      const ticket = await Ticket.findByPk(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const agent = await Agent.findByPk(agentId, {
        include: [{ model: User, as: 'user' }]
      });
      if (!agent) {
        throw new Error('Agent not found');
      }

      ticket.assigned_agent_id = agentId;
      if (ticket.status === 'new') {
        ticket.status = 'assigned';
      }
      await ticket.save();

      // Reload with associations
      const updatedTicket = await Ticket.findByPk(ticketId, {
        include: [
          { model: User, as: 'customer', attributes: ['id', 'name', 'email'] },
          { model: Agent, as: 'assignedAgent', include: [{ model: User, as: 'user' }] }
        ]
      });

      // Emit socket events
      if (this.io) {
        this.io.to(`agent-${agent.user_id}`).emit('ticket-assigned', updatedTicket);
        this.io.to('agents-room').emit('queue-updated');
        this.io.to('admin-room').emit('ticket-updated', updatedTicket);
      }

      return updatedTicket;
    } catch (error) {
      console.error('Error in reassignTicket:', error);
      throw error;
    }
  }

  // Agent takes ticket manually from queue
  async takeTicket(ticketId, agentId) {
    try {
      const ticket = await Ticket.findByPk(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      if (ticket.assigned_agent_id) {
        throw new Error('Ticket already assigned');
      }

      const agent = await Agent.findOne({
        where: { user_id: agentId },
        include: [{ model: User, as: 'user' }]
      });

      if (!agent) {
        throw new Error('Agent not found');
      }

      ticket.assigned_agent_id = agent.id;
      ticket.status = 'assigned';
      await ticket.save();

      // Reload with associations
      const updatedTicket = await Ticket.findByPk(ticketId, {
        include: [
          { model: User, as: 'customer', attributes: ['id', 'name', 'email'] },
          { model: Agent, as: 'assignedAgent', include: [{ model: User, as: 'user' }] }
        ]
      });

      // Emit socket events
      if (this.io) {
        this.io.to(`agent-${agentId}`).emit('ticket-assigned', updatedTicket);
        this.io.to('agents-room').emit('queue-updated');
      }

      return updatedTicket;
    } catch (error) {
      console.error('Error in takeTicket:', error);
      throw error;
    }
  }
}

module.exports = QueueService;
