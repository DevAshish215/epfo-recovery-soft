/**
 * Date Utility Functions
 * Centralized date formatting utilities for frontend
 */

/**
 * Format date to Indian locale format (DD/MM/YYYY)
 * Returns '-' if date is invalid or empty
 * @param {string|Date} dateValue - Date to format
 * @returns {string} Formatted date string or '-'
 */
export function formatDate(dateValue) {
  if (!dateValue) {
    return '-';
  }
  try {
    return new Date(dateValue).toLocaleDateString('en-IN');
  } catch (err) {
    return '-';
  }
}

/**
 * Format date to YYYY-MM-DD format (for HTML date inputs)
 * @param {string|Date} dateValue - Date to format
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export function formatDateForInput(dateValue) {
  if (!dateValue) {
    return '';
  }
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (err) {
    return '';
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

