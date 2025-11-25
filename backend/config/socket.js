const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const { User, Agent } = require('../models');

const initializeSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user.role})`);

    // Join user-specific room
    socket.join(`user-${socket.user.id}`);

    // Role-based room joining
    if (socket.user.role === 'admin') {
      socket.join('admin-room');
      console.log(`Admin ${socket.user.name} joined admin-room`);
    }

    if (socket.user.role === 'agent') {
      socket.join('agents-room');
      socket.join(`agent-${socket.user.id}`);
      console.log(`Agent ${socket.user.name} joined agents-room`);
    }

    if (socket.user.role === 'customer') {
      socket.join(`customer-${socket.user.id}`);
    }

    // Handle agent status updates
    socket.on('agent-status', async (data) => {
      try {
        if (socket.user.role === 'agent') {
          const agent = await Agent.findOne({ where: { user_id: socket.user.id } });
          if (agent) {
            agent.status = data.status;
            await agent.save();

            // Broadcast to admin room
            io.to('admin-room').emit('agent-status-changed', {
              agentId: agent.id,
              userId: socket.user.id,
              name: socket.user.name,
              status: data.status
            });
          }
        }
      } catch (error) {
        console.error('Agent status update error:', error);
      }
    });

    // Join ticket room (for real-time ticket updates)
    socket.on('join-ticket-room', (ticketId) => {
      socket.join(`ticket-${ticketId}`);
      console.log(`User ${socket.user.name} joined ticket-${ticketId}`);
    });

    // Leave ticket room
    socket.on('leave-ticket-room', (ticketId) => {
      socket.leave(`ticket-${ticketId}`);
      console.log(`User ${socket.user.name} left ticket-${ticketId}`);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.name}`);

      // Set agent status to offline on disconnect
      if (socket.user.role === 'agent') {
        try {
          const agent = await Agent.findOne({ where: { user_id: socket.user.id } });
          if (agent) {
            agent.status = 'offline';
            await agent.save();

            io.to('admin-room').emit('agent-status-changed', {
              agentId: agent.id,
              userId: socket.user.id,
              name: socket.user.name,
              status: 'offline'
            });
          }
        } catch (error) {
          console.error('Error updating agent status on disconnect:', error);
        }
      }
    });
  });

  return io;
};

module.exports = initializeSocket;
