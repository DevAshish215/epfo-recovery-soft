/**
 * Notices Helper Functions
 * Shared utility functions for notice generation
 */

/**
 * Format ESTA ADDRESS from RRC/Establishment data
 * Format: "ADD1\nADD2\nCITY\nDISTRICT & STATE - PIN CODE"
 * For existing address, use DISTRICT only (not STATE)
 * Remove duplicate values
 */
export function formatEstaAddress(rrcData, establishmentData) {
  const add1 = (establishmentData?.ADD1 || rrcData?.ADD1 || '').trim();
  const add2 = (establishmentData?.ADD2 || rrcData?.ADD2 || '').trim();
  const city = (establishmentData?.CITY || rrcData?.CITY || '').trim();
  const dist = (establishmentData?.DIST || rrcData?.DIST || '').trim();
  const pinCd = (establishmentData?.PIN_CODE || rrcData?.PIN_CD || '').trim();

  const addressParts = [];
  
  // Add ADD1 if not empty
  if (add1) addressParts.push(add1);
  
  // Add ADD2 only if different from ADD1
  if (add2 && add2 !== add1) addressParts.push(add2);
  
  // Add CITY if not empty
  if (city) addressParts.push(city);
  
  // Format: DISTRICT & STATE - PIN CODE (for existing address, use DISTRICT only)
  const locationPart = [];
  if (dist) {
    // For existing address, use DISTRICT only (no STATE field available)
    locationPart.push(dist);
  }
  if (pinCd) {
    if (locationPart.length > 0) {
      addressParts.push(`${locationPart.join(' & ')} - ${pinCd}`);
    } else {
      addressParts.push(pinCd);
    }
  } else if (locationPart.length > 0) {
    addressParts.push(locationPart.join(' & '));
  }

  return addressParts.join('\n');
}

/**
 * Format number with Indian number format (no decimal places for notices)
 */
export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '0';
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  // Round to nearest integer and format without decimal places
  return Math.round(num).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Convert number to words in Indian format (Lakhs, Crores)
 */
export function numberToWords(value) {
  if (value === null || value === undefined || value === '') return 'Zero Only';
  const num = Math.round(parseFloat(value));
  if (isNaN(num) || num === 0) return 'Zero Only';
  if (num < 0) return 'Negative ' + numberToWords(-num);
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  function convertHundreds(n) {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result.trim();
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result.trim();
  }
  
  let words = '';
  const crore = Math.floor(num / 10000000);
  if (crore > 0) {
    words += convertHundreds(crore) + ' Crore ';
  }
  
  const lakh = Math.floor((num % 10000000) / 100000);
  if (lakh > 0) {
    words += convertHundreds(lakh) + ' Lakh ';
  }
  
  const thousand = Math.floor((num % 100000) / 1000);
  if (thousand > 0) {
    words += convertHundreds(thousand) + ' Thousand ';
  }
  
  const hundred = num % 1000;
  if (hundred > 0) {
    words += convertHundreds(hundred) + ' ';
  }
  
  return words.trim() + ' Only';
}

/**
 * Parse U/S value to determine which sections are present
 * Returns object with has7A, has14B, has7Q flags
 */
export function parseUSValue(usValue) {
  if (!usValue) return { has7A: false, has14B: false, has7Q: false };
  
  const usUpper = String(usValue).toUpperCase();
  return {
    has7A: usUpper.includes('7A'),
    has14B: usUpper.includes('14B'),
    has7Q: usUpper.includes('7Q')
  };
}

/**
 * Determine which template to use based on U/S field
 * Returns template filename
 */
export function getTemplateFileName(usValue) {
  const sections = parseUSValue(usValue);
  
  // If U/S contains only 7A (and not 14B or 7Q), use 7A template
  if (sections.has7A && !sections.has14B && !sections.has7Q) {
    return 'CP-1 Notice 7A.docx';
  }
  
  // If U/S contains 14B and/or 7Q (with or without 7A), use 14B_7Q template
  if (sections.has14B || sections.has7Q) {
    return 'CP-1 Notice 14B_7Q.docx';
  }
  
  // Default to 14B_7Q template if U/S doesn't match above patterns
  return 'CP-1 Notice 14B_7Q.docx';
}

/**
 * Format RRC date to DD-MM-YYYY
 */
export function formatRRCDate(rrcDate) {
  if (!rrcDate) return '';
  try {
    const dateObj = new Date(rrcDate);
    if (!isNaN(dateObj.getTime())) {
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      return `${day}-${month}-${year}`;
    }
    return String(rrcDate);
  } catch (e) {
    return String(rrcDate);
  }
}

