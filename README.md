# Customer Support System MVP

A complete customer support system with dynamic journey-based ticket creation, real-time agent assignment, SLA monitoring, and comprehensive admin/agent dashboards.

## Features

### Customer Portal
- **Dynamic Journey-Based Ticket Creation**: Customers complete interactive forms with conditional logic
- **Multiple Question Types**: Single choice, multiple choice, text input, image upload
- **Real-time Ticket Status Tracking**: View ticket status and SLA timers
- **Image Upload Support**: Up to 5 images per ticket (5MB each)

### Agent Dashboard
- **Real-time Queue Management**: View available tickets and assigned tickets
- **Round-Robin Auto-Assignment**: Tickets automatically assigned to available agents
- **Status Management**: Set availability (Available, Busy, Away, Offline)
- **SLA Timers**: Color-coded timers for response and resolution deadlines
- **Performance Metrics**: Track tickets handled, resolution times, and SLA compliance

### Admin Dashboard
- **Real-time Analytics**: Active tickets, queue depth, agent availability
- **Agent Performance Monitoring**: Track all agents' metrics and SLA compliance
- **Journey Builder**: Create and manage customer support journeys (simplified in MVP)
- **System Configuration**: Manage SLA settings and queue configuration

### Backend Features
- **Queue Service**: Round-robin ticket assignment with shift management
- **SLA Service**: Automatic escalation when deadlines are breached
- **Real-time Updates**: Socket.io for live ticket and queue updates
- **JWT Authentication**: Secure role-based access control
- **File Upload**: Image handling with Multer

## Tech Stack

### Backend
- Node.js + Express
- PostgreSQL + Sequelize ORM
- Socket.io for real-time communication
- JWT for authentication
- Multer for file uploads

### Frontend
- React 18
- Material-UI (MUI) v5
- React Router v6
- Axios for API calls
- Socket.io-client
- Recharts for analytics (extensible)

## Prerequisites

- Node.js 16+ and npm
- PostgreSQL 12+
- Git

## Installation & Setup

### 1. Clone the Repository

```bash
cd customer-support-system
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=customer_support
# DB_USER=postgres
# DB_PASSWORD=your_password
# JWT_SECRET=your_secret_key_here
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb customer_support

# Or using psql
psql -U postgres
CREATE DATABASE customer_support;
\q

# Run seed script to create tables and sample data
npm run seed
```

