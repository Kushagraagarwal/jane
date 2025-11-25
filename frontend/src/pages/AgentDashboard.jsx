import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemButton
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import Layout from '../components/common/Layout';
import SLATimer from '../components/common/SLATimer';
import { getQueue, takeTicket, updateAgentStatus } from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { emitAgentStatus } from '../services/socket';

const AgentDashboard = () => {
  const [status, setStatus] = useState('offline');
  const [myTickets, setMyTickets] = useState([]);
  const [queueTickets, setQueueTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const { on, off } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    fetchQueue();

    // Socket listeners
    const handleTicketAssigned = (ticket) => {
      setMyTickets(prev => [...prev, ticket]);
      fetchQueue();
    };

    const handleQueueUpdated = () => {
      fetchQueue();
    };

    const handleTicketUpdated = (ticket) => {
      setMyTickets(prev =>
        prev.map(t => t.id === ticket.id ? ticket : t)
      );
    };

    on('ticket-assigned', handleTicketAssigned);
    on('queue-updated', handleQueueUpdated);
    on('ticket-updated', handleTicketUpdated);

    return () => {
      off('ticket-assigned', handleTicketAssigned);
      off('queue-updated', handleQueueUpdated);
      off('ticket-updated', handleTicketUpdated);
    };
  }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const response = await getQueue();
      setMyTickets(response.data.myTickets || []);
      setQueueTickets(response.data.queue || []);

      // Calculate stats
      const active = response.data.myTickets?.filter(t => t.status !== 'resolved').length || 0;
      const resolved = response.data.myTickets?.filter(t => t.status === 'resolved').length || 0;
      setStats({ active, resolved, total: response.data.myTickets?.length || 0 });
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const agentId = user.agentProfile.id;
      await updateAgentStatus(agentId, newStatus);
      setStatus(newStatus);
      emitAgentStatus(newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleTakeTicket = async (ticketId) => {
    try {
      await takeTicket(ticketId);
      fetchQueue();
    } catch (error) {
      console.error('Error taking ticket:', error);
      alert('Failed to take ticket');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'info',
      assigned: 'warning',
      in_progress: 'primary',
      pending_customer: 'warning',
      resolved: 'success',
      escalated: 'error'
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'success',
      medium: 'info',
      high: 'warning',
      urgent: 'error'
    };
    return colors[priority] || 'default';
  };

  return (
    <Layout title="Agent Dashboard">
      <Grid container spacing={3}>
        {/* Header Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">
                Welcome, {user?.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={status}
                    label="Status"
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    <MenuItem value="available">Available</MenuItem>
                    <MenuItem value="busy">Busy</MenuItem>
                    <MenuItem value="away">Away</MenuItem>
                    <MenuItem value="offline">Offline</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  startIcon={<Refresh />}
                  onClick={fetchQueue}
                  disabled={loading}
                >
                  Refresh
                </Button>
              </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Active Tickets
                    </Typography>
                    <Typography variant="h4">
                      {stats.active || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Resolved Today
                    </Typography>
                    <Typography variant="h4">
                      {stats.resolved || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Total Handled
                    </Typography>
                    <Typography variant="h4">
                      {user?.agentProfile?.tickets_handled || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* My Tickets */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              My Tickets
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {myTickets.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No assigned tickets
              </Typography>
            ) : (
              <List>
                {myTickets.map((ticket) => (
                  <ListItemButton key={ticket.id}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle1">
                            {ticket.subject}
                          </Typography>
                          <Box>
                            <Chip
                              label={ticket.status.replace('_', ' ')}
                              color={getStatusColor(ticket.status)}
                              size="small"
                              sx={{ mr: 1 }}
                            />
                            <Chip
                              label={ticket.priority}
                              color={getPriorityColor(ticket.priority)}
                              size="small"
                            />
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" display="block">
                            Customer: {ticket.customer?.name}
                          </Typography>
                          {ticket.status !== 'resolved' && (
                            <SLATimer
                              deadline={ticket.sla_resolution_deadline}
                              metAt={ticket.resolved_at}
                              label="Resolution"
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Available Queue */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Available Tickets ({queueTickets.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {queueTickets.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No tickets in queue
              </Typography>
            ) : (
              <List>
                {queueTickets.map((ticket) => (
                  <ListItem
                    key={ticket.id}
                    secondaryAction={
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleTakeTicket(ticket.id)}
                      >
                        Take
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={ticket.subject}
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={ticket.priority}
                            color={getPriorityColor(ticket.priority)}
                            size="small"
                          />
                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            {new Date(ticket.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Layout>
  );
};

export default AgentDashboard;
