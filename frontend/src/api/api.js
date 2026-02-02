/**
 * API Configuration
 * Handles JWT token storage and automatic token injection in requests
 */

import axios from 'axios';
import logger from '../utils/logger.js';

// Create axios instance
// Use environment variable for production, fallback to relative URL for development
const baseURL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' 
    ? 'https://epfo-recovery-backend.onrender.com/api'  // Production backend URL (from epfo-recovery-soft)
    : '/api');  // Development - uses Vite proxy

const api = axios.create({
  baseURL: baseURL,
  timeout: 60000, // 60s - allows Render free-tier backend to wake from cold start
});

/** Timeout for large file uploads (e.g. 20k+ rows) - 10 minutes */
export const UPLOAD_TIMEOUT_MS = 600000;

// Token storage key
const TOKEN_KEY = 'epfo_recovery_token';

/**
 * Get token from localStorage
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Save token to localStorage
 */
export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Remove token from localStorage (logout)
 */
export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Add token to all requests automatically
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      // Add token to Authorization header
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized) - token expired or invalid
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If token is invalid or expired, remove it and redirect to login
    if (error.response && error.response.status === 401) {
      removeToken();
      // You can redirect to login page here if needed
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

logger.debug('API Base URL configured:', baseURL);

export default api;

