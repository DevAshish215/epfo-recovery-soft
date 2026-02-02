/**
 * RRC Service
 * Business logic for RRC operations
 * No Express logic - pure business logic only
 */

import RRC from './rrc.model.js';
import { parseExcelFile } from '../../services/excelParser.service.js';
import { validateExcel } from '../../services/excelValidator.service.js';
import {
  calculateDemand,
  calculateRecovery,
  calculateOutstanding,
  calculateRecoveryCost,
  calculateRrcTotals,
} from '../../services/financeCalculator.service.js';
import logger from '../../utils/logger.js';

/**
 * Map Excel column names (with spaces) to model field names (with underscores)
 */
/**
 * Map Excel row data to database model format
 * This function converts Excel column names (with spaces) to database field names (with underscores)
 * Also handles date conversion from Excel format to JavaScript Date
 * @param {Object} excelRow - One row from the Excel file
 * @returns {Object} Mapped data ready for database
 */
function mapExcelToModel(excelRow) {
  // Parse date - Excel dates can be numbers or date strings
  // Excel stores dates as numbers (serial dates) or as text strings
  let rrcDate = excelRow['RRC DATE'] || excelRow['RRC_DATE'];
  
  if (rrcDate) {
    // If it's a number, it's an Excel serial date
    // Excel serial dates count days since January 1, 1900
    if (typeof rrcDate === 'number') {
      // Excel epoch is December 30, 1899 (Excel's starting point)
      const excelEpoch = new Date(1899, 11, 30);
      // Convert days to milliseconds (86400000 ms = 1 day)
      const milliseconds = rrcDate * 86400000;
      // Create JavaScript Date object
      rrcDate = new Date(excelEpoch.getTime() + milliseconds);
    } else if (typeof rrcDate === 'string') {
      // If it's a string, try to parse it as a date
      rrcDate = new Date(rrcDate);
      // Check if the date is valid
      if (isNaN(rrcDate.getTime())) {
        // Invalid date - set to null
        rrcDate = null;
      }
    }
  }

  // Helper function to safely get number from Excel row
  function getNumber(value, defaultValue = 0) {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
      return defaultValue;
    }
    return num;
  }

  // Helper function to parse date from Excel
  function parseDate(value) {
    if (!value || value === null || value === undefined || value === '') {
      return null;
    }
    // If it's a number, it's an Excel serial date
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const milliseconds = value * 86400000;
      return new Date(excelEpoch.getTime() + milliseconds);
    }
    // If it's a string, try to parse it
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return null;
  }

  return {
    ESTA_CODE: excelRow['ESTA CODE'] || excelRow['ESTA_CODE'],
    IR_NIR: excelRow['IR NIR'] || excelRow['IR_NIR'],
    ESTA_NAME: excelRow['ESTA NAME'] || excelRow['ESTA_NAME'],
    RRC_NO: excelRow['RRC NO'] || excelRow['RRC_NO'],
    RRC_DATE: rrcDate,
    RRC_PERIOD: excelRow['RRC PERIOD'] || excelRow['RRC_PERIOD'] || excelRow['PERIOD'],
    U_S: excelRow['U/S'] || excelRow['U_S'] || excelRow['US'],
    
    // Address & Contact Fields
    RO: excelRow['RO'] || excelRow['RO'],
    ADD1: excelRow['ADD1'] || excelRow['ADD1'],
    ADD2: excelRow['ADD2'] || excelRow['ADD2'],
    CITY: excelRow['CITY'] || excelRow['CITY'],
    DIST: excelRow['DIST'] || excelRow['DISTRICT'] || excelRow['DIST'],
    PIN_CD: excelRow['PIN Cd'] || excelRow['PIN_CD'] || excelRow['PIN CD'] || excelRow['PINCD'],
    CIRCLE: excelRow['CIRCLE'] || excelRow['CIRCLE'],
    MOBILE_NO: excelRow['MOBILE NO'] || excelRow['MOBILE_NO'] || excelRow['MOBILE NO'] || excelRow['MOBILENO'],
    EMAIL: excelRow['EMAIL'] || excelRow['EMAIL'],
    STATUS: excelRow['STATUS'] || excelRow['STATUS'],
    ESTA_PAN: excelRow['ESTA PAN'] || excelRow['ESTA_PAN'] || excelRow['ESTA PAN'] || excelRow['PAN'],
    
    // Date Fields
    CP_1_DATE: parseDate(excelRow['CP-1 DATE'] || excelRow['CP_1_DATE'] || excelRow['CP-1_DATE'] || excelRow['CP1 DATE']),
    
    // Other Fields
    REMARKS: excelRow['REMARKS'] || excelRow['REMARKS'],
    ENFORCEMENT_OFFICER: excelRow['Enforcement Officer'] || excelRow['ENFORCEMENT_OFFICER'] || excelRow['ENFORCEMENT OFFICER'] || excelRow['EnforcementOfficer'],
    
    // Section-level demand (may be provided or computed from accounts)
    DEMAND_7A: getNumber(excelRow['DEMAND 7A'] || excelRow['DEMAND_7A']),
    DEMAND_14B: getNumber(excelRow['DEMAND 14B'] || excelRow['DEMAND_14B']),
    DEMAND_7Q: getNumber(excelRow['DEMAND 7Q'] || excelRow['DEMAND_7Q']),
    
    // Account-wise demand for 7A
    DEMAND_7A_ACCOUNT_1_EE: getNumber(excelRow['DEMAND_7A_AC1_EE'] || excelRow['DEMAND 7A A/C 1_EE'] || excelRow['DEMAND_7A_ACCOUNT_1_EE']),
    DEMAND_7A_ACCOUNT_1_ER: getNumber(excelRow['DEMAND_7A_AC1_ER'] || excelRow['DEMAND 7A A/C 1_ER'] || excelRow['DEMAND_7A_ACCOUNT_1_ER']),
    DEMAND_7A_ACCOUNT_2: getNumber(excelRow['DEMAND_7A_AC2'] || excelRow['DEMAND 7A A/C 2'] || excelRow['DEMAND_7A_ACCOUNT_2']),
    DEMAND_7A_ACCOUNT_10: getNumber(excelRow['DEMAND_7A_AC10'] || excelRow['DEMAND 7A A/C 10'] || excelRow['DEMAND_7A_ACCOUNT_10']),
    DEMAND_7A_ACCOUNT_21: getNumber(excelRow['DEMAND_7A_AC21'] || excelRow['DEMAND 7A A/C 21'] || excelRow['DEMAND_7A_ACCOUNT_21']),
    DEMAND_7A_ACCOUNT_22: getNumber(excelRow['DEMAND_7A_AC22'] || excelRow['DEMAND 7A A/C 22'] || excelRow['DEMAND_7A_ACCOUNT_22']),
    
    // Account-wise demand for 14B
    DEMAND_14B_ACCOUNT_1: getNumber(excelRow['DEMAND_14B_AC1'] || excelRow['DEMAND 14B A/C 1'] || excelRow['DEMAND_14B_ACCOUNT_1']),
    DEMAND_14B_ACCOUNT_2: getNumber(excelRow['DEMAND_14B_AC2'] || excelRow['DEMAND 14B A/C 2'] || excelRow['DEMAND_14B_ACCOUNT_2']),
    DEMAND_14B_ACCOUNT_10: getNumber(excelRow['DEMAND_14B_AC10'] || excelRow['DEMAND 14B A/C 10'] || excelRow['DEMAND_14B_ACCOUNT_10']),
    DEMAND_14B_ACCOUNT_21: getNumber(excelRow['DEMAND_14B_AC21'] || excelRow['DEMAND 14B A/C 21'] || excelRow['DEMAND_14B_ACCOUNT_21']),
    DEMAND_14B_ACCOUNT_22: getNumber(excelRow['DEMAND_14B_AC22'] || excelRow['DEMAND 14B A/C 22'] || excelRow['DEMAND_14B_ACCOUNT_22']),
    
    // Account-wise demand for 7Q
    DEMAND_7Q_ACCOUNT_1: getNumber(excelRow['DEMAND_7Q_AC1'] || excelRow['DEMAND 7Q A/C 1'] || excelRow['DEMAND_7Q_ACCOUNT_1']),
    DEMAND_7Q_ACCOUNT_2: getNumber(excelRow['DEMAND_7Q_AC2'] || excelRow['DEMAND 7Q A/C 2'] || excelRow['DEMAND_7Q_ACCOUNT_2']),
    DEMAND_7Q_ACCOUNT_10: getNumber(excelRow['DEMAND_7Q_AC10'] || excelRow['DEMAND 7Q A/C 10'] || excelRow['DEMAND_7Q_ACCOUNT_10']),
    DEMAND_7Q_ACCOUNT_21: getNumber(excelRow['DEMAND_7Q_AC21'] || excelRow['DEMAND 7Q A/C 21'] || excelRow['DEMAND_7Q_ACCOUNT_21']),
    DEMAND_7Q_ACCOUNT_22: getNumber(excelRow['DEMAND_7Q_AC22'] || excelRow['DEMAND 7Q A/C 22'] || excelRow['DEMAND_7Q_ACCOUNT_22']),
    
    // Section-level recovery (may be provided or computed from accounts)
    RECOVERY_7A: getNumber(excelRow['RECOVERY 7A'] || excelRow['RECOVERY_7A']),
    RECOVERY_14B: getNumber(excelRow['RECOVERY 14B'] || excelRow['RECOVERY_14B']),
    RECOVERY_7Q: getNumber(excelRow['RECOVERY 7Q'] || excelRow['RECOVERY_7Q']),
    
    // Account-wise recovery for 7A
    RECOVERY_7A_ACCOUNT_1_EE: getNumber(excelRow['RECOVERY_7A_AC1_EE'] || excelRow['RECOVERY 7A A/C 1_EE'] || excelRow['RECOVERY_7A_ACCOUNT_1_EE']),
    RECOVERY_7A_ACCOUNT_1_ER: getNumber(excelRow['RECOVERY_7A_AC1_ER'] || excelRow['RECOVERY 7A A/C 1_ER'] || excelRow['RECOVERY_7A_ACCOUNT_1_ER']),
    RECOVERY_7A_ACCOUNT_2: getNumber(excelRow['RECOVERY_7A_AC2'] || excelRow['RECOVERY 7A A/C 2'] || excelRow['RECOVERY_7A_ACCOUNT_2']),
    RECOVERY_7A_ACCOUNT_10: getNumber(excelRow['RECOVERY_7A_AC10'] || excelRow['RECOVERY 7A A/C 10'] || excelRow['RECOVERY_7A_ACCOUNT_10']),
    RECOVERY_7A_ACCOUNT_21: getNumber(excelRow['RECOVERY_7A_AC21'] || excelRow['RECOVERY 7A A/C 21'] || excelRow['RECOVERY_7A_ACCOUNT_21']),
    RECOVERY_7A_ACCOUNT_22: getNumber(excelRow['RECOVERY_7A_AC22'] || excelRow['RECOVERY 7A A/C 22'] || excelRow['RECOVERY_7A_ACCOUNT_22']),
    
    // Account-wise recovery for 14B
    RECOVERY_14B_ACCOUNT_1: getNumber(excelRow['RECOVERY_14B_AC1'] || excelRow['RECOVERY 14B A/C 1'] || excelRow['RECOVERY_14B_ACCOUNT_1']),
    RECOVERY_14B_ACCOUNT_2: getNumber(excelRow['RECOVERY_14B_AC2'] || excelRow['RECOVERY 14B A/C 2'] || excelRow['RECOVERY_14B_ACCOUNT_2']),
    RECOVERY_14B_ACCOUNT_10: getNumber(excelRow['RECOVERY_14B_AC10'] || excelRow['RECOVERY 14B A/C 10'] || excelRow['RECOVERY_14B_ACCOUNT_10']),
    RECOVERY_14B_ACCOUNT_21: getNumber(excelRow['RECOVERY_14B_AC21'] || excelRow['RECOVERY 14B A/C 21'] || excelRow['RECOVERY_14B_ACCOUNT_21']),
    RECOVERY_14B_ACCOUNT_22: getNumber(excelRow['RECOVERY_14B_AC22'] || excelRow['RECOVERY 14B A/C 22'] || excelRow['RECOVERY_14B_ACCOUNT_22']),
    
    // Account-wise recovery for 7Q
    RECOVERY_7Q_ACCOUNT_1: getNumber(excelRow['RECOVERY_7Q_AC1'] || excelRow['RECOVERY 7Q A/C 1'] || excelRow['RECOVERY_7Q_ACCOUNT_1']),
    RECOVERY_7Q_ACCOUNT_2: getNumber(excelRow['RECOVERY_7Q_AC2'] || excelRow['RECOVERY 7Q A/C 2'] || excelRow['RECOVERY_7Q_ACCOUNT_2']),
    RECOVERY_7Q_ACCOUNT_10: getNumber(excelRow['RECOVERY_7Q_AC10'] || excelRow['RECOVERY 7Q A/C 10'] || excelRow['RECOVERY_7Q_ACCOUNT_10']),
    RECOVERY_7Q_ACCOUNT_21: getNumber(excelRow['RECOVERY_7Q_AC21'] || excelRow['RECOVERY 7Q A/C 21'] || excelRow['RECOVERY_7Q_ACCOUNT_21']),
    RECOVERY_7Q_ACCOUNT_22: getNumber(excelRow['RECOVERY_7Q_AC22'] || excelRow['RECOVERY 7Q A/C 22'] || excelRow['RECOVERY_7Q_ACCOUNT_22']),
    
    // ESTA-level fields (default to 0, can be edited later)
    RECOVERY_COST: getNumber(excelRow['RECOVERY_COST'] || excelRow['RECOVERY COST']),
    RECEVIED_REC_COST: getNumber(excelRow['RECEVIED_REC_COST'] || excelRow['RECEVIED REC COST']),
    
    RACK_LOCATION: excelRow['RACK LOCATION'] || excelRow['RACK_LOCATION'] || excelRow['FILE LOCATION'] || excelRow['FILE_LOCATION'],
  };
}

