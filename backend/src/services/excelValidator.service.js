/**
 * Excel Validator Service
 * Validates Excel file structure and data
 * Rejects entire file if ANY validation error
 * 
 * This service checks:
 * 1. File is not empty
 * 2. All required columns exist
 * 3. No required fields are empty in any row
 */

/**
 * Validate Excel file
 * @param {Array} excelRows - Array of row objects from Excel (each object is a row)
 * @param {Array} requiredColumns - Array of required column names (must exist in file)
 * @param {Array} optionalColumns - Array of optional column names (for reference, not used in validation)
 * @returns {Object} Validation result with valid (true/false) and error message if invalid
 */
export function validateExcel(excelRows, requiredColumns, optionalColumns = []) {
  // Step 1: Check if Excel file has any data
  if (!excelRows || excelRows.length === 0) {
    return {
      valid: false,
      missingColumns: requiredColumns,
      message: 'Excel file is empty',
    };
  }

  // Step 2: Get column names from first row (header row)
  // The first row contains the column names
  const firstRow = excelRows[0];
  const existingColumns = Object.keys(firstRow);

  // Step 3: Check if all required columns exist in the header
  // Column names must match exactly (case-sensitive)
  const missingColumns = [];
  
  for (let i = 0; i < requiredColumns.length; i++) {
    const requiredColumn = requiredColumns[i];
    if (!existingColumns.includes(requiredColumn)) {
      missingColumns.push(requiredColumn);
    }
  }

  // If any required columns are missing, return error
  if (missingColumns.length > 0) {
    return {
      valid: false,
      missingColumns: missingColumns,
      message: `Missing required columns: ${missingColumns.join(', ')}`,
    };
  }

  // Step 4: Validate that no required field is empty in any row
  // We check each row to make sure all required fields have values
  for (let i = 0; i < excelRows.length; i++) {
    const row = excelRows[i];
    // Excel row number (row 1 is header, so data starts at row 2)
    const rowNumber = i + 2;

    // Check each required column in this row
    for (let j = 0; j < requiredColumns.length; j++) {
      const column = requiredColumns[j];
      const value = row[column];
      
      // Check if value is empty, null, undefined, or only whitespace
      let isEmpty = false;
      
      if (value === null || value === undefined || value === '') {
        isEmpty = true;
      } else if (typeof value === 'string' && value.trim() === '') {
        isEmpty = true;
      }
      
      // If field is empty, return error
      if (isEmpty) {
        return {
          valid: false,
          missingColumns: [],
          message: `Row ${rowNumber}: Required field "${column}" is empty`,
        };
      }
    }
  }

  // Step 5: All validations passed - file is valid
  return {
    valid: true,
  };
}

