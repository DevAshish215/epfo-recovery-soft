/**
 * Frontend Logger Utility
 * Provides structured logging for the frontend application
 */

const isDevelopment = import.meta.env.MODE === 'development';

const logger = {
  /**
   * Log info message
   * @param {string} message - Message to log
   * @param {any} [data] - Optional data to log
   */
  info(message, data) {
    if (data !== undefined) {
      console.log(`[INFO] ${message}`, data);
    } else {
      console.log(`[INFO] ${message}`);
    }
  },

  /**
   * Log warning message
   * @param {string} message - Message to log
   * @param {any} [data] - Optional data to log
   */
  warn(message, data) {
    if (data !== undefined) {
      console.warn(`[WARN] ${message}`, data);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },

  /**
   * Log error message
   * @param {string} message - Message to log
   * @param {Error|any} [error] - Optional error object or data
   */
  error(message, error) {
    if (error) {
      if (error instanceof Error) {
        console.error(`[ERROR] ${message}`, error.message);
        if (isDevelopment && error.stack) {
          console.error(`[ERROR] Stack:`, error.stack);
        }
      } else {
        console.error(`[ERROR] ${message}`, error);
      }
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },

  /**
   * Log debug message (only in development)
   * @param {string} message - Message to log
   * @param {any} [data] - Optional data to log
   */
  debug(message, data) {
    if (isDevelopment) {
      if (data !== undefined) {
        console.log(`[DEBUG] ${message}`, data);
      } else {
        console.log(`[DEBUG] ${message}`);
      }
    }
  },
};

export default logger;

