/**
 * Employer Address Routes
 * API endpoints for managing employer addresses
 */

import express from 'express';
import {
  getEmployerAddressesByEstaCode,
  saveEmployerAddress,
  updateEmployerAddress,
  deleteEmployerAddress,
  getEmployerNamesByEstaCode,
} from './employer-address.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';

const router = express.Router();

/**
 * GET /api/employer-address/:estaCode
 * Get all saved employer addresses for an ESTA_CODE
 */
router.get('/:estaCode', async (req, res) => {
  try {
    const { estaCode } = req.params;
    const username = req.query.username;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    const addresses = await getEmployerAddressesByEstaCode(username, estaCode);
    res.json(successResponse(addresses, 'Employer addresses retrieved successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * POST /api/employer-address
 * Save a new employer address
 * Can save employer name only, address only, or both
 */
router.post('/', async (req, res) => {
  try {
    const { username, estaCode, employerName, address, pinCode } = req.body;

    if (!username || !estaCode) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: username, estaCode',
      });
    }

    // Ensure only ONE field is provided (name OR address, not both)
    const hasName = employerName && employerName.trim();
    const hasAddress = address && address.trim();
    
    if (hasName && hasAddress) {
      return res.status(400).json({
        success: false,
        message: 'Cannot save employer name and address together. Please save them separately.',
      });
    }
    
    if (!hasName && !hasAddress) {
      return res.status(400).json({
        success: false,
        message: 'Either employerName or address is required',
      });
    }

    const saved = await saveEmployerAddress(username, estaCode, employerName, address, pinCode);
    res.json(successResponse(saved, 'Employer address saved successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * GET /api/employer-address/:estaCode/names
 * Get all unique employer names for an ESTA_CODE
 */
router.get('/:estaCode/names', async (req, res) => {
  try {
    const { estaCode } = req.params;
    const username = req.query.username;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    const names = await getEmployerNamesByEstaCode(username, estaCode);
    res.json(successResponse(names, 'Employer names retrieved successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * PUT /api/employer-address/:id
 * Update an employer address
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, employerName, address, pinCode } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    // Ensure only ONE field is provided (name OR address, not both)
    const hasName = employerName && employerName.trim();
    const hasAddress = address && address.trim();
    
    if (hasName && hasAddress) {
      return res.status(400).json({
        success: false,
        message: 'Cannot save employer name and address together. Please save them separately.',
      });
    }
    
    if (!hasName && !hasAddress) {
      return res.status(400).json({
        success: false,
        message: 'Either employerName or address is required',
      });
    }

    const updated = await updateEmployerAddress(username, id, employerName, address, pinCode);
    res.json(successResponse(updated, 'Employer address updated successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

/**
 * DELETE /api/employer-address/:id
 * Delete an employer address
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const username = req.query.username || req.body.username;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    await deleteEmployerAddress(username, id);
    res.json(successResponse(null, 'Employer address deleted successfully'));
  } catch (error) {
    const { response, statusCode } = errorResponse(error.message);
    res.status(statusCode).json(response);
  }
});

export default router;

