import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Containers API
export const dockerApi = {
  // Containers
  getContainers: () => api.get('/containers'),
  startContainer: (id) => api.post(`/containers/${id}/start`),
  stopContainer: (id) => api.post(`/containers/${id}/stop`),
  restartContainer: (id) => api.post(`/containers/${id}/restart`),
  deleteContainer: (id) => api.delete(`/containers/${id}`),
  getContainerLogs: (id) => api.get(`/containers/${id}/logs`),
  
  // Activity Logs
  getActivityLogs: () => api.get('/activity'),
  
  // Images (we'll implement these later)
  getImages: () => api.get('/images'),
  pullImage: (name) => api.post('/images/pull', { name }),
  removeImage: (id) => api.delete(`/images/${id}`),
  
  // Networks
  getNetworks: () => api.get('/networks'),
  
  // Volumes
  getVolumes: () => api.get('/volumes'),
  
  // System
  getInfo: () => api.get('/info'),
  getVersion: () => api.get('/version'),
};