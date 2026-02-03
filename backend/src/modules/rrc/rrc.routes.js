/**
 * RRC Routes
 * API endpoints for RRC operations
 * No business logic - only routing and error handling
 */

import express from 'express';
import { uploadExcel, handleUploadError } from '../../middlewares/upload.middleware.js';
import { uploadRRCExcel, getRRCsByUsername, updateRRC, deleteRRC, getTrashRRCsByUsername, restoreRRC, permanentDeleteRRC, permanentDeleteAllTrashRRC, clearAllRRC, getUniquePinCodes, updateEnforcementOfficerByPinCode, syncEstablishmentDataToRRC, getRRCById, updateRemarksForEstaCode } from './rrc.service.js';
import { validationErrorResponse, errorResponse, successResponse } from '../../utils/response.util.js';
import XLSX from 'xlsx';
import path from 'path';
import os from 'os';

const router = express.Router();

/**
 * POST /api/rrc/upload
 * Upload RRC Excel or CSV file
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
    
    // Get regional office code from request (optional - can be empty)
    // If not provided, will try to get from office details, otherwise use empty string
    const regionalOfficeCode = req.body.regional_office_code || req.query.regional_office_code || '';

    // Call service to process Excel or CSV file (data isolation by username)
    const result = await uploadRRCExcel(req.file.buffer, username, regionalOfficeCode, req.file.originalname);

    // Return success response
    res.json(successResponse(
      {
        recordsProcessed: result.recordsProcessed,
      },
      'RRC data uploaded successfully'
    ));

  } catch (error) {
    // Handle validation errors
    if (error.type === 'VALIDATION_ERROR') {
      const { response, statusCode } = validationErrorResponse(
        error.missingColumns || [],
        '/api/rrc/template'
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
 * GET /api/rrc/template
 * Download RRC CSV template
 */
router.get('/template', (req, res) => {
  // Template data with mandatory columns and account-wise fields
  const templateData = [{
    // Mandatory fields
    'ESTA CODE': 'EXAMPLE001',
    'ESTA NAME': 'Example Establishment Name',
    'RRC NO': 'RRC001',
    'RRC DATE': new Date('2024-01-01'),
    // Optional basic fields
    'IR NIR': 'IR',
    'RRC PERIOD': '2024-2025',
    'U/S': 'U',
    'RACK LOCATION': 'A-1-01',
    // Account-wise Demand fields for 7A
    'DEMAND 7A A/C 1_EE': 10000,
    'DEMAND 7A A/C 1_ER': 10000,
    'DEMAND 7A A/C 2': 20000,
    'DEMAND 7A A/C 10': 30000,
    'DEMAND 7A A/C 21': 20000,
    'DEMAND 7A A/C 22': 10000,
    // Account-wise Demand fields for 14B
    'DEMAND 14B A/C 1': 10000,
    'DEMAND 14B A/C 2': 10000,
    'DEMAND 14B A/C 10': 15000,
    'DEMAND 14B A/C 21': 10000,
    'DEMAND 14B A/C 22': 5000,
    // Account-wise Demand fields for 7Q
    'DEMAND 7Q A/C 1': 5000,
    'DEMAND 7Q A/C 2': 5000,
    'DEMAND 7Q A/C 10': 7500,
    'DEMAND 7Q A/C 21': 5000,
    'DEMAND 7Q A/C 22': 2500,
    // Account-wise Recovery fields for 7A
    'RECOVERY 7A A/C 1_EE': 0,
    'RECOVERY 7A A/C 1_ER': 0,
    'RECOVERY 7A A/C 2': 0,
    'RECOVERY 7A A/C 10': 0,
    'RECOVERY 7A A/C 21': 0,
    'RECOVERY 7A A/C 22': 0,
    // Account-wise Recovery fields for 14B
    'RECOVERY 14B A/C 1': 0,
    'RECOVERY 14B A/C 2': 0,
    'RECOVERY 14B A/C 10': 0,
    'RECOVERY 14B A/C 21': 0,
    'RECOVERY 14B A/C 22': 0,
    // Account-wise Recovery fields for 7Q
    'RECOVERY 7Q A/C 1': 0,
    'RECOVERY 7Q A/C 2': 0,
    'RECOVERY 7Q A/C 10': 0,
    'RECOVERY 7Q A/C 21': 0,
    'RECOVERY 7Q A/C 22': 0,
  }];

  // Create CSV content
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  // Set headers for file download
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=rrc_template.csv');
  res.send(csv);
});

/**
 * GET /api/rrc
 * Get all RRCs for user
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

    const rrcs = await getRRCsByUsername(username);
    res.json(successResponse(rrcs, 'RRCs retrieved successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * GET /api/rrc/storage-path
 * Get storage location path (default: Desktop/Saved Notices)
 * IMPORTANT: Must be before /:id routes
 */
