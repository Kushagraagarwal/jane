const { Ticket, Agent, User, QueueConfig } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

// @route   GET /api/analytics/realtime
// @desc    Get real-time metrics
// @access  Private (Admin)
exports.getRealtimeMetrics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Active tickets (not resolved)
    const activeTickets = await Ticket.count({
      where: {
        status: { [Op.notIn]: ['resolved'] }
      }
    });

    // Queue depth (unassigned tickets)
    const queueDepth = await Ticket.count({
      where: {
        status: 'new',
        assigned_agent_id: null
      }
    });

    // Agents online
    const agentsOnline = await Agent.count({
      where: {
        status: { [Op.in]: ['available', 'busy'] }
      }
    });

    const totalAgents = await Agent.count();

    // Today's tickets
    const todayTickets = await Ticket.findAll({
      where: {
        created_at: { [Op.gte]: today }
      }
    });

    // Avg response time today (in seconds)
    const respondedTickets = todayTickets.filter(t => t.first_response_at);
    let avgResponseTime = 0;
    if (respondedTickets.length > 0) {
      const totalResponseTime = respondedTickets.reduce((sum, ticket) => {
        return sum + (new Date(ticket.first_response_at) - new Date(ticket.created_at)) / 1000;
      }, 0);
      avgResponseTime = Math.floor(totalResponseTime / respondedTickets.length);
    }

    // Avg resolution time today (in seconds)
    const resolvedToday = todayTickets.filter(t => t.resolved_at);
    let avgResolutionTime = 0;
    if (resolvedToday.length > 0) {
      const totalResolutionTime = resolvedToday.reduce((sum, ticket) => {
        return sum + (new Date(ticket.resolved_at) - new Date(ticket.created_at)) / 1000;
      }, 0);
      avgResolutionTime = Math.floor(totalResolutionTime / resolvedToday.length);
    }

    res.json({
      success: true,
      metrics: {
        active_tickets: activeTickets,
        queue_depth: queueDepth,
        agents_online: agentsOnline,
        total_agents: totalAgents,
        avg_response_time: avgResponseTime,
        avg_resolution_time: avgResolutionTime,
        tickets_today: todayTickets.length,
        resolved_today: resolvedToday.length
      }
    });
  } catch (error) {
    console.error('Get realtime metrics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET /api/analytics/historical
// @desc    Get historical analytics data
// @access  Private (Admin)
exports.getHistoricalAnalytics = async (req, res) => {
  try {
    const { from, to } = req.query;

    const whereClause = {};
    if (from || to) {
      whereClause.created_at = {};
      if (from) whereClause.created_at[Op.gte] = new Date(from);
      if (to) whereClause.created_at[Op.lte] = new Date(to);
    }

    const tickets = await Ticket.findAll({
      where: whereClause,
      order: [['created_at', 'ASC']]
    });

    // Ticket volume over time (by day)
    const ticketsByDay = {};
    tickets.forEach(ticket => {
      const day = ticket.created_at.toISOString().split('T')[0];
      ticketsByDay[day] = (ticketsByDay[day] || 0) + 1;
    });

    // Tickets by category
    const ticketsByCategory = {};
    tickets.forEach(ticket => {
      const category = ticket.category || 'Uncategorized';
      ticketsByCategory[category] = (ticketsByCategory[category] || 0) + 1;
    });

    // Tickets by status
    const ticketsByStatus = {};
    tickets.forEach(ticket => {
      ticketsByStatus[ticket.status] = (ticketsByStatus[ticket.status] || 0) + 1;
    });

    // Tickets by priority
    const ticketsByPriority = {};
    tickets.forEach(ticket => {
      ticketsByPriority[ticket.priority] = (ticketsByPriority[ticket.priority] || 0) + 1;
    });

    // Resolution rate trend (by day)
    const resolutionByDay = {};
    tickets.forEach(ticket => {
      const day = ticket.created_at.toISOString().split('T')[0];
      if (!resolutionByDay[day]) {
        resolutionByDay[day] = { total: 0, resolved: 0 };
      }
      resolutionByDay[day].total += 1;
      if (ticket.status === 'resolved') {
        resolutionByDay[day].resolved += 1;
      }
    });

    // Calculate resolution rate percentage by day
    const resolutionRateTrend = {};
    Object.keys(resolutionByDay).forEach(day => {
      const rate = (resolutionByDay[day].resolved / resolutionByDay[day].total) * 100;
      resolutionRateTrend[day] = rate.toFixed(2);
    });

    // Ticket volume by hour (heatmap data)
    const ticketsByHour = {};
    tickets.forEach(ticket => {
      const hour = ticket.created_at.getHours();
      const day = ticket.created_at.getDay(); // 0 = Sunday
      const key = `${day}-${hour}`;
      ticketsByHour[key] = (ticketsByHour[key] || 0) + 1;
    });

    res.json({
      success: true,
      analytics: {
        total_tickets: tickets.length,
        ticketsByDay,
        ticketsByCategory,
        ticketsByStatus,
        ticketsByPriority,
        resolutionRateTrend,
        ticketsByHour
      }
    });
  } catch (error) {
    console.error('Get historical analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   GET /api/queue/config
// @desc    Get queue configuration
// @access  Private (Admin)
exports.getQueueConfig = async (req, res) => {
  try {
    let config = await QueueConfig.findOne();

    if (!config) {
      config = await QueueConfig.create({
        sla_response_hours: 2,
        sla_resolution_hours: 24
      });
    }

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Get queue config error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// @route   PUT /api/queue/config
// @desc    Update queue configuration
// @access  Private (Admin)
exports.updateQueueConfig = async (req, res) => {
  try {
    let config = await QueueConfig.findOne();

    if (!config) {
      config = await QueueConfig.create({});
    }

    const { sla_response_hours, sla_resolution_hours } = req.body;

    if (sla_response_hours !== undefined) {
      config.sla_response_hours = sla_response_hours;
    }

    if (sla_resolution_hours !== undefined) {
      config.sla_resolution_hours = sla_resolution_hours;
    }

    await config.save();

    res.json({
      success: true,
      config,
      message: 'Queue configuration updated successfully'
    });
  } catch (error) {
    console.error('Update queue config error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
