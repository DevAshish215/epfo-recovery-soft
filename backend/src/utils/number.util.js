/**
 * Number Utility Functions
 * Centralized number conversion and formatting utilities
 */

/**
 * Convert a value to a number, defaulting to 0 for invalid values
 * @param {any} value - Value to convert
 * @returns {number} Converted number or 0
 */
export function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const num = parseFloat(value);
  if (isNaN(num)) {
    return 0;
  }
  return num;
}

/**
 * Format number with Indian number format (no decimal places)
 * @param {any} value - Value to format
 * @returns {string} Formatted number string
 */
export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '0';
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  // Round to nearest integer and format without decimal places
  return Math.round(num).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

