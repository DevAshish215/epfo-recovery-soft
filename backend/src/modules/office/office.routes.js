/**
 * Office Routes
 * API endpoints for Office operations
 * IMPORTANT: Each user can only access their own office data
 */

import express from 'express';
import { createOffice, getOfficeByUsername } from './office.service.js';
import { errorResponse, successResponse } from '../../utils/response.util.js';

const router = express.Router();

/**
 * POST /api/office/save
 * Save or update office details
 * Data isolation by username - each user has their own office
 */
router.post('/save', async (req, res) => {
  try {
    const officeData = req.body;

    if (!officeData.username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    if (!officeData.regional_office_code) {
      return res.status(400).json({
        success: false,
        message: 'Regional office code is required',
      });
    }

    // Data isolation: Each username has their own office details
    const office = await createOffice(officeData);
    res.json(successResponse(office, 'Office details saved successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * GET /api/office/:username
 * Get office by username
 * Each user can only access their own office data
 */
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    // Data isolation: Each username has their own office
    const office = await getOfficeByUsername(username);

    if (!office) {
      return res.status(404).json({
        success: false,
        message: 'Office not found',
      });
    }

    res.json(successResponse(office, 'Office retrieved successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

export default router;

