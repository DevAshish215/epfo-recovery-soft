/**
 * Excel/CSV Parser Service
 * Parses Excel and CSV files and converts to JSON
 * No validation or business logic - just parsing
 */

import XLSX from 'xlsx';

/**
 * Parse Excel or CSV file from buffer
 * @param {Buffer} buffer - File buffer (Excel or CSV)
 * @param {string} originalName - Original filename (optional, for detecting file type)
 * @returns {Array} Array of row objects
 */
export function parseExcelFile(buffer, originalName = '') {
  try {
    // Detect file type from extension or buffer content
    const fileExtension = originalName.toLowerCase().split('.').pop();
    const isCSV = fileExtension === 'csv';

    let workbook;
    
    if (isCSV) {
      // Parse CSV file
      // Convert buffer to string (CSV is text-based)
      const csvString = buffer.toString('utf8');
      
      // Read CSV string
      // XLSX library automatically detects CSV format
      workbook = XLSX.read(csvString, { 
        type: 'string',
        // CSV parsing options
        FS: ',', // Field separator (comma)
        RS: '\n', // Row separator (newline)
        // Handle different line endings
        codepage: 65001, // UTF-8
      });
    } else {
      // Parse Excel file (.xlsx, .xls)
      workbook = XLSX.read(buffer, { type: 'buffer' });
    }

    // Get the first sheet name
    // Excel files can have multiple sheets, CSV has one sheet
    // We only use the first one
    const firstSheetName = workbook.SheetNames[0];

    // Get the first sheet
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert sheet to JSON
    // defval: 0 means blank cells will be converted to 0
    // This gives us an array of objects, where each object is a row
    const rows = XLSX.utils.sheet_to_json(worksheet, { 
      defval: 0, // Convert blank cells to 0
    });

    // Trim header names (column names)
    // Excel/CSV headers might have extra spaces, so we trim them
    const trimmedRows = rows.map(row => {
      const trimmedRow = {};
      
      // Loop through each column in the row
      for (const [key, value] of Object.entries(row)) {
        // Trim the column name (header) to remove extra spaces
        const trimmedKey = key.trim();
        // Keep the value as is
        trimmedRow[trimmedKey] = value;
      }
      
      return trimmedRow;
    });

    // Return the array of rows
    return trimmedRows;

  } catch (error) {
    // If anything goes wrong, throw an error with a clear message
    throw new Error(`Failed to parse file: ${error.message}`);
  }
}

