const { Agent, User, Ticket } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// @route   GET /api/agents
// @desc    Get all agents
// @access  Private (Admin)
exports.getAgents = async (req, res) => {
  try {
    const agents = await Agent.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      count: agents.length,
      agents
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET /api/agents/:id
// @desc    Get single agent
// @access  Private (Admin/Self)
exports.getAgent = async (req, res) => {
  try {
    const agent = await Agent.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Authorization: admin or self
    if (req.user.role !== 'admin' && agent.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({
      success: true,
      agent
    });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   POST /api/agents
// @desc    Create new agent
// @access  Private (Admin)
exports.createAgent = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user with agent role
    const user = await User.create({
      email,
      password,
      name,
      role: 'agent'
    });

    // Create agent profile
    const agent = await Agent.create({
      user_id: user.id,
      status: 'offline'
    });

    // Reload with associations
    const newAgent = await Agent.findByPk(agent.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      agent: newAgent,
      message: 'Agent created successfully'
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   PUT /api/agents/:id
// @desc    Update agent
// @access  Private (Admin)
exports.updateAgent = async (req, res) => {
  try {
    const agent = await Agent.findByPk(req.params.id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const { name, email, password, current_shift_start, current_shift_end } = req.body;

    // Update user info
    if (name) agent.user.name = name;
    if (email) agent.user.email = email;
    if (password) agent.user.password = password;

    await agent.user.save();

    // Update agent info
    if (current_shift_start !== undefined) agent.current_shift_start = current_shift_start;
    if (current_shift_end !== undefined) agent.current_shift_end = current_shift_end;

    await agent.save();

    // Reload
    const updatedAgent = await Agent.findByPk(agent.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      agent: updatedAgent,
      message: 'Agent updated successfully'
    });
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   PUT /api/agents/:id/status
// @desc    Update agent status
// @access  Private (Agent/Admin)
exports.updateAgentStatus = async (req, res) => {
  try {
    const agent = await Agent.findByPk(req.params.id, {
      include: [{ model: User, as: 'user' }]
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Authorization: admin or self
    if (req.user.role !== 'admin' && agent.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { status } = req.body;

    if (!['available', 'busy', 'away', 'offline'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    agent.status = status;
    await agent.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('admin-room').emit('agent-status-changed', {
        agentId: agent.id,
        userId: agent.user_id,
        status: agent.status
      });
    }

    res.json({
      success: true,
      agent,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Update agent status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET /api/agents/:id/performance
// @desc    Get agent performance metrics
// @access  Private (Admin/Self)
exports.getAgentPerformance = async (req, res) => {
  try {
    const agent = await Agent.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Authorization: admin or self
    if (req.user.role !== 'admin' && agent.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { from, to } = req.query;
    const whereClause = {
      assigned_agent_id: agent.id
    };

    // Add date filter if provided
    if (from || to) {
      whereClause.created_at = {};
      if (from) whereClause.created_at[Op.gte] = new Date(from);
      if (to) whereClause.created_at[Op.lte] = new Date(to);
    }

    // Get tickets
    const tickets = await Ticket.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });

    // Calculate metrics
    const totalTickets = tickets.length;
    const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
    const escalatedTickets = tickets.filter(t => t.status === 'escalated').length;

    // SLA compliance
    const ticketsWithSLA = tickets.filter(t => t.resolved_at);
    const slaCompliantTickets = ticketsWithSLA.filter(t => {
      return t.resolved_at <= t.sla_resolution_deadline;
    }).length;
    const slaComplianceRate = ticketsWithSLA.length > 0
      ? ((slaCompliantTickets / ticketsWithSLA.length) * 100).toFixed(2)
      : 0;

    // Tickets by day (for chart)
    const ticketsByDay = {};
    tickets.forEach(ticket => {
      const day = ticket.created_at.toISOString().split('T')[0];
      ticketsByDay[day] = (ticketsByDay[day] || 0) + 1;
    });

    res.json({
      success: true,
      performance: {
        agent: {
          id: agent.id,
          name: agent.user.name,
          email: agent.user.email
        },
        metrics: {
          total_tickets: totalTickets,
          resolved_tickets: resolvedTickets,
          escalated_tickets: escalatedTickets,
          tickets_handled: agent.tickets_handled,
          avg_resolution_time: agent.avg_resolution_time,
          avg_rating: agent.avg_rating,
          sla_compliance_rate: slaComplianceRate
        },
        ticketsByDay,
        recentTickets: tickets.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Get agent performance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET /api/analytics/agents
// @desc    Get all agents performance table
// @access  Private (Admin)
exports.getAgentsPerformance = async (req, res) => {
  try {
    const agents = await Agent.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    const performance = await Promise.all(
      agents.map(async (agent) => {
        const tickets = await Ticket.findAll({
          where: { assigned_agent_id: agent.id }
        });

        const resolvedTickets = tickets.filter(t => t.status === 'resolved');

        // Calculate SLA compliance
        const ticketsWithSLA = tickets.filter(t => t.resolved_at);
        const slaCompliantTickets = ticketsWithSLA.filter(t => {
          return t.resolved_at <= t.sla_resolution_deadline;
        }).length;
        const slaComplianceRate = ticketsWithSLA.length > 0
          ? ((slaCompliantTickets / ticketsWithSLA.length) * 100).toFixed(2)
          : 0;

        return {
          id: agent.id,
          name: agent.user.name,
          email: agent.user.email,
          status: agent.status,
          tickets_handled: agent.tickets_handled,
          resolved_tickets: resolvedTickets.length,
          avg_resolution_time: agent.avg_resolution_time,
          sla_compliance_rate: slaComplianceRate,
          avg_rating: agent.avg_rating
        };
      })
    );

    res.json({
      success: true,
      count: performance.length,
      agents: performance
    });
  } catch (error) {
    console.error('Get agents performance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
