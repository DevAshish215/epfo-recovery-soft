/**
 * Establishment Service
 * Business logic for Establishment operations
 * No Express logic - pure business logic only
 */

import Establishment from './establishment.model.js';
import { parseExcelFile } from '../../services/excelParser.service.js';
import { validateExcel } from '../../services/excelValidator.service.js';
import logger from '../../utils/logger.js';

/**
 * Map Excel column names to model field names
 * Supports both original and alternate column name formats
 */
function mapExcelToModel(excelRow) {
  return {
    // ESTA CODE: Original format or alternate format (EST_ID)
    ESTA_CODE: excelRow['ESTA CODE'] || excelRow['ESTA_CODE'] || excelRow['EST_ID'],
    
    // ESTA NAME: Original format or alternate format (EST_NAME)
    ESTA_NAME: excelRow['ESTA NAME'] || excelRow['ESTA_NAME'] || excelRow['EST_NAME'],
    
    // ADD1: Original format or alternate format (INCROP_ADDRESS1)
    ADD1: excelRow['ADD1'] || excelRow['ADD 1'] || excelRow['INCROP_ADDRESS1'],
    
    // ADD2: Original format or alternate format (INCROP_ADDRESS2)
    ADD2: excelRow['ADD2'] || excelRow['ADD 2'] || excelRow['INCROP_ADDRESS2'],
    
    // CITY: Original format or alternate format (INCROP_CITY)
    CITY: excelRow['CITY'] || excelRow['INCROP_CITY'],
    
    // DIST: Original format or alternate format (INCROP_DIST)
    DIST: excelRow['DIST'] || excelRow['DISTRICT'] || excelRow['INCROP_DIST'],
    
    // PIN CODE: Original format or alternate format (INCROP_PIN)
    PIN_CODE: excelRow['PIN CODE'] || excelRow['PIN_CODE'] || excelRow['PIN Cd'] || excelRow['INCROP_PIN'],
    
    // CIRCLE: Original format or alternate format (ENF_TASK_ID)
    CIRCLE: excelRow['CIRCLE'] || excelRow['ENF_TASK_ID'],
    
    // MOBILE NO: Original format or alternate format (MOBILE_SEEDED)
    MOBILE_NO: excelRow['MOBILE NO'] || excelRow['MOBILE_NO'] || excelRow['MOBILE'] || excelRow['MOBILE_SEEDED'],
    
    // EMAIL: Original format or alternate format (PRIMARY_EMAIL)
    EMAIL: excelRow['EMAIL'] || excelRow['PRIMARY_EMAIL'],
    
    // STATUS: Original format or alternate format (EST_STATUS_NAME)
    STATUS: excelRow['STATUS'] || excelRow['EST_STATUS_NAME'],
    
    // ESTABLISHMENT PAN: Original format or alternate format (PAN)
    // Note: ENF_TASK_ID is in alternate list but not mapped to any field
    ESTABLISHMENT_PAN: excelRow['ESTABLISHMENT PAN'] || excelRow['ESTABLISHMENT_PAN'] || excelRow['ESTA PAN'] || excelRow['PAN'],
  };
}

/**
 * Upload and process Establishment Excel file
 * @param {Buffer} fileBuffer - Excel file buffer
 * @param {string} username - Username for data isolation
 * @param {string} regionalOfficeCode - Regional office code
 * @returns {Object} Result with saved records count
 */
/**
 * Sync establishment data to RRC data (helper function)
 * This is imported from rrc.service to avoid circular dependency
 */
async function syncEstablishmentDataToRRC(username) {
  try {
    const { syncEstablishmentDataToRRC: syncFunction } = await import('../rrc/rrc.service.js');
    return await syncFunction(username);
  } catch (error) {
    logger.warn('Failed to sync establishment data to RRC:', error.message);
    return { synced: 0, message: 'Sync failed' };
  }
}