router.get('/storage-path', async (req, res) => {
  try {
    // Get Desktop/Saved Notices path (default location for saved notices)
    const desktopPath = path.join(os.homedir(), 'Desktop');
    const savedNoticesPath = path.join(desktopPath, 'Saved Notices');
    
    // Also return the old Notice Formats folder path for reference
    const noticeFormatsPath = path.join(process.cwd(), 'Notice Formats');
    
    res.json({
      success: true,
      data: {
        path: savedNoticesPath, // Return Saved Notices path as primary
        desktopPath: desktopPath, // Also return Desktop path
        noticeFormatsPath: noticeFormatsPath // Old location for reference
      }
    });
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * GET /api/rrc/pin-codes
 * Get unique PIN codes for user
 * IMPORTANT: Must be before /:id routes
 */
router.get('/pin-codes', async (req, res) => {
  try {
    const username = req.query.username;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    const pinCodes = await getUniquePinCodes(username);
    res.json(successResponse(pinCodes, 'PIN codes retrieved successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * GET /api/rrc/trash
 * Get all deleted RRCs (trash) for user
 * IMPORTANT: Must be before /:id routes
 */
router.get('/trash', async (req, res) => {
  try {
    const username = req.query.username;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    const trashRRCs = await getTrashRRCsByUsername(username);
    res.json(successResponse(trashRRCs, 'Trash RRCs retrieved successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * DELETE /api/rrc/trash/clear-all
 * Permanently delete all RRC records in trash for user
 */
router.delete('/trash/clear-all', async (req, res) => {
  try {
    const username = req.query.username || req.body.username;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    const result = await permanentDeleteAllTrashRRC(username);
    res.json(successResponse(
      { count: result.count },
      result.count > 0 ? `All trash cleared. ${result.count} record(s) permanently deleted.` : 'Trash is already empty.'
    ));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * PUT /api/rrc/update-enforcement-officer
 * Update enforcement officer for all RRCs with a specific PIN code
 * IMPORTANT: Must be before /:id routes
 */
router.put('/update-enforcement-officer', async (req, res) => {
  try {
    const { username, pinCode, enforcementOfficer } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }
    
    if (!pinCode) {
      return res.status(400).json({
        success: false,
        message: 'PIN Code is required',
      });
    }

    const result = await updateEnforcementOfficerByPinCode(username, pinCode, enforcementOfficer || '');
    res.json(successResponse(result, 'Enforcement Officer updated successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * DELETE /api/rrc/clear-all
 * Clear all RRC data for user (soft delete - move all to trash)
 * IMPORTANT: Must be before /:id routes
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

    const result = await clearAllRRC(username);
    res.json(successResponse(
      { count: result.count },
      result.count > 0 ? `All RRC data cleared. ${result.count} record(s) moved to trash.` : 'No RRC data to clear.'
    ));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * POST /api/rrc/sync-establishment-data
 * Sync establishment data to RRC data based on ESTA_CODE
 * IMPORTANT: Must be before /:id routes
 */
router.post('/sync-establishment-data', async (req, res) => {
  try {
    const username = req.body.username || req.query.username;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    const result = await syncEstablishmentDataToRRC(username);
    res.json(successResponse(result, result.message || 'Establishment data synced to RRC successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * POST /api/rrc/:id/remark
 * Add remark to RRC (appends to existing remarks for all RRCs with same ESTA_CODE)
 * IMPORTANT: Must be before /:id route to avoid route conflict
 */
router.post('/:id/remark', async (req, res) => {
  try {
    const id = req.params.id;
    const username = req.body.username || req.query.username;
    const { remark } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }
    
    if (!remark || !remark.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Remark is required',
      });
    }

    // Get RRC to find ESTA_CODE
    const rrc = await getRRCById(id, username);
    if (!rrc) {
      return res.status(404).json({
        success: false,
        message: 'RRC not found',
      });
    }

    // Update remarks for all RRCs with same ESTA_CODE
    await updateRemarksForEstaCode(username, rrc.ESTA_CODE, remark.trim(), '');
    
    res.json(successResponse(null, 'Remark added successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * PUT /api/rrc/:id
 * Update RRC record
 */
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const username = req.body.username || req.query.username;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    const updatedRRC = await updateRRC(id, username, req.body);
    res.json(successResponse(updatedRRC, 'RRC updated successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * DELETE /api/rrc/:id
 * Soft delete RRC record (move to trash)
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const username = req.query.username || req.body.username;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    await deleteRRC(id, username);
    res.json(successResponse(null, 'RRC moved to trash successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * POST /api/rrc/:id/restore
 * Restore RRC from trash
 */
router.post('/:id/restore', async (req, res) => {
  try {
    const id = req.params.id;
    const username = req.query.username || req.body.username;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    await restoreRRC(id, username);
    res.json(successResponse(null, 'RRC restored successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * DELETE /api/rrc/:id/permanent
 * Permanently delete RRC from trash
 */
router.delete('/:id/permanent', async (req, res) => {
  try {
    const id = req.params.id;
    const username = req.query.username || req.body.username;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    await permanentDeleteRRC(id, username);
    res.json(successResponse(null, 'RRC permanently deleted successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

export default router;

