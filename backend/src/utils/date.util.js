/**
 * Date Utility Functions
 * Centralized date formatting utilities
 */

/**
 * Format date to DD-MM-YYYY for remarks
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateForRemark(dateString) {
  if (!dateString) {
    return '';
  }
  
  try {
    // Handle YYYY-MM-DD format (from HTML date input)
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return `${day}-${month}-${year}`;
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // If date is already in DD-MM-YYYY format, return as is
      return dateString;
    }
    
    const formatted = date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return formatted;
  } catch (e) {
    return dateString;
  }
}

/**
 * Format date to DD/MM/YYYY
 * @param {string|Date} dateValue - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(dateValue) {
  if (!dateValue) return '';
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return '';
  }
}

/**
 * Format date to DD MMM YYYY (e.g., "28 Jan 2026")
 * @param {string|Date} dateValue - Date to format
 * @returns {string} Formatted date string
 */
export function formatDateDDMMMYYYY(dateValue) {
  if (!dateValue) return '';
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  try {
    // Handle YYYY-MM-DD format
    if (typeof dateValue === 'string' && dateValue.includes('-')) {
      const dateParts = dateValue.split('-');
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(dateParts[2], 10);
        
        if (month >= 0 && month < 12 && day > 0 && day <= 31) {
          return `${day} ${monthNames[month]} ${year}`;
        }
      }
    }
    
    // Handle Date object or other formats
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      const day = date.getDate();
      const month = date.getMonth();
      const year = date.getFullYear();
      return `${day} ${monthNames[month]} ${year}`;
    }
    
    return '';
  } catch (e) {
    return '';
  }
}

