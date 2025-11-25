import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import { Refresh, People, ConfirmationNumber, Assessment, Settings } from '@mui/icons-material';
import Layout from '../components/common/Layout';
import { getRealtimeMetrics, getAgentsPerformance, getTickets } from '../services/api';

const AdminDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [metrics, setMetrics] = useState(null);
  const [agents, setAgents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tabValue === 0) {
      fetchMetrics();
    } else if (tabValue === 1) {
      fetchAgents();
    } else if (tabValue === 2) {
      fetchTickets();
    }
  }, [tabValue]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await getRealtimeMetrics();
      setMetrics(response.data.metrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await getAgentsPerformance();
      setAgents(response.data.agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await getTickets();
      setTickets(response.data.tickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'success',
      busy: 'warning',
      away: 'info',
      offline: 'default'
    };
    return colors[status] || 'default';
  };

  const handleRefresh = () => {
    if (tabValue === 0) fetchMetrics();
    else if (tabValue === 1) fetchAgents();
    else if (tabValue === 2) fetchTickets();
  };

  return (
    <Layout title="Admin Dashboard">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Admin Dashboard</Typography>
        <Button
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab icon={<Assessment />} label="Analytics" />
          <Tab icon={<People />} label="Agents" />
          <Tab icon={<ConfirmationNumber />} label="Tickets" />
          <Tab icon={<Settings />} label="Settings" />
        </Tabs>
      </Paper>

      {/* Analytics Tab */}
      {tabValue === 0 && metrics && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Active Tickets
                </Typography>
                <Typography variant="h4">
                  {metrics.active_tickets}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Queue Depth
                </Typography>
                <Typography variant="h4">
                  {metrics.queue_depth}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Agents Online
                </Typography>
                <Typography variant="h4">
                  {metrics.agents_online} / {metrics.total_agents}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Tickets Today
                </Typography>
                <Typography variant="h4">
                  {metrics.tickets_today}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Avg Response Time (Today)
                </Typography>
                <Typography variant="h5">
                  {Math.floor(metrics.avg_response_time / 60)} minutes
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Avg Resolution Time (Today)
                </Typography>
                <Typography variant="h5">
                  {Math.floor(metrics.avg_resolution_time / 3600)} hours
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Agents Tab */}
      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Tickets Handled</TableCell>
                <TableCell align="right">Resolved</TableCell>
                <TableCell align="right">SLA Compliance %</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>{agent.name}</TableCell>
                  <TableCell>{agent.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={agent.status}
                      color={getStatusColor(agent.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{agent.tickets_handled}</TableCell>
                  <TableCell align="right">{agent.resolved_tickets}</TableCell>
                  <TableCell align="right">{agent.sla_compliance_rate}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tickets Tab */}
      {tabValue === 2 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Assigned To</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.slice(0, 50).map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>{ticket.id.substring(0, 8)}</TableCell>
                  <TableCell>{ticket.subject}</TableCell>
                  <TableCell>{ticket.customer?.name}</TableCell>
                  <TableCell>
                    <Chip label={ticket.status} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={ticket.priority} size="small" />
                  </TableCell>
                  <TableCell>
                    {ticket.assignedAgent?.user?.name || 'Unassigned'}
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Settings Tab */}
      {tabValue === 3 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            System Configuration
          </Typography>
          <Typography color="text.secondary">
            Settings functionality can be added here (SLA configuration, journey management, etc.)
          </Typography>
        </Paper>
      )}
    </Layout>
  );
};

export default AdminDashboard;
