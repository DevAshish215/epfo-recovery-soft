/**
 * Establishment Routes
 * API endpoints for Establishment operations
 * No business logic - only routing and error handling
 */

import express from 'express';
import { uploadExcel, handleUploadError } from '../../middlewares/upload.middleware.js';
import { uploadEstablishmentExcel, getEstablishmentsByUsername, clearAllEstablishments, deleteAllEstablishmentsByUsername } from './establishment.service.js';
import { validationErrorResponse, errorResponse, successResponse } from '../../utils/response.util.js';
import XLSX from 'xlsx';

const router = express.Router();

/**
 * POST /api/establishment/upload
 * Upload Establishment Excel or CSV file
 */
router.post('/upload', uploadExcel, handleUploadError, async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      // Check if error is due to file size
      if (req.fileValidationError) {
        return res.status(400).json({
          success: false,
          message: req.fileValidationError,
        });
      }
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select an Excel or CSV file.',
      });
    }

    // Get username from request
    const username = req.body.username || req.query.username;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }
    
    // Get regional office code from request (optional - can be empty)
    // If not provided, will try to get from office details, otherwise use empty string
    const regionalOfficeCode = req.body.regional_office_code || req.query.regional_office_code || '';

    // Call service to process Excel or CSV file (data isolation by username)
    const result = await uploadEstablishmentExcel(req.file.buffer, username, regionalOfficeCode, req.file.originalname);

    // Return success response
    res.json(successResponse(
      {
        recordsProcessed: result.recordsProcessed,
      },
      'Establishment data uploaded successfully'
    ));

  } catch (error) {
    // Handle validation errors
    if (error.type === 'VALIDATION_ERROR') {
      const { response, statusCode } = validationErrorResponse(
        error.missingColumns || [],
        '/api/establishment/template'
      );
      response.message = error.message || 'Excel validation failed';
      return res.status(statusCode).json(response);
    }

    // Handle other errors
    const { response, statusCode } = errorResponse(error.message || 'Upload failed');
    res.status(statusCode).json(response);
  }
});

/**
 * GET /api/establishment/template
 * Download Establishment Excel template
 */
router.get('/template', (req, res) => {
  // Template data with mandatory and optional columns
  // Note: System also accepts alternate column names:
  // EST_ID, EST_NAME, INCROP_ADDRESS1, INCROP_ADDRESS2, INCROP_CITY, INCROP_DIST (for DIST), 
  // INCROP_PIN, ENF_TASK_ID (for CIRCLE), MOBILE_SEEDED, PRIMARY_EMAIL, EST_STATUS_NAME, PAN
  const templateData = [{
    'ESTA CODE': 'EXAMPLE001',
    'ESTA NAME': 'Example Establishment Name',
    'ADD1': 'Address Line 1',
    'ADD2': 'Address Line 2',
    'CITY': 'City Name',
    'DIST': 'District Name',
    'PIN CODE': '123456',
    'CIRCLE': 'Circle Name',
    'MOBILE NO': '1234567890',
    'EMAIL': 'example@email.com',
    'STATUS': 'Active',
    'ESTABLISHMENT PAN': 'ABCDE1234F',
  }];

  // Create Excel file
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Establishment Data');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  // Set headers for file download
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=establishment_template.xlsx');
  res.send(buffer);
});

/**
 * DELETE /api/establishment/clear-all
 * Clear all establishment data for user
 */
router.delete('/clear-all', async (req, res) => {
  try {
    const username = req.query.username || req.body.username;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    const result = await clearAllEstablishments(username);
    res.json(successResponse(
      { count: result.count },
      result.count > 0 ? `All establishment data cleared. ${result.count} record(s) deleted.` : 'No establishment data to clear.'
    ));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * GET /api/establishment
 * Get all establishments for user
 */
router.get('/', async (req, res) => {
  try {
    const username = req.query.username;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    const establishments = await getEstablishmentsByUsername(username);
    res.json(successResponse(establishments, 'Establishments retrieved successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * DELETE /api/establishment
 * Delete all establishment data for the user. Data will only reappear when they upload again.
 */
router.delete('/', async (req, res) => {
  try {
    const username = req.query.username || req.body.username;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    const result = await deleteAllEstablishmentsByUsername(username);
    res.json(successResponse(
      { deletedCount: result.deletedCount },
      `All establishment data cleared (${result.deletedCount} record(s) removed). Upload an Excel file to add data again.`
    ));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

export default router;

