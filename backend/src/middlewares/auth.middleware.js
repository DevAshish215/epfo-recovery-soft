/**
 * Authentication Middleware
 * Validates JWT tokens and ensures data isolation per username
 */

import { verifyToken } from '../modules/auth/auth.service.js';

/**
 * Authenticate user using JWT token
 * Token should be sent in Authorization header as: Bearer <token>
 * Or in request body/query as: token
 */
export function authenticateUser(req, res, next) {
  try {
    // Get token from Authorization header, request body, or query
    let token = null;

    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // If not in header, check body or query
    if (!token) {
      token = req.body.token || req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Attach user info to request for use in routes
    req.user = {
      id: decoded.id,
      username: decoded.username,
      regional_office_code: decoded.regional_office_code || '',
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed. Please login again.',
    });
  }
}

/**
 * Validate that user can only access their own data
 * Ensures username in request matches authenticated user's username
 */
export function validateUserAccess(req, res, next) {
  const authenticatedUsername = req.user?.username;
  const requestedUsername = req.params.username || req.body.username || req.query.username;

  // If username is provided in request, it must match authenticated user
  if (requestedUsername && authenticatedUsername && requestedUsername !== authenticatedUsername) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own data.',
    });
  }

  // If no username in request, use authenticated user's username
  if (!requestedUsername && authenticatedUsername) {
    req.body.username = authenticatedUsername;
    req.query.username = authenticatedUsername;
  }

  next();
}

