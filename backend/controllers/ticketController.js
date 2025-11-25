const { Ticket, TicketMessage, User, Agent, Journey } = require('../models');
const { Op } = require('sequelize');

// @route   GET /api/tickets
// @desc    Get tickets (filtered by role)
// @access  Private
exports.getTickets = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by priority
    if (priority) {
      whereClause.priority = priority;
    }

    // Role-based filtering
    if (req.user.role === 'customer') {
      whereClause.customer_id = req.user.id;
    } else if (req.user.role === 'agent') {
      const agent = await Agent.findOne({ where: { user_id: req.user.id } });
      if (agent) {
        whereClause.assigned_agent_id = agent.id;
      }
    }
    // Admin can see all tickets

    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'customer', attributes: ['id', 'name', 'email'] },
        {
          model: Agent,
          as: 'assignedAgent',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
        },
        { model: Journey, as: 'journey', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      count,
      page: parseInt(page),
      pages: Math.ceil(count / limit),
      tickets
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET /api/tickets/:id
// @desc    Get single ticket
// @access  Private
exports.getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [
        { model: User, as: 'customer', attributes: ['id', 'name', 'email'] },
        {
          model: Agent,
          as: 'assignedAgent',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
        },
        { model: Journey, as: 'journey', attributes: ['id', 'name', 'nodes'] }
      ]
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Authorization check
    if (req.user.role === 'customer' && ticket.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this ticket' });
    }

    if (req.user.role === 'agent') {
      const agent = await Agent.findOne({ where: { user_id: req.user.id } });
      if (agent && ticket.assigned_agent_id !== agent.id) {
        return res.status(403).json({ error: 'Not authorized to view this ticket' });
      }
    }

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   POST /api/tickets
// @desc    Create new ticket
// @access  Private (Customer)
exports.createTicket = async (req, res) => {
  try {
    const {
      journey_id,
      journey_data,
      subject,
      description,
      attachments,
      category,
      priority
    } = req.body;

    // Get SLA config
    const QueueConfig = require('../models').QueueConfig;
    const config = await QueueConfig.findOne();
    const responseHours = config ? config.sla_response_hours : 2;
    const resolutionHours = config ? config.sla_resolution_hours : 24;

    const now = new Date();

    const ticket = await Ticket.create({
      customer_id: req.user.id,
      journey_id,
      journey_data,
      customer_name: req.user.name,
      customer_email: req.user.email,
      subject,
      description,
      attachments: attachments || [],
      category,
      priority: priority || 'medium',
      status: 'new',
      sla_response_deadline: new Date(now.getTime() + responseHours * 60 * 60 * 1000),
      sla_resolution_deadline: new Date(now.getTime() + resolutionHours * 60 * 60 * 1000)
    });

    // Reload with associations
    const newTicket = await Ticket.findByPk(ticket.id, {
      include: [
        { model: User, as: 'customer', attributes: ['id', 'name', 'email'] },
        { model: Journey, as: 'journey', attributes: ['id', 'name'] }
      ]
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('agents-room').emit('new-ticket', newTicket);
      io.to('admin-room').emit('new-ticket', newTicket);
    }

    res.status(201).json({
      success: true,
      ticket: newTicket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   PUT /api/tickets/:id
// @desc    Update ticket
// @access  Private (Agent/Admin)
exports.updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const { status, priority, escalation_reason } = req.body;

    // Update fields
    if (status) {
      ticket.status = status;

      // Set timestamps based on status
      if (status === 'in_progress' && !ticket.first_response_at) {
        ticket.first_response_at = new Date();
      }

      if (status === 'resolved' && !ticket.resolved_at) {
        ticket.resolved_at = new Date();

        // Update agent stats
        if (ticket.assigned_agent_id) {
          const agent = await Agent.findByPk(ticket.assigned_agent_id);
          if (agent) {
            agent.tickets_handled += 1;

            // Calculate resolution time
            const resolutionTime = Math.floor((ticket.resolved_at - ticket.created_at) / 1000);
            if (agent.avg_resolution_time) {
              agent.avg_resolution_time = Math.floor(
                (agent.avg_resolution_time * (agent.tickets_handled - 1) + resolutionTime) / agent.tickets_handled
              );
            } else {
              agent.avg_resolution_time = resolutionTime;
            }

            await agent.save();
          }
        }
      }

      if (status === 'escalated' && escalation_reason) {
        ticket.escalation_reason = escalation_reason;
      }
    }

    if (priority) {
      ticket.priority = priority;
    }

    await ticket.save();

    // Reload with associations
    const updatedTicket = await Ticket.findByPk(ticket.id, {
      include: [
        { model: User, as: 'customer', attributes: ['id', 'name', 'email'] },
        {
          model: Agent,
          as: 'assignedAgent',
          include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
        }
      ]
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`customer-${ticket.customer_id}`).emit('ticket-updated', updatedTicket);
      io.to('agents-room').emit('ticket-updated', updatedTicket);
      io.to('admin-room').emit('ticket-updated', updatedTicket);
    }

    res.json({
      success: true,
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   POST /api/tickets/:id/take
// @desc    Agent takes ticket from queue
// @access  Private (Agent)
exports.takeTicket = async (req, res) => {
  try {
    const queueService = req.app.get('queueService');
    const ticket = await queueService.takeTicket(req.params.id, req.user.id);

    res.json({
      success: true,
      ticket,
      message: 'Ticket assigned successfully'
    });
  } catch (error) {
    console.error('Take ticket error:', error);
    res.status(400).json({ error: error.message });
  }
};

// @route   POST /api/tickets/:id/reassign
// @desc    Reassign ticket to another agent
// @access  Private (Admin)
exports.reassignTicket = async (req, res) => {
  try {
    const { agent_id } = req.body;

    if (!agent_id) {
      return res.status(400).json({ error: 'Agent ID is required' });
    }

    const queueService = req.app.get('queueService');
    const ticket = await queueService.reassignTicket(req.params.id, agent_id);

    res.json({
      success: true,
      ticket,
      message: 'Ticket reassigned successfully'
    });
  } catch (error) {
    console.error('Reassign ticket error:', error);
    res.status(400).json({ error: error.message });
  }
};

// @route   GET /api/tickets/:id/messages
// @desc    Get ticket messages
// @access  Private
exports.getTicketMessages = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Authorization check
    if (req.user.role === 'customer' && ticket.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const messages = await TicketMessage.findAll({
      where: { ticket_id: req.params.id },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'email', 'role'] }
      ],
      order: [['created_at', 'ASC']]
    });

    res.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   POST /api/tickets/:id/messages
// @desc    Add message to ticket
// @access  Private
exports.addTicketMessage = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Authorization check
    if (req.user.role === 'customer' && ticket.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { message, attachments } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const senderType = req.user.role === 'customer' ? 'customer' : 'agent';

    const ticketMessage = await TicketMessage.create({
      ticket_id: req.params.id,
      sender_id: req.user.id,
      sender_type: senderType,
      message,
      attachments: attachments || []
    });

    // Update first_response_at if this is agent's first response
    if (senderType === 'agent' && !ticket.first_response_at) {
      ticket.first_response_at = new Date();
      if (ticket.status === 'assigned') {
        ticket.status = 'in_progress';
      }
      await ticket.save();
    }

    // Reload with associations
    const newMessage = await TicketMessage.findByPk(ticketMessage.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'email', 'role'] }
      ]
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`ticket-${req.params.id}`).emit('new-message', newMessage);
      io.to(`customer-${ticket.customer_id}`).emit('new-message', newMessage);
      if (ticket.assigned_agent_id) {
        const agent = await Agent.findByPk(ticket.assigned_agent_id);
        if (agent) {
          io.to(`agent-${agent.user_id}`).emit('new-message', newMessage);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET /api/queue
// @desc    Get current queue state
// @access  Private (Agent/Admin)
exports.getQueue = async (req, res) => {
  try {
    // Get unassigned tickets
    const queueTickets = await Ticket.findAll({
      where: {
        status: 'new',
        assigned_agent_id: null
      },
      include: [
        { model: User, as: 'customer', attributes: ['id', 'name', 'email'] }
      ],
      order: [
        ['priority', 'DESC'],
        ['created_at', 'ASC']
      ]
    });

    // Get my tickets (for agents)
    let myTickets = [];
    if (req.user.role === 'agent') {
      const agent = await Agent.findOne({ where: { user_id: req.user.id } });
      if (agent) {
        myTickets = await Ticket.findAll({
          where: {
            assigned_agent_id: agent.id,
            status: { [Op.notIn]: ['resolved'] }
          },
          include: [
            { model: User, as: 'customer', attributes: ['id', 'name', 'email'] }
          ],
          order: [['created_at', 'DESC']]
        });
      }
    }

    res.json({
      success: true,
      queue: queueTickets,
      myTickets: myTickets
    });
  } catch (error) {
    console.error('Get queue error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
