/**
 * Error Utility Functions
 * Centralized error message extraction from API responses
 */

/**
 * Extract error message from API error response
 * @param {Error} err - Error object from API call
 * @param {string} defaultMessage - Default message if error can't be extracted
 * @returns {string} Error message to display
 */
export function extractErrorMessage(err, defaultMessage = 'An error occurred') {
  if (err.response && err.response.data) {
    if (err.response.data.message) {
      return err.response.data.message;
    }
    if (err.response.data.error) {
      return err.response.data.error;
    }
  }

  // Timeout - large file uploads can take several minutes
  if (err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'))) {
    return 'Request timed out. Large Excel files can take several minutes to process. Please try again.';
  }

  // Network / CORS - user-friendly message for deployed app
  if (err.code === 'ERR_NETWORK' || (err.message && err.message.includes('Network Error'))) {
    return 'Cannot reach server. If you just opened the app, wait up to a minute and try again (server may be waking up).';
  }

  if (err.message) {
    return err.message;
  }

  return defaultMessage;
}

/**
 * Extract error message with missing columns information (for Excel upload errors)
 * @param {Error} err - Error object from API call
 * @param {string} defaultMessage - Default message if error can't be extracted
 * @returns {Object} Object with message and missingColumns array
 */
export function extractUploadError(err, defaultMessage = 'Upload failed') {
  let errorMessage = extractErrorMessage(err, defaultMessage);
  let missingColumns = null;

  if (err?.response?.data?.errors?.missingColumns) {
    missingColumns = err.response.data.errors.missingColumns;
    errorMessage = `${errorMessage}. Missing columns: ${missingColumns.join(', ')}`;
  }

  return { errorMessage, missingColumns };
}

