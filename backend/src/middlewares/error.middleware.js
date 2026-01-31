/**
 * Error Handling Middleware
 * Handles all errors in the application
 * This middleware catches any errors that occur in routes or other middleware
 */

import logger from '../utils/logger.js';

/**
 * Global error handler
 * This function is called automatically by Express when an error occurs
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function (not used here, but required by Express)
 */
function errorHandler(err, req, res, next) {
  // Log the error message for debugging
  logger.error('Error:', err);

  // Get status code from error, or use 500 (Internal Server Error) as default
  // Status codes: 400 = Bad Request, 401 = Unauthorized, 404 = Not Found, 500 = Server Error
  const statusCode = err.statusCode || 500;

  // Prepare error response object
  // This is what we send back to the client (frontend)
  const errorResponse = {
    success: false,
    message: err.message || 'Internal Server Error',
  };

  // Only include stack trace in development mode (not in production)
  // Stack trace shows where the error occurred in the code
  // This helps developers debug but doesn't expose sensitive info to users
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  // Send error response to client with the appropriate status code
  res.status(statusCode).json(errorResponse);
}

export default errorHandler;

