/**
 * Auth Service
 * Business logic for user registration and login
 * Uses bcrypt for password hashing and JWT for authentication
 */

import User from './auth.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../../config/env.js';
import logger from '../../utils/logger.js';

/**
 * Validate password strength
 * Password must be at least 6 characters long
 */
function validatePassword(password) {
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
  return true;
}

/**
 * Validate username
 * Username must be at least 3 characters long and contain only alphanumeric characters
 */
function validateUsername(username) {
  if (!username || username.length < 3) {
    throw new Error('Username must be at least 3 characters long');
  }
  // Allow alphanumeric and underscore
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error('Username can only contain letters, numbers, and underscores');
  }
  return true;
}

/**
 * Generate JWT token for user
 */
function generateToken(user) {
  if (!user || !user._id || !user.username) {
    throw new Error('Invalid user object for token generation');
  }

  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  const payload = {
    id: user._id,
    username: user.username,
    regional_office_code: user.regional_office_code || '',
  };

  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (error) {
    logger.error('JWT sign error:', error);
    throw new Error('Failed to generate authentication token');
  }
}

/**
 * Register a new user
 * regional_office_code is optional and can be set later in office details
 * Password is hashed before saving
 */
async function registerUser(username, password, regional_office_code = '') {
  try {
    // Validate username and password
    validateUsername(username);
    validatePassword(password);

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Hash password with bcrypt (10 rounds)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      username,
      password: hashedPassword,
      regional_office_code: regional_office_code || '',
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    // Return user data without password
    const userObj = user.toObject();
    delete userObj.password;

    return {
      user: userObj,
      token,
    };
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Username already exists');
    }
    if (error.name === 'ValidationError') {
      throw new Error(`Validation error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Login user
 * Compares password with hashed password in database
 * Returns JWT token on successful login
 */
async function loginUser(username, password) {
  try {
    // Find user by username
    const user = await User.findOne({ username });

    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Check if user has a password (should always have one, but safety check)
    if (!user.password) {
      throw new Error('User account error. Please contact administrator.');
    }

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    // Generate JWT token
    let token;
    try {
      token = generateToken(user);
    } catch (tokenError) {
      logger.error('Token generation error:', tokenError);
      throw new Error('Authentication token generation failed');
    }

    // Return user data without password
    const userObj = user.toObject();
    delete userObj.password;

    return {
      user: userObj,
      token,
    };
  } catch (error) {
    // Re-throw known errors
    if (error.message.includes('Invalid') || error.message.includes('error')) {
      throw error;
    }
    // Wrap unexpected errors
    logger.error('Login service error:', error);
    throw new Error('Login failed. Please try again.');
  }
}

/**
 * Verify JWT token and return user data
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired. Please login again.');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token. Please login again.');
    }
    throw new Error('Token verification failed');
  }
}

export { registerUser, loginUser, verifyToken };

