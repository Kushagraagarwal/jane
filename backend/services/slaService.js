const { Ticket, Agent, User, QueueConfig } = require('../models');
const { Op } = require('sequelize');

class SLAService {
  constructor(io) {
    this.io = io;
    this.checkInterval = null;
  }

  // Start SLA monitoring
  start() {
    console.log('SLA service started');
    this.checkInterval = setInterval(() => {
      this.checkSLABreaches();
    }, 60000); // Check every minute
  }

  // Stop SLA monitoring
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      console.log('SLA service stopped');
    }
  }

  // Calculate and set SLA deadlines for new ticket
  async setSLADeadlines(ticket) {
    try {
      const config = await QueueConfig.findOne();
      const responseHours = config ? config.sla_response_hours : 2;
      const resolutionHours = config ? config.sla_resolution_hours : 24;

      const now = new Date();
      ticket.sla_response_deadline = new Date(now.getTime() + responseHours * 60 * 60 * 1000);
      ticket.sla_resolution_deadline = new Date(now.getTime() + resolutionHours * 60 * 60 * 1000);

      await ticket.save();
      return ticket;
    } catch (error) {
      console.error('Error setting SLA deadlines:', error);
      throw error;
    }
  }

  // Check for SLA breaches
  async checkSLABreaches() {
    try {
      const now = new Date();

      // Find tickets with SLA breaches
      const breachedTickets = await Ticket.findAll({
        where: {
          status: {
            [Op.notIn]: ['resolved']
          },
          [Op.or]: [
            // Response SLA breached (no first response yet)
            {
              sla_response_deadline: { [Op.lt]: now },
              first_response_at: null
            },
            // Resolution SLA breached (not resolved yet)
            {
              sla_resolution_deadline: { [Op.lt]: now },
              resolved_at: null,
              status: { [Op.ne]: 'escalated' } // Don't re-escalate
            }
          ]
        },
        include: [
          { model: User, as: 'customer', attributes: ['id', 'name', 'email'] },
          { model: Agent, as: 'assignedAgent', include: [{ model: User, as: 'user' }] }
        ]
      });

      for (const ticket of breachedTickets) {
        // Auto-escalate
        const wasEscalated = ticket.status === 'escalated';

        if (!wasEscalated) {
          ticket.status = 'escalated';

          // Determine escalation reason
          const responseBreached = ticket.sla_response_deadline < now && !ticket.first_response_at;
          const resolutionBreached = ticket.sla_resolution_deadline < now && !ticket.resolved_at;

          if (responseBreached && resolutionBreached) {
            ticket.escalation_reason = 'SLA breach: Both response and resolution deadlines exceeded';
          } else if (responseBreached) {
            ticket.escalation_reason = 'SLA breach: Response deadline exceeded';
          } else if (resolutionBreached) {
            ticket.escalation_reason = 'SLA breach: Resolution deadline exceeded';
          }

          await ticket.save();

          console.log(`Ticket ${ticket.id} auto-escalated due to SLA breach`);

          // Emit socket event to admins
          if (this.io) {
            this.io.to('admin-room').emit('sla-breach', ticket);
            this.io.to('agents-room').emit('ticket-updated', ticket);
          }
        }
      }

      if (breachedTickets.length > 0) {
        console.log(`Processed ${breachedTickets.length} SLA breaches`);
      }

    } catch (error) {
      console.error('Error checking SLA breaches:', error);
    }
  }

  // Get SLA status for a ticket
  getSLAStatus(ticket) {
    const now = new Date();
    const responseDeadline = new Date(ticket.sla_response_deadline);
    const resolutionDeadline = new Date(ticket.sla_resolution_deadline);

    const response = {
      responseStatus: 'ok',
      resolutionStatus: 'ok',
      responseTimeRemaining: 0,
      resolutionTimeRemaining: 0
    };

    // Response SLA
    if (!ticket.first_response_at) {
      response.responseTimeRemaining = Math.floor((responseDeadline - now) / 1000); // in seconds

      if (response.responseTimeRemaining < 0) {
        response.responseStatus = 'breached';
      } else {
        const totalTime = responseDeadline - new Date(ticket.created_at);
        const percentRemaining = (response.responseTimeRemaining * 1000) / totalTime;

        if (percentRemaining < 0.2) {
          response.responseStatus = 'critical';
        } else if (percentRemaining < 0.5) {
          response.responseStatus = 'warning';
        }
      }
    } else {
      response.responseStatus = 'met';
    }

    // Resolution SLA
    if (!ticket.resolved_at) {
      response.resolutionTimeRemaining = Math.floor((resolutionDeadline - now) / 1000); // in seconds

      if (response.resolutionTimeRemaining < 0) {
        response.resolutionStatus = 'breached';
      } else {
        const totalTime = resolutionDeadline - new Date(ticket.created_at);
        const percentRemaining = (response.resolutionTimeRemaining * 1000) / totalTime;

        if (percentRemaining < 0.2) {
          response.resolutionStatus = 'critical';
        } else if (percentRemaining < 0.5) {
          response.resolutionStatus = 'warning';
        }
      }
    } else {
      response.resolutionStatus = 'met';
    }

    return response;
  }
}

module.exports = SLAService;
