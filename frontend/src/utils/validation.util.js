/**
 * Validation Utility Functions
 * Form validation helpers
 */

/**
 * Validate password and confirm password match
 * @param {string} password - Password
 * @param {string} confirmPassword - Confirm password
 * @returns {Object} Object with isValid flag and error message
 */
export function validatePasswords(password, confirmPassword) {
  if (!password || password.length === 0) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  
  return { isValid: true, error: '' };
}

/**
 * Validate ESTA code format
 * @param {string} estaCode - ESTA code to validate
 * @param {string} roCode - Regional office code (for prefix validation)
 * @returns {Object} Object with isValid flag and error message
 */
export function validateEstaCode(estaCode, roCode) {
  if (!estaCode || estaCode.trim() === '') {
    return { isValid: false, error: 'ESTA code is required' };
  }
  
  if (roCode && !estaCode.startsWith(roCode)) {
    return { isValid: false, error: `ESTA code must start with RO code: ${roCode}` };
  }
  
  return { isValid: true, error: '' };
}

/**
 * Validate required field
 * @param {any} value - Field value
 * @param {string} fieldName - Name of the field (for error message)
 * @returns {Object} Object with isValid flag and error message
 */
export function validateRequired(value, fieldName) {
  if (value === null || value === undefined || value === '' || 
      (typeof value === 'string' && value.trim() === '')) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  return { isValid: true, error: '' };
}

/**
 * Validate number field
 * @param {any} value - Field value
 * @param {string} fieldName - Name of the field
 * @param {boolean} allowZero - Whether zero is allowed
 * @returns {Object} Object with isValid flag and error message
 */
export function validateNumber(value, fieldName, allowZero = true) {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const num = parseFloat(value);
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }
  
  if (!allowZero && num === 0) {
    return { isValid: false, error: `${fieldName} must be greater than zero` };
  }
  
  return { isValid: true, error: '' };
}

