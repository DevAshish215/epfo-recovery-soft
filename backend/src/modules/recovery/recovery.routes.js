/**
 * Recovery Routes
 * API endpoints for Recovery operations
 * Handles DD/TRRN recovery entry and allocation
 */

import express from 'express';
import {
  createRecovery,
  getRecoveriesByEstaCode,
  getRecoveriesByUsername,
  updateRecovery,
  deleteRecovery,
  previewRecoveryAllocation,
  uploadRecoveryExcel,
  generateRecoveryTemplate,
} from './recovery.service.js';
import { errorResponse, successResponse, validationErrorResponse } from '../../utils/response.util.js';
import { uploadExcel, handleUploadError } from '../../middlewares/upload.middleware.js';

const router = express.Router();

/**
 * POST /api/recovery/preview
 * Preview recovery allocation without saving
 * This allows the frontend to show how the recovery will be allocated
 */
router.post('/preview', async (req, res) => {
  try {
    const { username, ESTA_CODE, RRC_NO, RECOVERY_AMOUNT, recoveryId } = req.body;

    // Validate required fields
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    if (!ESTA_CODE) {
      return res.status(400).json({
        success: false,
        message: 'ESTA_CODE is required',
      });
    }

    if (!RRC_NO) {
      return res.status(400).json({
        success: false,
        message: 'RRC_NO is required',
      });
    }

    if (!RECOVERY_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: 'RECOVERY_AMOUNT is required',
      });
    }

    const previewData = {
      username,
      ESTA_CODE,
      RRC_NO,
      RECOVERY_AMOUNT,
    };

    // Include recoveryId if provided (for edit mode)
    if (recoveryId) {
      previewData.recoveryId = recoveryId;
    }

    const preview = await previewRecoveryAllocation(previewData);

    res.json(successResponse(preview, 'Allocation preview generated successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * POST /api/recovery/add
 * Create a new recovery transaction (DD/TRRN)
 * This will allocate the recovery and update RRC amounts
 */
router.post('/add', async (req, res) => {
  try {
    const recoveryData = req.body;

    // Validate required fields
    if (!recoveryData.username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    if (!recoveryData.ESTA_CODE) {
      return res.status(400).json({
        success: false,
        message: 'ESTA_CODE is required',
      });
    }

    if (!recoveryData.RRC_NO) {
      return res.status(400).json({
        success: false,
        message: 'RRC_NO is required',
      });
    }

    if (!recoveryData.RECOVERY_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: 'RECOVERY_AMOUNT is required',
      });
    }

    if (!recoveryData.BANK_NAME) {
      return res.status(400).json({
        success: false,
        message: 'BANK_NAME is required',
      });
    }

    if (!recoveryData.RECOVERY_DATE) {
      return res.status(400).json({
        success: false,
        message: 'RECOVERY_DATE is required',
      });
    }

    if (!recoveryData.DD_TRRN_DATE) {
      return res.status(400).json({
        success: false,
        message: 'DD_TRRN_DATE is required',
      });
    }

    if (!recoveryData.REFERENCE_NUMBER) {
      return res.status(400).json({
        success: false,
        message: 'REFERENCE_NUMBER is required',
      });
    }

    if (!recoveryData.TRANSACTION_TYPE || (recoveryData.TRANSACTION_TYPE !== 'DD' && recoveryData.TRANSACTION_TYPE !== 'TRRN')) {
      return res.status(400).json({
        success: false,
        message: 'TRANSACTION_TYPE must be either DD or TRRN',
      });
    }

    const recovery = await createRecovery(recoveryData);

    res.status(201).json(successResponse(recovery, 'Recovery transaction created successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * GET /api/recovery/by-esta/:ESTA_CODE
 * Get all recovery transactions for a specific ESTA_CODE
 */
router.get('/by-esta/:ESTA_CODE', async (req, res) => {
  try {
    const username = req.query.username;
    const estaCode = req.params.ESTA_CODE;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    if (!estaCode) {
      return res.status(400).json({
        success: false,
        message: 'ESTA_CODE is required',
      });
    }

    const recoveries = await getRecoveriesByEstaCode(username, estaCode);
    res.json(successResponse(recoveries, 'Recoveries retrieved successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * GET /api/recovery/all
 * Get all recovery transactions for a user
 */
router.get('/all', async (req, res) => {
  try {
    const username = req.query.username;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    const recoveries = await getRecoveriesByUsername(username);
    res.json(successResponse(recoveries, 'Recoveries retrieved successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * PUT /api/recovery/:id
 * Update a recovery transaction
 * This will recalculate allocation and update RRC financials
 */
router.put('/:id', async (req, res) => {
  try {
    const recoveryId = req.params.id;
    const username = req.query.username;
    const updateData = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    if (!recoveryId) {
      return res.status(400).json({
        success: false,
        message: 'Recovery ID is required',
      });
    }

    const updatedRecovery = await updateRecovery(recoveryId, updateData, username);
    res.json(successResponse(updatedRecovery, 'Recovery transaction updated successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * DELETE /api/recovery/:id
 * Delete a recovery transaction
 * This will also recalculate RRC financials and recovery costs
 */
router.delete('/:id', async (req, res) => {
  try {
    const recoveryId = req.params.id;
    const username = req.query.username;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    if (!recoveryId) {
      return res.status(400).json({
        success: false,
        message: 'Recovery ID is required',
      });
    }

    await deleteRecovery(recoveryId, username);
    res.json(successResponse(null, 'Recovery transaction deleted successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * POST /api/recovery/upload
 * Upload bulk recovery entries from Excel file
 */
router.post('/upload', uploadExcel, handleUploadError, async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
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
    
    // Get regional office code from request (optional)
    const regionalOfficeCode = req.body.regional_office_code || req.query.regional_office_code || '';

    // Call service to process Excel or CSV file
    const result = await uploadRecoveryExcel(req.file.buffer, username, regionalOfficeCode, req.file.originalname);

    // Return success response
    res.json(successResponse(
      {
        recordsProcessed: result.recordsProcessed,
        recordsFailed: result.recordsFailed,
        totalRecords: result.totalRecords,
        errors: result.errors,
      },
      `Recovery data uploaded successfully. ${result.recordsProcessed} record(s) processed, ${result.recordsFailed} failed.`
    ));

  } catch (error) {
    // Handle RRC validation errors (reject entire upload)
    if (error.type === 'RRC_VALIDATION_ERROR') {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: {
          invalidRRCs: error.invalidRRCs,
        },
      });
    }

    // Handle validation errors (missing columns)
    if (error.type === 'VALIDATION_ERROR') {
      const { response, statusCode } = validationErrorResponse(
        error.missingColumns || [],
        '/api/recovery/template'
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
 * GET /api/recovery/template
 * Download Recovery Excel template
 */
router.get('/template', (req, res) => {
  try {
    const buffer = generateRecoveryTemplate();

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=recovery_template.xlsx');
    res.send(buffer);
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message || 'Failed to generate template');
    res.status(statusCode).json(response);
  }
});

export default router;

