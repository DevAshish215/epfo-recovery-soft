/**
 * Excel Utility Functions
 */

import XLSX from 'xlsx';

/**
 * Read Excel file and return workbook
 */
export function readExcelFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    return workbook;
  } catch (error) {
    throw new Error(`Failed to read Excel file: ${error.message}`);
  }
}

/**
 * Read Excel buffer and return workbook
 */
export function readExcelBuffer(buffer) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    return workbook;
  } catch (error) {
    throw new Error(`Failed to read Excel buffer: ${error.message}`);
  }
}

/**
 * Get first sheet data as JSON
 */
export function getSheetData(workbook, sheetName = null) {
  try {
    const sheet = sheetName 
      ? workbook.Sheets[sheetName] 
      : workbook.Sheets[workbook.SheetNames[0]];
    
    if (!sheet) {
      throw new Error('Sheet not found');
    }

    return XLSX.utils.sheet_to_json(sheet, { defval: null });
  } catch (error) {
    throw new Error(`Failed to parse sheet: ${error.message}`);
  }
}

/**
 * Get all sheet names
 */
export function getSheetNames(workbook) {
  return workbook.SheetNames;
}

/**
 * Validate required columns exist
 */
export function validateColumns(data, requiredColumns) {
  if (!data || data.length === 0) {
    return { valid: false, missingColumns: requiredColumns };
  }

  const firstRow = data[0];
  const existingColumns = Object.keys(firstRow);
  const missingColumns = requiredColumns.filter(
    col => !existingColumns.includes(col)
  );

  return {
    valid: missingColumns.length === 0,
    missingColumns,
    existingColumns,
  };
}

/**
 * Create Excel file from data
 */
export function createExcelFile(data, sheetName = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return workbook;
}

/**
 * Convert workbook to buffer
 */
export function workbookToBuffer(workbook) {
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