export async function uploadEstablishmentExcel(fileBuffer, username, regionalOfficeCode, originalName = '') {
  // 1. Parse Excel or CSV file
  const excelRows = parseExcelFile(fileBuffer, originalName);

  // 2. Validate mandatory columns
  // Accept either original format (ESTA CODE) or alternate format (EST_ID)
  const requiredColumns = [
    'ESTA CODE',
    'EST_ID', // Alternate format
  ];

  const optionalColumns = [
    // Original format
    'ESTA NAME',
    'ADD1',
    'ADD2',
    'CITY',
    'DIST',
    'PIN CODE',
    'CIRCLE',
    'MOBILE NO',
    'EMAIL',
    'STATUS',
    'ESTABLISHMENT PAN',
    // Alternate format
    'EST_NAME',
    'INCROP_ADDRESS1',
    'INCROP_ADDRESS2',
    'INCROP_CITY',
    'INCROP_DIST', // Alternate for DIST
    'INCROP_PIN',
    'ENF_TASK_ID', // Alternate for CIRCLE
    'MOBILE_SEEDED',
    'PRIMARY_EMAIL',
    'EST_STATUS_NAME',
    'PAN',
  ];

  // Check if Excel has data
  if (!excelRows || excelRows.length === 0) {
    throw {
      type: 'VALIDATION_ERROR',
      missingColumns: ['ESTA CODE or EST_ID'],
      message: 'Excel/CSV file is empty or could not be parsed',
    };
  }

  // Custom validation: Check if either ESTA CODE or EST_ID exists
  const firstRow = excelRows[0];
  const hasEstaCode = firstRow.hasOwnProperty('ESTA CODE') || firstRow.hasOwnProperty('ESTA_CODE');
  const hasEstId = firstRow.hasOwnProperty('EST_ID');
  
  if (!hasEstaCode && !hasEstId) {
    throw {
      type: 'VALIDATION_ERROR',
      missingColumns: ['ESTA CODE or EST_ID'],
      message: 'Missing required column: ESTA CODE or EST_ID. Please ensure your file has one of these columns.',
    };
  }

  // Validate other columns (optional) - skip validation for optional columns
  // We only validate required columns, optional columns are just mapped if present

  // 3. Map Excel data to model format
  const mappedRecords = excelRows.map(excelRow => {
    return mapExcelToModel(excelRow);
  }).filter(record => record.ESTA_CODE); // Filter out records without ESTA_CODE

  // 4. Update existing establishments or create new ones
  const savedRecords = [];
  for (const record of mappedRecords) {
    const estaCode = record.ESTA_CODE;

    if (!estaCode) {
      // Skip records without ESTA_CODE
      continue;
    }

    try {
      // Upsert: Update if exists, create if new
      // ESTA_CODE must be unique per username (data isolation by username)
      const saved = await Establishment.findOneAndUpdate(
        {
          username: username,
          ESTA_CODE: estaCode,
        },
        {
          ...record,
          username: username,
          regional_office_code: regionalOfficeCode,
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      savedRecords.push(saved);
    } catch (dbError) {
      // Handle database errors (e.g., duplicate key, validation errors)
      throw new Error(`Failed to save establishment with ESTA_CODE "${estaCode}": ${dbError.message}`);
    }
  }

  if (savedRecords.length === 0) {
    throw new Error('No valid records to save. Please ensure your file has ESTA CODE or EST_ID column with valid data.');
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
 * Get all establishments for a user
 */
export async function getEstablishmentsByUsername(username) {
  return await Establishment.find({ username: username })
    .sort({ ESTA_CODE: 1 });
}

/**
 * Clear all establishment data for a user
 */
export async function clearAllEstablishments(username) {
  const result = await Establishment.deleteMany({ username: username });
  return { count: result.deletedCount };
}

/**
 * Get establishment by ESTA CODE and regional office
 */
export async function getEstablishmentByCode(estaCode, regionalOfficeCode) {
  return await Establishment.findOne({ 
    ESTA_CODE: estaCode,
    regional_office_code: regionalOfficeCode,
  });
}

