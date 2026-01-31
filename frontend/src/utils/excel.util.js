/**
 * Excel Utility Functions
 * Centralized Excel export and download utilities
 */

import * as XLSX from 'xlsx';
import { formatNumber } from './number.util.js';
import { formatDate } from './date.util.js';

/**
 * Download a file from a blob response
 * @param {Blob} blob - Blob data to download
 * @param {string} filename - Filename for the download
 */
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Export data array to Excel file
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} sheetName - Name of the Excel sheet
 * @param {string} filename - Filename for the downloaded file
 */
export function exportToExcel(data, sheetName = 'Data', filename) {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // If filename doesn't include extension, add .xlsx
    const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    
    XLSX.writeFile(wb, finalFilename);
    return { success: true, count: data.length };
  } catch (error) {
    throw new Error(`Failed to export to Excel: ${error.message}`);
  }
}

/**
 * Generate filename with date suffix
 * @param {string} baseName - Base name for the file
 * @param {Array<string>} suffixes - Optional suffixes to add
 * @returns {string} Generated filename with .xlsx extension
 */
export function generateExcelFilename(baseName, suffixes = []) {
  let filename = baseName;
  
  // Add suffixes if provided
  if (suffixes.length > 0) {
    filename += `_${suffixes.join('_')}`;
  }
  
  // Add date
  const dateStr = new Date().toISOString().split('T')[0];
  filename += `_${dateStr}.xlsx`;
  
  return filename;
}

// Re-export utility functions for convenience
export { formatNumber, formatDate };

