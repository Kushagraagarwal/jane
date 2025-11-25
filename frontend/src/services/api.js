import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);
export const getMe = () => api.get('/auth/me');

// Journeys
export const getJourneys = () => api.get('/journeys');
export const getJourney = (id) => api.get(`/journeys/${id}`);
export const createJourney = (data) => api.post('/journeys', data);
export const updateJourney = (id, data) => api.put(`/journeys/${id}`, data);
export const publishJourney = (id) => api.post(`/journeys/${id}/publish`);
export const archiveJourney = (id) => api.post(`/journeys/${id}/archive`);
export const getJourneyVersions = (id) => api.get(`/journeys/${id}/versions`);
export const rollbackJourney = (id, version) => api.post(`/journeys/${id}/rollback/${version}`);

// Tickets
export const getTickets = (params) => api.get('/tickets', { params });
export const getTicket = (id) => api.get(`/tickets/${id}`);
export const createTicket = (data) => api.post('/tickets', data);
export const updateTicket = (id, data) => api.put(`/tickets/${id}`, data);
export const takeTicket = (id) => api.post(`/tickets/${id}/take`);
export const reassignTicket = (id, agentId) => api.post(`/tickets/${id}/reassign`, { agent_id: agentId });
export const getTicketMessages = (id) => api.get(`/tickets/${id}/messages`);
export const addTicketMessage = (id, data) => api.post(`/tickets/${id}/messages`, data);
export const getQueue = () => api.get('/tickets/queue');

// Agents
export const getAgents = () => api.get('/agents');
export const getAgent = (id) => api.get(`/agents/${id}`);
export const createAgent = (data) => api.post('/agents', data);
export const updateAgent = (id, data) => api.put(`/agents/${id}`, data);
export const updateAgentStatus = (id, status) => api.put(`/agents/${id}/status`, { status });
export const getAgentPerformance = (id, params) => api.get(`/agents/${id}/performance`, { params });
export const getAgentsPerformance = () => api.get('/agents/performance');

// Analytics
export const getRealtimeMetrics = () => api.get('/analytics/realtime');
export const getHistoricalAnalytics = (params) => api.get('/analytics/historical', { params });
export const getQueueConfig = () => api.get('/analytics/queue/config');
export const updateQueueConfig = (data) => api.put('/analytics/queue/config', data);

// Upload
export const uploadImages = (files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

export default api;
