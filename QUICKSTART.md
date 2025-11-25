# Quick Start Guide

Get the Customer Support System running in 5 minutes!

## Prerequisites

- Node.js 16+ installed
- PostgreSQL 12+ installed and running
- Terminal access

## Setup Steps

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd frontend
npm install
```

### 2. Configure Environment

```bash
# Backend
cd backend
cp .env.example .env

# Edit .env with your PostgreSQL credentials:
# DB_NAME=customer_support
# DB_USER=postgres
# DB_PASSWORD=your_password
```

### 3. Create Database & Seed Data

```bash
# Create database
createdb customer_support

# Run seed script (creates tables and sample data)
cd backend
npm run seed
```

**Demo Accounts Created:**
- Admin: `admin@example.com` / `admin123`
- Agent 1: `agent1@example.com` / `agent123`
- Agent 2: `agent2@example.com` / `agent123`
- Customer: `customer@example.com` / `customer123`

### 4. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### 5. Access Application

Open http://localhost:3000 and login with any demo account!

## Test the System

### As Customer:
1. Login with `customer@example.com` / `customer123`
2. Click "New Ticket"
3. Complete the support journey
4. View your ticket with SLA timers

### As Agent:
1. Login with `agent1@example.com` / `agent123`
2. Set status to "Available"
3. View queue and take tickets
4. Watch auto-assignment in action

### As Admin:
1. Login with `admin@example.com` / `admin123`
2. View real-time analytics
3. Monitor agent performance
4. See all tickets across the system

## Troubleshooting

**Database connection failed?**
```bash
# Check PostgreSQL is running
pg_isready

# Verify credentials in backend/.env
```

**Port already in use?**
```bash
# Kill process on port 5000 or 3000
lsof -ti:5000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

**Modules not found?**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore the API endpoints
- Customize the journey in Admin Dashboard
- Add more agents or customers

## Key Features to Try

- **Real-time Updates**: Open agent dashboard in two tabs, assign ticket in one, see update in other
- **Auto-Assignment**: Leave agent status as "Available" and watch tickets auto-assign every 10 seconds
- **SLA Monitoring**: Create tickets and watch SLA timers countdown
- **Image Upload**: Upload images when creating tickets
- **Journey System**: Complete the dynamic support form with conditional questions

Enjoy your new Customer Support System!
