// src/lib/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// === UPDATED dockerApi WITH NEW ENDPOINTS ===
export const dockerApi = {
  // Containers
  getContainers: () => api.get('/containers'),
  startContainer: (id) => api.post(`/containers/${id}/start`),
  stopContainer: (id) => api.post(`/containers/${id}/stop`),
  restartContainer: (id) => api.post(`/containers/${id}/restart`),
  deleteContainer: (id) => api.delete(`/containers/${id}`),
  createContainer: (data) => api.post('/containers/create', data), // NEW

  // Images
  getImages: () => api.get('/images'),
  pullImage: (data) => api.post('/images/pull', data),
  deleteImage: (id) => api.delete(`/images/${id}`),
  inspectImage: (id) => api.get(`/images/${id}/inspect`),
  getImageHistory: (id) => api.get(`/images/${id}/history`),
  pruneImages: () => api.post('/images/prune'),
  
  // Networks - NEW
  getNetworks: () => api.get('/networks'),
  createNetwork: (data) => api.post('/networks', data),
  deleteNetwork: (id) => api.delete(`/networks/${id}`),

  // Volumes - NEW
  getVolumes: () => api.get('/volumes'),
  createVolume: (data) => api.post('/volumes', data),
  deleteVolume: (name) => api.delete(`/volumes/${name}`),

  // Activity
  getActivityLogs: () => api.get('/activity'),
};