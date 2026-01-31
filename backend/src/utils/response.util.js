/**
 * Response Utility
 * Standardized API response formatting
 */

/**
 * Success response
 */
export function successResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Error response
 */
export function errorResponse(message, errors = null, statusCode = 400) {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return { response, statusCode };
}

/**
 * Validation error response
 */
export function validationErrorResponse(missingColumns = [], templateLink = null) {
  const response = {
    success: false,
    message: 'Excel file validation failed',
    errors: {
      missingColumns,
    },
  };

  if (templateLink) {
    response.errors.templateLink = templateLink;
  }

  return { response, statusCode: 400 };
}

