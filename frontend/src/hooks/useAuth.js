/**
 * useAuth Hook
 * Handles authentication logic and token management
 */

import { useState, useEffect } from 'react';
import api, { setToken, removeToken, getToken } from '../api/api.js';
import logger from '../utils/logger.js';
import { extractErrorMessage } from '../utils/error.util.js';
import { validatePasswords } from '../utils/validation.util.js';

export function useAuth() {
  const [showRegister, setShowRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // Check if user is already logged in (has valid token) on page load/refresh
  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (token && !loggedIn) {
        try {
          // Verify token with backend and get user data
          const response = await api.get('/auth/verify', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.data.success && response.data.data && response.data.data.user) {
            // Restore user session
            setUser(response.data.data.user);
            setLoggedIn(true);
          } else {
            // Invalid response, remove token
            removeToken();
          }
        } catch (err) {
          // Token is invalid or expired, remove it
          logger.error('Token verification failed:', err);
          removeToken();
        }
      }
    };

    checkAuth();
  }, []); // Only run on mount

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate passwords
    const passwordValidation = validatePasswords(password, confirmPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error);
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/register', {
        username: username.trim(),
        password,
      });

      if (response.data.success) {
        // Save token to localStorage
        if (response.data.data && response.data.data.token) {
          setToken(response.data.data.token);
        }
        setSuccess('Registration successful! You can now login.');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setShowRegister(false);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        username: username.trim(),
        password,
      });

      if (response.data.success) {
        // Save token to localStorage
        if (response.data.data && response.data.data.token) {
          setToken(response.data.data.token);
        }
        
        // Set user data
        if (response.data.data && response.data.data.user) {
          setUser(response.data.data.user);
          setLoggedIn(true);
        } else {
          setUser(response.data.data);
          setLoggedIn(true);
        }
        
        setSuccess('Login successful!');
        setUsername('');
        setPassword('');
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Remove token from localStorage
    removeToken();
    setLoggedIn(false);
    setUser(null);
    setSuccess('');
    setError('');
  };

  return {
    // State
    showRegister,
    username,
    password,
    confirmPassword,
    error,
    success,
    loading,
    loggedIn,
    user,
    // Setters
    setShowRegister,
    setUsername,
    setPassword,
    setConfirmPassword,
    setError,
    setSuccess,
    // Handlers
    handleRegister,
    handleLogin,
    handleLogout,
  };
}


