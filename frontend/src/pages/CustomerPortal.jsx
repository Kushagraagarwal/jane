import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert
} from '@mui/material';
import { Add, Refresh } from '@mui/icons-material';
import Layout from '../components/common/Layout';
import JourneyRenderer from '../components/customer/JourneyRenderer';
import SLATimer from '../components/common/SLATimer';
import { getJourneys, getTickets, createTicket } from '../services/api';
import { useSocket } from '../contexts/SocketContext';

const CustomerPortal = () => {
  const [view, setView] = useState('tickets'); // 'tickets' or 'new-ticket'
  const [journey, setJourney] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const { on, off } = useSocket();

  useEffect(() => {
    fetchTickets();

    // Listen for ticket updates
    const handleTicketUpdate = (updatedTicket) => {
      setTickets(prev =>
        prev.map(t => t.id === updatedTicket.id ? updatedTicket : t)
      );
    };

    on('ticket-updated', handleTicketUpdate);

    return () => {
      off('ticket-updated', handleTicketUpdate);
    };
  }, []);

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

  const handleNewTicket = async () => {
    try {
      const response = await getJourneys();
      const activeJourney = response.data.journeys.find(j => j.status === 'active');

      if (!activeJourney) {
        alert('No active journey available. Please contact support.');
        return;
      }

      setJourney(activeJourney);
      setView('new-ticket');
    } catch (error) {
      console.error('Error loading journey:', error);
      alert('Failed to load support form');
    }
  };

  const handleJourneyComplete = async (ticketData) => {
    try {
      setLoading(true);
      await createTicket(ticketData);
      setSuccess('Ticket created successfully!');
      setView('tickets');
      fetchTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket');
    } finally {
      setLoading(false);
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

  if (view === 'new-ticket' && journey) {
    return (
      <Layout title="Create Support Ticket">
        <Button
          startIcon={<Refresh />}
          onClick={() => {
            setView('tickets');
            setJourney(null);
          }}
          sx={{ mb: 2 }}
        >
          Back to My Tickets
        </Button>
        <JourneyRenderer journey={journey} onComplete={handleJourneyComplete} />
      </Layout>
    );
  }

  return (
    <Layout title="Customer Portal">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">My Support Tickets</Typography>
        <Box>
          <Button
            startIcon={<Refresh />}
            onClick={fetchTickets}
            disabled={loading}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleNewTicket}
          >
            New Ticket
          </Button>
        </Box>
      </Box>

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {tickets.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No tickets yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Create your first support ticket to get started
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={handleNewTicket}>
            Create Ticket
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {tickets.map((ticket) => (
            <Grid item xs={12} md={6} lg={4} key={ticket.id}>
              <Card>
                <CardContent>
                  <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      #{ticket.id.substring(0, 8)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>

                  <Typography variant="h6" gutterBottom noWrap>
                    {ticket.subject}
                  </Typography>

                  <Box sx={{ mb: 1 }}>
                    <Chip
                      label={ticket.status.replace('_', ' ').toUpperCase()}
                      color={getStatusColor(ticket.status)}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={ticket.priority.toUpperCase()}
                      color={getPriorityColor(ticket.priority)}
                      size="small"
                    />
                  </Box>

                  {ticket.status !== 'resolved' && (
                    <Box sx={{ mt: 2 }}>
                      <SLATimer
                        deadline={ticket.sla_resolution_deadline}
                        metAt={ticket.resolved_at}
                        label="Resolution"
                        variant="filled"
                      />
                    </Box>
                  )}

                  {ticket.assignedAgent && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Assigned to: {ticket.assignedAgent.user.name}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Layout>
  );
};

export default CustomerPortal;
