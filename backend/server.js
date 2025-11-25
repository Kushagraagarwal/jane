const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();

const { sequelize } = require('./models');
const initializeSocket = require('./config/socket');
const QueueService = require('./services/queueService');
const SLAService = require('./services/slaService');

// Initialize express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);

// Store io instance in app for use in routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/journeys', require('./routes/journeys'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/upload', require('./routes/upload'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Initialize services
const queueService = new QueueService(io);
const slaService = new SLAService(io);

// Store services in app for use in routes
app.set('queueService', queueService);
app.set('slaService', slaService);

const PORT = process.env.PORT || 5000;

// Database connection and server start
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync database (tables already created by seed script)
    // await sequelize.sync({ alter: false });
    console.log('Database ready.');

    // Start queue and SLA services
    queueService.start();
    slaService.start();

    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  queueService.stop();
  slaService.stop();
  server.close(() => {
    console.log('Server closed');
    sequelize.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  queueService.stop();
  slaService.stop();
  server.close(() => {
    console.log('Server closed');
    sequelize.close();
    process.exit(0);
  });
});

startServer();

module.exports = app;