This will create:
- Admin user: `admin@example.com` / `admin123`
- Agent 1: `agent1@example.com` / `agent123`
- Agent 2: `agent2@example.com` / `agent123`
- Customer: `customer@example.com` / `customer123`
- Sample active journey: "General Support"
- Default SLA configuration (2hr response, 24hr resolution)

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Default values should work if backend is on localhost:5000
```

### 5. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Backend will start on http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Frontend will start on http://localhost:3000

### 6. Access the Application

Open http://localhost:3000 in your browser.

## Usage Guide

### Login

Use one of the demo accounts:

**Admin:**
- Email: `admin@example.com`
- Password: `admin123`
- Access: Full system access, analytics, agent management

**Agent:**
- Email: `agent1@example.com` or `agent2@example.com`
- Password: `agent123`
- Access: Ticket queue, assigned tickets, status management

**Customer:**
- Email: `customer@example.com`
- Password: `customer123`
- Access: Create tickets, view own tickets

### Customer Flow

1. Login as customer
2. Click "New Ticket"
3. Complete the journey form:
   - Select issue type (Order Issue, Product Question, Refund, Other)
   - Provide additional details based on selection
   - Upload images if needed
   - Submit ticket
4. View ticket status and SLA timers on dashboard
5. Receive real-time updates when ticket status changes

### Agent Flow

1. Login as agent
2. Set status to "Available" to receive tickets
3. View "Available Tickets" in the queue
4. Click "Take" to manually assign a ticket to yourself
5. Tickets are also auto-assigned every 10 seconds via round-robin
6. View assigned tickets in "My Tickets" section
7. Track SLA timers for each ticket
8. Set status to "Offline" when done

### Admin Flow

1. Login as admin
2. View real-time metrics:
   - Active tickets
   - Queue depth
   - Agents online
   - Today's statistics
3. Navigate to "Agents" tab to view agent performance
4. Navigate to "Tickets" tab to view all tickets
5. Use "Settings" for system configuration (extensible)

## Key Functionalities

### Auto-Assignment (Round-Robin)

- Runs every 10 seconds
- Assigns tickets to agents with status "available"
- Only assigns to agents within their shift (if configured)
- Respects priority: urgent > high > medium > low
- Maintains round-robin index to distribute fairly

### SLA Monitoring

- Automatically checks for breaches every minute
- Two SLA types:
  - **Response SLA**: Time until first agent response (default: 2 hours)
  - **Resolution SLA**: Time until ticket marked resolved (default: 24 hours)
- Auto-escalates tickets when SLA breached
- Visual SLA timers with color coding:
  - Green: >50% time remaining
  - Yellow: 20-50% time remaining
  - Red: <20% time remaining or breached

### Real-time Updates (Socket.io)

- **Agents** receive:
  - `ticket-assigned`: When new ticket assigned
  - `queue-updated`: When queue changes
  - `ticket-updated`: When ticket status changes

- **Admins** receive:
  - All agent and queue events
  - `sla-breach`: When SLA is breached
  - `agent-status-changed`: When agent changes availability

- **Customers** receive:
  - `ticket-updated`: When their ticket status changes

### Journey System

The sample journey "General Support" demonstrates:
- Conditional routing based on answers
- Multiple question types
- Image upload capabilities
- Data collection and structuring

Journey data is stored in JSONB format and rendered dynamically.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register customer
- `GET /api/auth/me` - Get current user

### Tickets
- `GET /api/tickets` - List tickets (role-filtered)
- `GET /api/tickets/:id` - Get ticket details
- `POST /api/tickets` - Create ticket
- `PUT /api/tickets/:id` - Update ticket
- `POST /api/tickets/:id/take` - Agent takes ticket
- `POST /api/tickets/:id/reassign` - Admin reassigns ticket
- `GET /api/tickets/:id/messages` - Get ticket messages
- `POST /api/tickets/:id/messages` - Add message
- `GET /api/tickets/queue` - Get queue state

### Agents
- `GET /api/agents` - List all agents (admin)
- `POST /api/agents` - Create agent (admin)
- `PUT /api/agents/:id` - Update agent (admin)
- `PUT /api/agents/:id/status` - Update agent status
- `GET /api/agents/:id/performance` - Get agent performance

### Analytics
- `GET /api/analytics/realtime` - Real-time metrics (admin)
- `GET /api/analytics/historical` - Historical data (admin)
- `GET /api/analytics/queue/config` - Get SLA config (admin)
- `PUT /api/analytics/queue/config` - Update SLA config (admin)

### Journeys
- `GET /api/journeys` - List journeys
- `POST /api/journeys` - Create journey (admin)
- `PUT /api/journeys/:id` - Update journey (admin)
- `POST /api/journeys/:id/publish` - Publish journey (admin)

### Upload
- `POST /api/upload` - Upload images

## Database Schema

### users
- Stores all users (admin, agent, customer)
- Password hashed with bcrypt
- Role-based access control

### agents
- Extended profile for agent users
- Tracks status, shift times, performance metrics

### journeys
- Stores journey definitions in JSONB
- Version control (draft, active, archived)
- Only one journey can be active at a time

### tickets
- Main ticket entity
- Links to customer, agent, journey
- Stores journey responses in JSONB
- Tracks SLA deadlines and timestamps

### ticket_messages
- Conversation thread for each ticket
- Supports attachments

### queue_config
- System-wide SLA and queue settings
- Round-robin state

## Configuration

### SLA Settings (Default)

Edit in `.env`:
```
SLA_RESPONSE_HOURS=2
SLA_RESOLUTION_HOURS=24
```

Or update via Admin Dashboard > Settings (requires UI implementation)

### File Upload Settings

Edit in `.env`:
```
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880  # 5MB in bytes
```

### Agent Shifts

Set shift times via Admin Dashboard > Agents > Edit Agent:
- `current_shift_start`: Shift start time (timestamp)
- `current_shift_end`: Shift end time (timestamp)
- Leave null for 24/7 availability

## Extending the System

### Adding New Question Types

1. Update `JourneyRenderer.jsx` with new render logic
2. Update `journeyEvaluator.js` for validation
3. Update database schema if needed

### Building Journey Builder UI

The backend supports full journey CRUD. To add visual builder:
1. Use `react-flow-renderer` or similar library
2. Create drag-and-drop interface in Admin Dashboard
3. Implement node creation, connection, and property editing
4. Save to `/api/journeys` endpoint

### Adding Analytics Charts

1. Use `recharts` (already installed)
2. Fetch data from `/api/analytics/historical`
3. Create chart components in Admin Dashboard

### Adding Ticket Messaging

1. Use `TicketMessage` model (already implemented)
2. Create ticket detail view with message thread
3. Use Socket.io for real-time message updates

## Troubleshooting

### Database Connection Issues
```bash
# Verify PostgreSQL is running
pg_isready

