/**
 * Auth Routes
 * Handles user registration and login
 * Returns JWT tokens for authenticated users
 */

import express from 'express';
import { registerUser, loginUser, verifyToken } from './auth.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import User from './auth.model.js';
import logger from '../../utils/logger.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 * Returns JWT token on successful registration
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, regional_office_code } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    // Trim whitespace from username
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username cannot be empty',
      });
    }

    // regional_office_code is optional - can be set later in office details
    const result = await registerUser(trimmedUsername, password, regional_office_code || '');

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error) {
    const statusCode = error.message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Registration failed',
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 * Returns JWT token on successful login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required',
      });
    }

    // Trim whitespace from username
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username cannot be empty',
      });
    }

    const result = await loginUser(trimmedUsername, password);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error) {
    // Log error for debugging
    logger.error('Login error:', error);
    
    // Return appropriate status code based on error type
    const statusCode = error.message && error.message.includes('Invalid') ? 401 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Login failed',
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify JWT token and return user data
 * Used to restore user session on page refresh
 */
router.get('/verify', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // If not in header, check query parameter
    if (!token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token is required',
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Get user data from database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Return user data without password
    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      success: true,
      message: 'Token verified',
      data: {
        user: userObj,
      },
    });
  } catch (error) {
    logger.error('Token verification error:', error);
    
    res.status(401).json({
      success: false,
      message: error.message || 'Token verification failed',
    });
  }
});

export default router;