/**
 * Upload and process RRC Excel file
 * @param {Buffer} fileBuffer - Excel file buffer
 * @param {string} username - Username for data isolation
 * @param {string} regionalOfficeCode - Regional office code
 * @returns {Object} Result with saved records count
 */
export async function uploadRRCExcel(fileBuffer, username, regionalOfficeCode, originalName = '') {
  // 1. Parse Excel or CSV file
  const excelRows = parseExcelFile(fileBuffer, originalName);

  // 2. Validate columns
  const requiredColumns = [
    'ESTA CODE',
    'ESTA NAME',
    'RRC NO',
    'RRC DATE',
  ];

  const optionalColumns = [
    'IR NIR',
    'RRC PERIOD',
    'PERIOD',
    'U/S',
    'U_S',
    'US',
    'RACK LOCATION',
    'RACK_LOCATION',
    'FILE LOCATION',
    'FILE_LOCATION',
    // Section-level fields
    'DEMAND 7A',
    'DEMAND 14B',
    'DEMAND 7Q',
    'RECOVERY 7A',
    'RECOVERY 14B',
    'RECOVERY 7Q',
    // Account-wise demand for 7A
    'DEMAND_7A_AC1_EE',
    'DEMAND 7A A/C 1_EE',
    'DEMAND_7A_AC1_ER',
    'DEMAND 7A A/C 1_ER',
    'DEMAND_7A_AC2',
    'DEMAND 7A A/C 2',
    'DEMAND_7A_AC10',
    'DEMAND 7A A/C 10',
    'DEMAND_7A_AC21',
    'DEMAND 7A A/C 21',
    'DEMAND_7A_AC22',
    'DEMAND 7A A/C 22',
    // Account-wise demand for 14B
    'DEMAND_14B_AC1',
    'DEMAND 14B A/C 1',
    'DEMAND_14B_AC2',
    'DEMAND 14B A/C 2',
    'DEMAND_14B_AC10',
    'DEMAND 14B A/C 10',
    'DEMAND_14B_AC21',
    'DEMAND 14B A/C 21',
    'DEMAND_14B_AC22',
    'DEMAND 14B A/C 22',
    // Account-wise demand for 7Q
    'DEMAND_7Q_AC1',
    'DEMAND 7Q A/C 1',
    'DEMAND_7Q_AC2',
    'DEMAND 7Q A/C 2',
    'DEMAND_7Q_AC10',
    'DEMAND 7Q A/C 10',
    'DEMAND_7Q_AC21',
    'DEMAND 7Q A/C 21',
    'DEMAND_7Q_AC22',
    'DEMAND 7Q A/C 22',
    // Account-wise recovery for 7A
    'RECOVERY_7A_AC1_EE',
    'RECOVERY 7A A/C 1_EE',
    'RECOVERY_7A_AC1_ER',
    'RECOVERY 7A A/C 1_ER',
    'RECOVERY_7A_AC2',
    'RECOVERY 7A A/C 2',
    'RECOVERY_7A_AC10',
    'RECOVERY 7A A/C 10',
    'RECOVERY_7A_AC21',
    'RECOVERY 7A A/C 21',
    'RECOVERY_7A_AC22',
    'RECOVERY 7A A/C 22',
    // Account-wise recovery for 14B
    'RECOVERY_14B_AC1',
    'RECOVERY 14B A/C 1',
    'RECOVERY_14B_AC2',
    'RECOVERY 14B A/C 2',
    'RECOVERY_14B_AC10',
    'RECOVERY 14B A/C 10',
    'RECOVERY_14B_AC21',
    'RECOVERY 14B A/C 21',
    'RECOVERY_14B_AC22',
    'RECOVERY 14B A/C 22',
    // Account-wise recovery for 7Q
    'RECOVERY_7Q_AC1',
    'RECOVERY 7Q A/C 1',
    'RECOVERY_7Q_AC2',
    'RECOVERY 7Q A/C 2',
    'RECOVERY_7Q_AC10',
    'RECOVERY 7Q A/C 10',
    'RECOVERY_7Q_AC21',
    'RECOVERY 7Q A/C 21',
    'RECOVERY_7Q_AC22',
    'RECOVERY 7Q A/C 22',
    // ESTA-level fields
    'RECOVERY_COST',
    'RECOVERY COST',
    'RECEVIED_REC_COST',
    'RECEVIED REC COST',
    'RACK LOCATION',
  ];

  const validation = validateExcel(excelRows, requiredColumns, optionalColumns);

  // 3. Reject file if validation error
  if (!validation.valid) {
    throw {
      type: 'VALIDATION_ERROR',
      missingColumns: validation.missingColumns || [],
      message: validation.message,
    };
  }

  // 4. Map Excel data to model format and save only base fields
  const baseRecords = excelRows.map(excelRow => {
    return mapExcelToModel(excelRow);
  });

  // 5. Compute all finance values for each record
  const recordsWithFinance = baseRecords.map(record => {
    // Convert to Excel format (with spaces) for calculator functions
    // Include all account-wise fields
    const excelFormat = {
      // Section-level (may be provided or computed)
      'DEMAND 7A': record.DEMAND_7A,
      'DEMAND 14B': record.DEMAND_14B,
      'DEMAND 7Q': record.DEMAND_7Q,
      'RECOVERY 7A': record.RECOVERY_7A,
      'RECOVERY 14B': record.RECOVERY_14B,
      'RECOVERY 7Q': record.RECOVERY_7Q,
      // Account-wise demand for 7A
      'DEMAND_7A_ACCOUNT_1_EE': record.DEMAND_7A_ACCOUNT_1_EE,
      'DEMAND_7A_ACCOUNT_1_ER': record.DEMAND_7A_ACCOUNT_1_ER,
      'DEMAND_7A_ACCOUNT_2': record.DEMAND_7A_ACCOUNT_2,
      'DEMAND_7A_ACCOUNT_10': record.DEMAND_7A_ACCOUNT_10,
      'DEMAND_7A_ACCOUNT_21': record.DEMAND_7A_ACCOUNT_21,
      'DEMAND_7A_ACCOUNT_22': record.DEMAND_7A_ACCOUNT_22,
      // Account-wise demand for 14B
      'DEMAND_14B_ACCOUNT_1': record.DEMAND_14B_ACCOUNT_1,
      'DEMAND_14B_ACCOUNT_2': record.DEMAND_14B_ACCOUNT_2,
      'DEMAND_14B_ACCOUNT_10': record.DEMAND_14B_ACCOUNT_10,
      'DEMAND_14B_ACCOUNT_21': record.DEMAND_14B_ACCOUNT_21,
      'DEMAND_14B_ACCOUNT_22': record.DEMAND_14B_ACCOUNT_22,
      // Account-wise demand for 7Q
      'DEMAND_7Q_ACCOUNT_1': record.DEMAND_7Q_ACCOUNT_1,
      'DEMAND_7Q_ACCOUNT_2': record.DEMAND_7Q_ACCOUNT_2,
      'DEMAND_7Q_ACCOUNT_10': record.DEMAND_7Q_ACCOUNT_10,
      'DEMAND_7Q_ACCOUNT_21': record.DEMAND_7Q_ACCOUNT_21,
      'DEMAND_7Q_ACCOUNT_22': record.DEMAND_7Q_ACCOUNT_22,
      // Account-wise recovery for 7A
      'RECOVERY_7A_ACCOUNT_1_EE': record.RECOVERY_7A_ACCOUNT_1_EE,
      'RECOVERY_7A_ACCOUNT_1_ER': record.RECOVERY_7A_ACCOUNT_1_ER,
      'RECOVERY_7A_ACCOUNT_2': record.RECOVERY_7A_ACCOUNT_2,
      'RECOVERY_7A_ACCOUNT_10': record.RECOVERY_7A_ACCOUNT_10,
      'RECOVERY_7A_ACCOUNT_21': record.RECOVERY_7A_ACCOUNT_21,
      'RECOVERY_7A_ACCOUNT_22': record.RECOVERY_7A_ACCOUNT_22,
      // Account-wise recovery for 14B
      'RECOVERY_14B_ACCOUNT_1': record.RECOVERY_14B_ACCOUNT_1,
      'RECOVERY_14B_ACCOUNT_2': record.RECOVERY_14B_ACCOUNT_2,
      'RECOVERY_14B_ACCOUNT_10': record.RECOVERY_14B_ACCOUNT_10,
      'RECOVERY_14B_ACCOUNT_21': record.RECOVERY_14B_ACCOUNT_21,
      'RECOVERY_14B_ACCOUNT_22': record.RECOVERY_14B_ACCOUNT_22,
      // Account-wise recovery for 7Q
      'RECOVERY_7Q_ACCOUNT_1': record.RECOVERY_7Q_ACCOUNT_1,
      'RECOVERY_7Q_ACCOUNT_2': record.RECOVERY_7Q_ACCOUNT_2,
      'RECOVERY_7Q_ACCOUNT_10': record.RECOVERY_7Q_ACCOUNT_10,
      'RECOVERY_7Q_ACCOUNT_21': record.RECOVERY_7Q_ACCOUNT_21,
      'RECOVERY_7Q_ACCOUNT_22': record.RECOVERY_7Q_ACCOUNT_22,
      // ESTA-level fields
      'RECOVERY COST': record.RECOVERY_COST || 0,
      'RECEVIED REC COST': record.RECEVIED_REC_COST || 0,
    };

    // Calculate demand (computes section totals from accounts if needed)
    const demandResult = calculateDemand(excelFormat);

    // Calculate recovery (computes section totals from accounts if needed)
    const recoveryResult = calculateRecovery(excelFormat);

    // Calculate outstanding (account-wise and section-wise)
    const outstanding = calculateOutstanding(excelFormat, excelFormat);

    // Calculate recovery cost (needs OUTSTAND TOTAL)
    const recoveryCostData = calculateRecoveryCost({
      ...excelFormat,
      'OUTSTAND TOTAL': outstanding['OUTSTAND TOTAL'],
    });

    // Convert back to model format (with underscores)
    return {
      ...record,
      // Section totals (computed from accounts if section totals not provided)
      DEMAND_7A: demandResult['DEMAND 7A'],
      DEMAND_14B: demandResult['DEMAND 14B'],
      DEMAND_7Q: demandResult['DEMAND 7Q'],
      DEMAND_TOTAL: demandResult['DEMAND TOTAL'],
      RECOVERY_7A: recoveryResult['RECOVERY 7A'],
      RECOVERY_14B: recoveryResult['RECOVERY 14B'],
      RECOVERY_7Q: recoveryResult['RECOVERY 7Q'],
      RECOVERY_TOTAL: recoveryResult['RECOVERY TOTAL'],
      // Section-wise outstanding
      OUTSTAND_7A: outstanding['OUTSTAND 7A'],
      OUTSTAND_14B: outstanding['OUTSTAND 14B'],
      OUTSTAND_7Q: outstanding['OUTSTAND 7Q'],
      OUTSTAND_TOTAL: outstanding['OUTSTAND TOTAL'],
      // Account-wise outstanding
      OUTSTAND_7A_ACCOUNT_1_EE: outstanding['OUTSTAND_7A_ACCOUNT_1_EE'],
      OUTSTAND_7A_ACCOUNT_1_ER: outstanding['OUTSTAND_7A_ACCOUNT_1_ER'],
      OUTSTAND_7A_ACCOUNT_2: outstanding['OUTSTAND_7A_ACCOUNT_2'],
      OUTSTAND_7A_ACCOUNT_10: outstanding['OUTSTAND_7A_ACCOUNT_10'],
      OUTSTAND_7A_ACCOUNT_21: outstanding['OUTSTAND_7A_ACCOUNT_21'],
      OUTSTAND_7A_ACCOUNT_22: outstanding['OUTSTAND_7A_ACCOUNT_22'],
      OUTSTAND_14B_ACCOUNT_1: outstanding['OUTSTAND_14B_ACCOUNT_1'],
      OUTSTAND_14B_ACCOUNT_2: outstanding['OUTSTAND_14B_ACCOUNT_2'],
      OUTSTAND_14B_ACCOUNT_10: outstanding['OUTSTAND_14B_ACCOUNT_10'],
      OUTSTAND_14B_ACCOUNT_21: outstanding['OUTSTAND_14B_ACCOUNT_21'],
      OUTSTAND_14B_ACCOUNT_22: outstanding['OUTSTAND_14B_ACCOUNT_22'],
      OUTSTAND_7Q_ACCOUNT_1: outstanding['OUTSTAND_7Q_ACCOUNT_1'],
      OUTSTAND_7Q_ACCOUNT_2: outstanding['OUTSTAND_7Q_ACCOUNT_2'],
      OUTSTAND_7Q_ACCOUNT_10: outstanding['OUTSTAND_7Q_ACCOUNT_10'],
      OUTSTAND_7Q_ACCOUNT_21: outstanding['OUTSTAND_7Q_ACCOUNT_21'],
      OUTSTAND_7Q_ACCOUNT_22: outstanding['OUTSTAND_7Q_ACCOUNT_22'],
      // ESTA-level fields
      OUTSTAND_REC_COST: recoveryCostData['OUTSTAND REC COST'],
      OUTSTAND_TOT_WITH_REC: recoveryCostData['OUTSTAND TOT WITH REC'],
    };
  });

  // 6. Compute RRC-level totals (grouped by ESTA_CODE)
  // Convert to Excel format for calculator
  const recordsForTotals = recordsWithFinance.map(record => ({
    'ESTA CODE': record.ESTA_CODE,
    'DEMAND TOTAL': record.DEMAND_TOTAL,
    'RECOVERY TOTAL': record.RECOVERY_TOTAL,
    'OUTSTAND TOTAL': record.OUTSTAND_TOTAL,
    'OUTSTAND REC COST': record.OUTSTAND_REC_COST,
    'OUTSTAND TOT WITH REC': record.OUTSTAND_TOT_WITH_REC,
  }));
  const rrcTotals = calculateRrcTotals(recordsForTotals);

  // 7. Apply RRC totals to records and attach regional_office_code
  const finalRecords = recordsWithFinance.map(record => {
    const estaCode = record.ESTA_CODE;
    const totals = rrcTotals[estaCode] || {};

    return {
      ...record,
      DEMAND_TOTAL_RRC: totals['DEMAND TOTAL RRC'] || 0,
      RECOVERY_TOTAL_RRC: totals['RECOVERY TOTAL RRC'] || 0,
      OUTSTAND_TOTAL_RRC: totals['OUTSTAND TOTAL RRC'] || 0,
      OUTSTAND_TOT_WITH_REC_RRC: totals['OUTSTAND TOT WITH REC RRC'] || 0,
      regional_office_code: regionalOfficeCode,
    };
  });

  // 8. Save all records (one RRC_NO = one document per user)
  // For ESTA-level fields, preserve existing values if they exist
  const savedRecords = [];
  for (const record of finalRecords) {
    const rrcNo = record.RRC_NO;
    const estaCode = record.ESTA_CODE;

    // Check if there's an existing RRC with same ESTA_CODE that has ESTA-level fields
    const existingEstaRrc = await RRC.findOne({
      username: username,
      ESTA_CODE: estaCode,
    });

    // If existing RRC found, preserve its ESTA-level fields
    if (existingEstaRrc) {
      ESTA_LEVEL_FIELDS.forEach(field => {
        // Only preserve if existing value is not empty/null and new value is empty/null
        if ((existingEstaRrc[field] !== undefined && existingEstaRrc[field] !== null && existingEstaRrc[field] !== '') &&
            (record[field] === undefined || record[field] === null || record[field] === '')) {
          record[field] = existingEstaRrc[field];
        }
      });
    }

    // Upsert: Update if exists, create if new
    // Data isolation by username
    const saved = await RRC.findOneAndUpdate(
      {
        username: username,
        RRC_NO: rrcNo,
      },
      record,
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    savedRecords.push(saved);
  }
  
  // 8a. Sync ESTA-level fields across all RRCs with same ESTA_CODE
  const uniqueEstaCodes = [...new Set(finalRecords.map(r => r.ESTA_CODE))];
  for (const estaCode of uniqueEstaCodes) {
    // Get all RRCs with this ESTA_CODE
    const estaRrcs = await RRC.find({
      username: username,
      ESTA_CODE: estaCode,
    });
    
    if (estaRrcs.length > 0) {
      // Find the RRC with the most complete ESTA-level data (most non-empty fields)
      let bestRrc = estaRrcs[0];
      let maxFields = 0;
      
      for (const rrc of estaRrcs) {
        let fieldCount = 0;
        ESTA_LEVEL_FIELDS.forEach(field => {
          if (rrc[field] !== undefined && rrc[field] !== null && rrc[field] !== '') {
            fieldCount++;
          }
        });
        if (fieldCount > maxFields) {
          maxFields = fieldCount;
          bestRrc = rrc;
        }
      }
      
      // Extract ESTA-level fields from best RRC
      const estaLevelData = {};
      ESTA_LEVEL_FIELDS.forEach(field => {
        if (bestRrc[field] !== undefined && bestRrc[field] !== null && bestRrc[field] !== '') {
          estaLevelData[field] = bestRrc[field];
        }
      });
      
      // Sync to all RRCs with same ESTA_CODE
      if (Object.keys(estaLevelData).length > 0) {
        await RRC.updateMany(
          {
            username: username,
            ESTA_CODE: estaCode,
          },
          {
            $set: estaLevelData,
          }
        );
      }
    }
    
    // Update RRC totals for this ESTA_CODE
    await updateRRCTotalsForEstaCode(estaCode, username);
  }

  // Auto-sync establishment data to RRC after upload
  try {
    await syncEstablishmentDataToRRC(username);
  } catch (syncError) {
    // Log error but don't fail the upload
    logger.warn('Warning: Failed to sync establishment data to RRC:', syncError.message);
  }

  return {
    recordsProcessed: savedRecords.length,
    records: savedRecords,
  };
}

/**
 * Update RRC totals for all RRCs with same ESTA_CODE (per user)
 */
async function updateRRCTotalsForEstaCode(estaCode, username) {
  const rrcs = await RRC.find({
    username: username,
    ESTA_CODE: estaCode,
  });

  const totals = {
    DEMAND_TOTAL_RRC: rrcs.reduce((sum, r) => sum + (r.DEMAND_TOTAL || 0), 0),
    RECOVERY_TOTAL_RRC: rrcs.reduce((sum, r) => sum + (r.RECOVERY_TOTAL || 0), 0),
    OUTSTAND_TOTAL_RRC: rrcs.reduce((sum, r) => sum + (r.OUTSTAND_TOTAL || 0), 0),
    OUTSTAND_TOT_WITH_REC_RRC: rrcs.reduce((sum, r) => sum + (r.OUTSTAND_TOT_WITH_REC || 0), 0),
  };

  // Update all RRCs with same ESTA_CODE (per user)
  await RRC.updateMany(
    {
      username: username,
      ESTA_CODE: estaCode,
    },
    {
      $set: totals,
    }
  );
}

/**
 * Get all RRCs for a user
 */
export async function getRRCsByUsername(username, includeDeleted = false) {
  const query = { username: username };
  
  // Exclude deleted records by default
  // Use $ne: true to match records where isDeleted is false, null, or doesn't exist
  // This handles existing records that were created before the isDeleted field was added
  if (!includeDeleted) {
    query.isDeleted = { $ne: true };
  }
  
  return await RRC.find(query)
    .sort({ OUTSTAND_TOT_WITH_REC_RRC: -1 });
}

/**
 * Get RRC by ID (with username check for data isolation)
 */
export async function getRRCById(id, username) {
  const rrc = await RRC.findOne({ _id: id, username: username });
  if (!rrc) {
    throw new Error('RRC not found or access denied');
  }
  return rrc;
}

/**
 * Fields that are unique per ESTA_CODE (same for all RRCs with same ESTA_CODE)
 */
const ESTA_LEVEL_FIELDS = [
  'RO', 'ADD1', 'ADD2', 'CITY', 'DIST', 'PIN_CD', 'CIRCLE',
  'MOBILE_NO', 'EMAIL', 'STATUS', 'ESTA_PAN',
  'CP_1_DATE',
  'REMARKS', 'ENFORCEMENT_OFFICER',
  'RECOVERY_COST', 'RECEVIED_REC_COST', // Also ESTA-level
];

/**
 * Update RRC record
 * Recalculates all financial fields after update
 * If ESTA-level fields are updated, updates all RRCs with same ESTA_CODE
 */
export async function updateRRC(id, username, updateData) {
  // Get existing RRC
  const rrc = await getRRCById(id, username);
  const estaCode = rrc.ESTA_CODE;
  
  // Separate ESTA-level fields from RRC-specific fields
  const estaLevelUpdates = {};
  const rrcLevelUpdates = {};
  
  // Update fields (exclude computed fields and internal fields)
  const excludedFields = ['_id', '__v', 'username', 'regional_office_code', 
    'DEMAND_TOTAL', 'RECOVERY_TOTAL', 'OUTSTAND_7A', 'OUTSTAND_14B', 'OUTSTAND_7Q', 
    'OUTSTAND_TOTAL', 'OUTSTAND_REC_COST', 'OUTSTAND_TOT_WITH_REC',
    'DEMAND_TOTAL_RRC', 'RECOVERY_TOTAL_RRC', 'OUTSTAND_TOTAL_RRC',
    'OUTSTAND_TOT_WITH_REC_RRC'];
  
  // Separate updates into ESTA-level and RRC-level
  Object.keys(updateData).forEach(key => {
    if (!excludedFields.includes(key)) {
      if (ESTA_LEVEL_FIELDS.includes(key)) {
        estaLevelUpdates[key] = updateData[key];
      } else {
        rrcLevelUpdates[key] = updateData[key];
      }
    }
  });
  
  // Update RRC-specific fields on this RRC
  Object.keys(rrcLevelUpdates).forEach(key => {
    rrc[key] = rrcLevelUpdates[key];
  });
  
  // Update ESTA-level fields on this RRC (will be synced to all RRCs with same ESTA_CODE)
  // REMARKS from PUT (form save): always replace with payload value so edits (including delete) are saved.
  // Appending is only done via POST /rrc/:id/remark (updateRemarksForEstaCode).
  Object.keys(estaLevelUpdates).forEach(key => {
    const v = estaLevelUpdates[key];
    rrc[key] = v === undefined ? rrc[key] : (v === null && key === 'REMARKS' ? '' : v);
  });
  
  // Recalculate financial fields using financeCalculator
  const rrcForCalc = {
    'DEMAND 7A': rrc.DEMAND_7A || 0,
    'DEMAND 14B': rrc.DEMAND_14B || 0,
    'DEMAND 7Q': rrc.DEMAND_7Q || 0,
    'RECOVERY 7A': rrc.RECOVERY_7A || 0,
    'RECOVERY 14B': rrc.RECOVERY_14B || 0,
    'RECOVERY 7Q': rrc.RECOVERY_7Q || 0,
    'RECOVERY COST': rrc.RECOVERY_COST || 0,
    'RECEVIED REC COST': rrc.RECEVIED_REC_COST || 0,
  };
  
  // Calculate section totals from account-wise components
  const demandForCalc = {
    'DEMAND 7A A/C 1_EE': rrc.DEMAND_7A_ACCOUNT_1_EE || 0,
    'DEMAND 7A A/C 1_ER': rrc.DEMAND_7A_ACCOUNT_1_ER || 0,
    'DEMAND 7A A/C 2': rrc.DEMAND_7A_ACCOUNT_2 || 0,
    'DEMAND 7A A/C 10': rrc.DEMAND_7A_ACCOUNT_10 || 0,
    'DEMAND 7A A/C 21': rrc.DEMAND_7A_ACCOUNT_21 || 0,
    'DEMAND 7A A/C 22': rrc.DEMAND_7A_ACCOUNT_22 || 0,
    'DEMAND 14B A/C 1': rrc.DEMAND_14B_ACCOUNT_1 || 0,
    'DEMAND 14B A/C 2': rrc.DEMAND_14B_ACCOUNT_2 || 0,
    'DEMAND 14B A/C 10': rrc.DEMAND_14B_ACCOUNT_10 || 0,
    'DEMAND 14B A/C 21': rrc.DEMAND_14B_ACCOUNT_21 || 0,
    'DEMAND 14B A/C 22': rrc.DEMAND_14B_ACCOUNT_22 || 0,
    'DEMAND 7Q A/C 1': rrc.DEMAND_7Q_ACCOUNT_1 || 0,
    'DEMAND 7Q A/C 2': rrc.DEMAND_7Q_ACCOUNT_2 || 0,
    'DEMAND 7Q A/C 10': rrc.DEMAND_7Q_ACCOUNT_10 || 0,
    'DEMAND 7Q A/C 21': rrc.DEMAND_7Q_ACCOUNT_21 || 0,
    'DEMAND 7Q A/C 22': rrc.DEMAND_7Q_ACCOUNT_22 || 0,
  };
  
  const recoveryForCalc = {
    'RECOVERY 7A A/C 1_EE': rrc.RECOVERY_7A_ACCOUNT_1_EE || 0,
    'RECOVERY 7A A/C 1_ER': rrc.RECOVERY_7A_ACCOUNT_1_ER || 0,
    'RECOVERY 7A A/C 2': rrc.RECOVERY_7A_ACCOUNT_2 || 0,
    'RECOVERY 7A A/C 10': rrc.RECOVERY_7A_ACCOUNT_10 || 0,
    'RECOVERY 7A A/C 21': rrc.RECOVERY_7A_ACCOUNT_21 || 0,
    'RECOVERY 7A A/C 22': rrc.RECOVERY_7A_ACCOUNT_22 || 0,
    'RECOVERY 14B A/C 1': rrc.RECOVERY_14B_ACCOUNT_1 || 0,
    'RECOVERY 14B A/C 2': rrc.RECOVERY_14B_ACCOUNT_2 || 0,
    'RECOVERY 14B A/C 10': rrc.RECOVERY_14B_ACCOUNT_10 || 0,
    'RECOVERY 14B A/C 21': rrc.RECOVERY_14B_ACCOUNT_21 || 0,
    'RECOVERY 14B A/C 22': rrc.RECOVERY_14B_ACCOUNT_22 || 0,
    'RECOVERY 7Q A/C 1': rrc.RECOVERY_7Q_ACCOUNT_1 || 0,
    'RECOVERY 7Q A/C 2': rrc.RECOVERY_7Q_ACCOUNT_2 || 0,
    'RECOVERY 7Q A/C 10': rrc.RECOVERY_7Q_ACCOUNT_10 || 0,
    'RECOVERY 7Q A/C 21': rrc.RECOVERY_7Q_ACCOUNT_21 || 0,
    'RECOVERY 7Q A/C 22': rrc.RECOVERY_7Q_ACCOUNT_22 || 0,
  };
  
  // Recalculate section totals from account components
  const calculatedDemand = calculateDemand(demandForCalc);
  const calculatedRecovery = calculateRecovery(recoveryForCalc);
  
  // Update section totals
  rrc.DEMAND_7A = calculatedDemand['DEMAND 7A'] || 0;
  rrc.DEMAND_14B = calculatedDemand['DEMAND 14B'] || 0;
  rrc.DEMAND_7Q = calculatedDemand['DEMAND 7Q'] || 0;
  rrc.DEMAND_TOTAL = calculatedDemand['DEMAND TOTAL'] || 0;
  
  rrc.RECOVERY_7A = calculatedRecovery['RECOVERY 7A'] || 0;
  rrc.RECOVERY_14B = calculatedRecovery['RECOVERY 14B'] || 0;
  rrc.RECOVERY_7Q = calculatedRecovery['RECOVERY 7Q'] || 0;
  rrc.RECOVERY_TOTAL = calculatedRecovery['RECOVERY TOTAL'] || 0;
  
  // Calculate outstanding (using account-wise demand and recovery)
  const calculatedOutstanding = calculateOutstanding(demandForCalc, recoveryForCalc);
  
  // Update outstanding fields (section totals)
  rrc.OUTSTAND_7A = calculatedOutstanding['OUTSTAND 7A'] || 0;
  rrc.OUTSTAND_14B = calculatedOutstanding['OUTSTAND 14B'] || 0;
  rrc.OUTSTAND_7Q = calculatedOutstanding['OUTSTAND 7Q'] || 0;
  rrc.OUTSTAND_TOTAL = calculatedOutstanding['OUTSTAND TOTAL'] || 0;
  
  // Update account-wise outstanding (using correct keys with underscores)
  rrc.OUTSTAND_7A_ACCOUNT_1_EE = calculatedOutstanding['OUTSTAND_7A_ACCOUNT_1_EE'] || 0;
  rrc.OUTSTAND_7A_ACCOUNT_1_ER = calculatedOutstanding['OUTSTAND_7A_ACCOUNT_1_ER'] || 0;
  rrc.OUTSTAND_7A_ACCOUNT_2 = calculatedOutstanding['OUTSTAND_7A_ACCOUNT_2'] || 0;
  rrc.OUTSTAND_7A_ACCOUNT_10 = calculatedOutstanding['OUTSTAND_7A_ACCOUNT_10'] || 0;
  rrc.OUTSTAND_7A_ACCOUNT_21 = calculatedOutstanding['OUTSTAND_7A_ACCOUNT_21'] || 0;
  rrc.OUTSTAND_7A_ACCOUNT_22 = calculatedOutstanding['OUTSTAND_7A_ACCOUNT_22'] || 0;
  rrc.OUTSTAND_14B_ACCOUNT_1 = calculatedOutstanding['OUTSTAND_14B_ACCOUNT_1'] || 0;
  rrc.OUTSTAND_14B_ACCOUNT_2 = calculatedOutstanding['OUTSTAND_14B_ACCOUNT_2'] || 0;
  rrc.OUTSTAND_14B_ACCOUNT_10 = calculatedOutstanding['OUTSTAND_14B_ACCOUNT_10'] || 0;
  rrc.OUTSTAND_14B_ACCOUNT_21 = calculatedOutstanding['OUTSTAND_14B_ACCOUNT_21'] || 0;
  rrc.OUTSTAND_14B_ACCOUNT_22 = calculatedOutstanding['OUTSTAND_14B_ACCOUNT_22'] || 0;
  rrc.OUTSTAND_7Q_ACCOUNT_1 = calculatedOutstanding['OUTSTAND_7Q_ACCOUNT_1'] || 0;
  rrc.OUTSTAND_7Q_ACCOUNT_2 = calculatedOutstanding['OUTSTAND_7Q_ACCOUNT_2'] || 0;
  rrc.OUTSTAND_7Q_ACCOUNT_10 = calculatedOutstanding['OUTSTAND_7Q_ACCOUNT_10'] || 0;
  rrc.OUTSTAND_7Q_ACCOUNT_21 = calculatedOutstanding['OUTSTAND_7Q_ACCOUNT_21'] || 0;
  rrc.OUTSTAND_7Q_ACCOUNT_22 = calculatedOutstanding['OUTSTAND_7Q_ACCOUNT_22'] || 0;
  
  // Calculate recovery cost fields
  const rrcForCostCalc = {
    'RECOVERY COST': rrc.RECOVERY_COST || 0,
    'RECEVIED REC COST': rrc.RECEVIED_REC_COST || 0,
    'OUTSTAND TOTAL': rrc.OUTSTAND_TOTAL || 0,
  };
  const calculatedCost = calculateRecoveryCost(rrcForCostCalc);
  rrc.OUTSTAND_REC_COST = calculatedCost['OUTSTAND REC COST'] || 0;
  rrc.OUTSTAND_TOT_WITH_REC = calculatedCost['OUTSTAND TOT WITH REC'] || 0;
  
  // Save the updated RRC
  await rrc.save();
  
  // If ESTA-level fields were updated, sync them to all RRCs with same ESTA_CODE
  if (Object.keys(estaLevelUpdates).length > 0) {
    await RRC.updateMany(
      {
        username: username,
        ESTA_CODE: estaCode,
        _id: { $ne: id }, // Exclude the current RRC (already updated)
      },
      {
        $set: estaLevelUpdates,
      }
    );
  }
  
  // Recalculate RRC totals for this ESTA_CODE
  await updateRRCTotalsForEstaCode(estaCode, username);
  
  return rrc;
}

/**
 * Soft delete RRC record (move to trash)
 */
export async function deleteRRC(id, username) {
  // Get existing RRC to get ESTA_CODE for recalculation
  const rrc = await getRRCById(id, username);
  
  // Check if already deleted
  if (rrc.isDeleted) {
    throw new Error('RRC is already in trash');
  }
  
  const estaCode = rrc.ESTA_CODE;
  
  // Soft delete: mark as deleted instead of removing
  await RRC.updateOne(
    { _id: id, username: username },
    { 
      $set: { 
        isDeleted: true,
        deletedAt: new Date()
      }
    }
  );
  
  // Recalculate RRC totals for this ESTA_CODE after deletion
  await updateRRCTotalsForEstaCode(estaCode, username);
  
  return { success: true };
}

/**
 * Get deleted RRCs (trash) for user
 */
export async function getTrashRRCsByUsername(username) {
  return await RRC.find({ 
    username: username,
    isDeleted: true 
  })
    .sort({ deletedAt: -1 }); // Most recently deleted first
}

/**
 * Restore RRC from trash
 */
export async function restoreRRC(id, username) {
  // Get existing RRC
  const rrc = await RRC.findOne({ _id: id, username: username });
  
  if (!rrc) {
    throw new Error('RRC not found or access denied');
  }
  
  if (!rrc.isDeleted) {
    throw new Error('RRC is not in trash');
  }
  
  const estaCode = rrc.ESTA_CODE;
  
  // Restore: unmark as deleted
  await RRC.updateOne(
    { _id: id, username: username },
    { 
      $set: { 
        isDeleted: false,
        deletedAt: null
      }
    }
  );
  
  // Recalculate RRC totals for this ESTA_CODE after restoration
  await updateRRCTotalsForEstaCode(estaCode, username);
  
  return { success: true };
}

/**
 * Permanently delete RRC from trash
 */
export async function permanentDeleteRRC(id, username) {
  // Get existing RRC to get ESTA_CODE for recalculation
  const rrc = await RRC.findOne({ _id: id, username: username });
  
  if (!rrc) {
    throw new Error('RRC not found or access denied');
  }
  
  if (!rrc.isDeleted) {
    throw new Error('RRC is not in trash. Use regular delete first.');
  }
  
  const estaCode = rrc.ESTA_CODE;
  
  // Permanently delete the RRC
  await RRC.deleteOne({ _id: id, username: username });
  
  // Recalculate RRC totals for this ESTA_CODE after permanent deletion
  await updateRRCTotalsForEstaCode(estaCode, username);
  
  return { success: true };
}

/**
 * Permanently delete all RRC records in trash for user
 */
export async function permanentDeleteAllTrashRRC(username) {
  const result = await RRC.deleteMany({
    username: username,
    isDeleted: true,
  });
  return { count: result.deletedCount };
}

/**
 * Clear all RRC data for user (soft delete - move all to trash)
 */
export async function clearAllRRC(username) {
  const result = await RRC.updateMany(
    { username: username, isDeleted: { $ne: true } },
    { $set: { isDeleted: true, deletedAt: new Date() } }
  );
  return { count: result.modifiedCount };
}

/**
 * Get unique PIN codes for a user
 */
/**
 * Update REMARKS field for all RRCs with same ESTA_CODE
 * Appends new remark to existing remarks (if any)
 */
export async function updateRemarksForEstaCode(username, estaCode, newRemark, prefix = '') {
  try {
    logger.debug('updateRemarksForEstaCode called:', { username, estaCode, newRemark, prefix });
    
    if (!username || !estaCode || !newRemark || !newRemark.trim()) {
      logger.debug('updateRemarksForEstaCode: Missing required parameters, returning early');
      return;
    }

    // Find all RRCs with this ESTA_CODE
    const rrcs = await RRC.find({ 
      username, 
      ESTA_CODE: estaCode,
      isDeleted: { $ne: true }
    });

    logger.debug(`updateRemarksForEstaCode: Found ${rrcs.length} RRCs for ESTA_CODE: ${estaCode}`);

    if (rrcs.length === 0) {
      logger.debug('updateRemarksForEstaCode: No RRCs found, returning early');
      return;
    }

    // Format the remark with prefix and timestamp (only if prefix is provided)
    let formattedRemark = newRemark.trim();
    
    if (prefix && prefix.trim()) {
      const timestamp = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      formattedRemark = `[${prefix} - ${timestamp}] ${newRemark.trim()}`;
    }

    // Update all RRCs with same ESTA_CODE
    let updatedCount = 0;
    for (const rrc of rrcs) {
      const existingRemarks = rrc.REMARKS || '';
      const updatedRemarks = existingRemarks.trim()
        ? `${existingRemarks}\n${formattedRemark}`
        : formattedRemark;

      const result = await RRC.updateOne(
        { _id: rrc._id },
        { $set: { REMARKS: updatedRemarks } }
      );
      
      if (result.modifiedCount > 0) {
        updatedCount++;
        logger.debug(`updateRemarksForEstaCode: Updated RRC ${rrc._id}, REMARKS: ${updatedRemarks.substring(0, 100)}...`);
      }
    }
    
    logger.debug(`updateRemarksForEstaCode: Successfully updated ${updatedCount} out of ${rrcs.length} RRCs`);
  } catch (error) {
    logger.error('Error updating remarks:', error);
    throw error;
  }
}

export async function getUniquePinCodes(username) {
  try {
    const pinCodes = await RRC.distinct('PIN_CD', {
      username,
      isDeleted: { $ne: true },
      PIN_CD: { $exists: true, $ne: null, $ne: '' }
    });
    
    // Filter out empty/null values and sort
    const uniquePins = pinCodes
      .filter(pin => pin && String(pin).trim() !== '')
      .map(pin => String(pin).trim())
      .sort();
    
    return uniquePins;
  } catch (error) {
    throw new Error(`Failed to get PIN codes: ${error.message}`);
  }
}

/**
 * Update enforcement officer for all RRCs with a specific PIN code
 */
export async function updateEnforcementOfficerByPinCode(username, pinCode, enforcementOfficer) {
  try {
    const result = await RRC.updateMany(
      { 
        username,
        PIN_CD: pinCode,
        isDeleted: { $ne: true }
      },
      { 
        $set: { 
          ENFORCEMENT_OFFICER: enforcementOfficer || '' 
        } 
      }
    );

    return {
      modifiedCount: result.modifiedCount,
      pinCode: pinCode,
      enforcementOfficer: enforcementOfficer || ''
    };
  } catch (error) {
    throw new Error(`Failed to update enforcement officer: ${error.message}`);
  }
}

/**
 * Sync establishment data to RRC data based on ESTA_CODE
 * Maps: ADD1, ADD2, CITY, DIST, PIN_CD, CIRCLE, MOBILE_NO, EMAIL, STATUS, ESTA_PAN
 */
export async function syncEstablishmentDataToRRC(username) {
  try {
    // Import Establishment model dynamically to avoid circular dependency
    const Establishment = (await import('../establishment/establishment.model.js')).default;
    
    // Get all establishments for this user
    const establishments = await Establishment.find({ username }).lean();
    
    if (!establishments || establishments.length === 0) {
      return { synced: 0, message: 'No establishment data found' };
    }
    
    let totalSynced = 0;
    
    // For each establishment, update all RRCs with matching ESTA_CODE
    for (const establishment of establishments) {
      const estaCode = establishment.ESTA_CODE;
      if (!estaCode) continue;
      
      // Prepare update data from establishment
      const updateData = {};
      
      // Map establishment fields to RRC fields
      if (establishment.ADD1 !== undefined && establishment.ADD1 !== null) {
        updateData.ADD1 = establishment.ADD1;
      }
      if (establishment.ADD2 !== undefined && establishment.ADD2 !== null) {
        updateData.ADD2 = establishment.ADD2;
      }
      if (establishment.CITY !== undefined && establishment.CITY !== null) {
        updateData.CITY = establishment.CITY;
      }
      if (establishment.DIST !== undefined && establishment.DIST !== null) {
        updateData.DIST = establishment.DIST;
      }
      if (establishment.PIN_CODE !== undefined && establishment.PIN_CODE !== null) {
        updateData.PIN_CD = establishment.PIN_CODE; // PIN_CODE in establishment maps to PIN_CD in RRC
      }
      if (establishment.CIRCLE !== undefined && establishment.CIRCLE !== null) {
        updateData.CIRCLE = establishment.CIRCLE;
      }
      if (establishment.MOBILE_NO !== undefined && establishment.MOBILE_NO !== null) {
        updateData.MOBILE_NO = establishment.MOBILE_NO;
      }
      if (establishment.EMAIL !== undefined && establishment.EMAIL !== null) {
        updateData.EMAIL = establishment.EMAIL;
      }
      if (establishment.STATUS !== undefined && establishment.STATUS !== null) {
        updateData.STATUS = establishment.STATUS;
      }
      if (establishment.ESTABLISHMENT_PAN !== undefined && establishment.ESTABLISHMENT_PAN !== null) {
        updateData.ESTA_PAN = establishment.ESTABLISHMENT_PAN; // ESTABLISHMENT_PAN in establishment maps to ESTA_PAN in RRC
      }
      
      // Only update if there's data to update
      if (Object.keys(updateData).length > 0) {
        const result = await RRC.updateMany(
          { 
            username,
            ESTA_CODE: estaCode,
            isDeleted: { $ne: true }
          },
          { 
            $set: updateData
          }
        );
        
        totalSynced += result.modifiedCount;
      }
    }
    
    return {
      synced: totalSynced,
      message: `Synced establishment data to ${totalSynced} RRC record(s)`
    };
  } catch (error) {
    throw new Error(`Failed to sync establishment data to RRC: ${error.message}`);
  }
}