# Check credentials in backend/.env
# Ensure database exists
psql -U postgres -l
```

### Port Already in Use
```bash
# Backend (5000)
lsof -ti:5000 | xargs kill -9

# Frontend (3000)
lsof -ti:3000 | xargs kill -9
```

### Socket.io Connection Errors
- Ensure backend is running on correct port
- Check CORS configuration in `backend/server.js`
- Verify `VITE_SOCKET_URL` in `frontend/.env`

### Image Upload Failing
- Check `uploads` directory exists and is writable
- Verify file size limits in `.env`
- Check file format (only JPG, PNG allowed)

## Production Deployment

### Backend
1. Set `NODE_ENV=production`
2. Use process manager (PM2, systemd)
3. Configure reverse proxy (nginx)
4. Use environment variables for secrets
5. Enable PostgreSQL SSL
6. Set up log rotation

### Frontend
1. Build: `npm run build`
2. Serve `dist` folder with nginx or similar
3. Configure API URLs for production
4. Enable HTTPS

### Database
1. Use migrations instead of `sync()`
2. Set up automated backups
3. Configure connection pooling
4. Monitor query performance

## Security Notes

- JWT secret should be strong and unique in production
- Use HTTPS for all communications
- Implement rate limiting on API endpoints
- Sanitize user inputs to prevent XSS
- Use parameterized queries (Sequelize does this)
- Validate file uploads thoroughly
- Implement CSRF protection for forms
- Regular security audits and dependency updates

## Performance Optimization

- Add Redis for session management
- Implement caching for frequently accessed data
- Use database indexes (already added for key fields)
- Optimize Socket.io room management for scale
- Consider message queue (Bull, RabbitMQ) for background jobs
- Implement pagination for large datasets

## Future Enhancements

- [ ] Visual Journey Builder UI
- [ ] Ticket detail view with full conversation
- [ ] Email notifications (Nodemailer)
- [ ] Slack integration for alerts
- [ ] Advanced analytics with charts
- [ ] Customer satisfaction ratings
- [ ] Knowledge base integration
- [ ] Multi-language support
- [ ] Mobile responsive improvements
- [ ] Export reports (PDF, CSV)
- [ ] Scheduled reports
- [ ] Custom fields for tickets
- [ ] Ticket templates
- [ ] Canned responses for agents
- [ ] Internal notes on tickets

## License

MIT License - feel free to use for your projects!

## Support

For issues or questions, please open an issue in the repository.
# jane
