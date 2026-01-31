/**
 * Notices Routes
 * API endpoints for notice generation
 */

import express from 'express';
import { generateCP1Notice, generateCP25Notice, generateCP26Notice, generateSummonNotice, generateCP3BankNotice, generateIncomeTaxLetter, generateDDToCashSectionLetter, generateEstaLetter, generateLetterBodyFromPrompt } from './notices.service.js';
import logger from '../../utils/logger.js';

const router = express.Router();

/**
 * POST /api/notices/cp1/generate
 * Generate CP-1 Notice
 */
router.post('/cp1/generate', async (req, res) => {
  try {
    const { username, estaCode, rrcNo, noticeDate, remark } = req.body;

    // Validation
    if (!username || !estaCode || !rrcNo || !noticeDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: username, estaCode, rrcNo, noticeDate',
      });
    }

    // Generate notice
    const result = await generateCP1Notice(username, estaCode, rrcNo, noticeDate, remark || '');

    // Send file as response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    logger.error('Error in CP-1 generation route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate CP-1 notice',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/notices/cp25/generate
 * Generate CP-25 Notice
 */
router.post('/cp25/generate', async (req, res) => {
  try {
    const { username, estaCode, rrcNo, noticeDate, employerNames, address, hearingDate, hearingTime, regionalOfficeName, enforcementOfficer, isAEO, cp1Date, remark } = req.body;

    // Validation
    if (!username || !estaCode || !rrcNo || !noticeDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: username, estaCode, rrcNo, noticeDate',
      });
    }

    // Generate notice (isAEO defaults to false if not provided)
    const result = await generateCP25Notice(username, estaCode, rrcNo, noticeDate, employerNames, address, hearingDate, hearingTime, regionalOfficeName, enforcementOfficer, isAEO || false, cp1Date, remark || '');

    // Send file as response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    logger.error('Error in CP-25 generation route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate CP-25 notice',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/notices/cp26/generate
 * Generate CP-26 Warrant of Arrest Notice
 */
router.post('/cp26/generate', async (req, res) => {
  try {
    const { 
      username, estaCode, rrcNo, noticeDate,
      policeStationAddress, scheduledDate,
      showCauseRef, 
      previousHearingDates, deputyPoliceCommissionerAddress,
      regionalOfficeName, enforcementOfficer, isAEO, remark
    } = req.body;

    // Validation - all fields are mandatory
    if (!username || !estaCode || !rrcNo || !noticeDate || !policeStationAddress || !scheduledDate || !showCauseRef || !previousHearingDates || !deputyPoliceCommissionerAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: username, estaCode, rrcNo, noticeDate, policeStationAddress, scheduledDate, showCauseRef, previousHearingDates, deputyPoliceCommissionerAddress',
      });
    }

    // Generate notice (isAEO defaults to false if not provided)
    const result = await generateCP26Notice(
      username, 
      estaCode, 
      rrcNo, 
      noticeDate,
      policeStationAddress,
      scheduledDate,
      showCauseRef,
      previousHearingDates,
      deputyPoliceCommissionerAddress,
      regionalOfficeName || '',
      enforcementOfficer || '',
      isAEO || false,
      remark || ''
    );

    // Send file as response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    logger.error('Error in CP-26 generation route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate CP-26 notice',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/notices/summon/generate
 * Generate Summon Notice
 */
router.post('/summon/generate', async (req, res) => {
  try {
    const { username, estaCode, rrcNo, noticeDate, hearingDate, hearingTime, regionalOfficeName, remark } = req.body;

    // Validation
    if (!username || !estaCode || !rrcNo || !noticeDate || !hearingDate || !hearingTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: username, estaCode, rrcNo, noticeDate, hearingDate, hearingTime',
      });
    }

    // Generate notice
    const result = await generateSummonNotice(username, estaCode, rrcNo, noticeDate, hearingDate, hearingTime, regionalOfficeName || '', remark || '');

    // Send file as response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    logger.error('Error in Summon generation route:', error);
    logger.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate Summon notice',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/notices/cp3-bank/generate
 * Generate CP-3 Bank Notice
 */
router.post('/cp3-bank/generate', async (req, res) => {
  try {
    const { 
      username, estaCode, rrcNo, noticeDate,
      bankAddress, bankAccountNumbers,
      employerName, employerPAN, employerMobile,
      regionalOfficeName, enforcementOfficer, remark
    } = req.body;

    // Validation
    if (!username || !estaCode || !rrcNo || !noticeDate || !bankAddress || !bankAccountNumbers) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: username, estaCode, rrcNo, noticeDate, bankAddress, bankAccountNumbers',
      });
    }

    // Generate notice
    const result = await generateCP3BankNotice(
      username, 
      estaCode, 
      rrcNo, 
      noticeDate,
      bankAddress,
      bankAccountNumbers,
      employerName || '',
      employerPAN || '',
      employerMobile || '',
      regionalOfficeName || '',
      enforcementOfficer || '',
      remark || ''
    );

    // Send file as response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    logger.error('Error in CP-3 Bank generation route:', error);
    logger.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate CP-3 Bank notice',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/notices/income-tax-letter/generate
 * Generate Income Tax Letter (u/s 138 + Form 46)
 */
router.post('/income-tax-letter/generate', async (req, res) => {
  try {
    const {
      username,
      estaCode,
      rrcNo,
      noticeDate,
      incomeTaxAddress,
      officerName,
      officerFatherName,
      officerDesignation,
      employers,
      officeAddress,
      regionalOfficeName,
      remark,
    } = req.body;

    if (!username || !estaCode || !rrcNo || !noticeDate || !incomeTaxAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: username, estaCode, rrcNo, noticeDate, incomeTaxAddress',
      });
    }

    const result = await generateIncomeTaxLetter(
      username,
      estaCode,
      rrcNo,
      noticeDate,
      incomeTaxAddress.trim(),
      officerName || '',
      officerFatherName || '',
      officerDesignation || '',
      Array.isArray(employers) ? employers : [],
      officeAddress || '',
      regionalOfficeName || '',
      remark || ''
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    logger.error('Error in Income Tax Letter generation route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate Income Tax Letter',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/notices/dd-to-cash/generate
 * Generate DD to Cash Section Letter
 */
router.post('/dd-to-cash/generate', async (req, res) => {
  try {
    const { username, recoveryId, officeData } = req.body;

    if (!username || !recoveryId) {
      return res.status(400).json({
        success: false,
        message: 'Username and recoveryId are required',
      });
    }

    const result = await generateDDToCashSectionLetter(username, recoveryId, officeData || {});

    // Send file as response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    logger.error('Error in DD to Cash generation route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate DD to Cash letter',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/notices/esta-letter/generate-body
 * Generate letter body from prompt using Google Gemini AI
 */
router.post('/esta-letter/generate-body', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required',
      });
    }

    // Generate letter body using AI - only send the prompt
    const letterBody = await generateLetterBodyFromPrompt(prompt);

    return res.json({
      success: true,
      data: {
        letterBody,
      },
    });
  } catch (error) {
    logger.error('Error generating letter body:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate letter body',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /api/notices/esta-letter/generate
 * Generate ESTA LETTER
 */
router.post('/esta-letter/generate', async (req, res) => {
  try {
    const { username, estaCode, rrcNo, date, employerName, estaName, estaAddress, subject, letterBody, regionalOffice, remark } = req.body;

    // Validation
    if (!username || !estaCode || !rrcNo || !date || !employerName || !estaName || !estaAddress || !subject || !letterBody) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: username, estaCode, rrcNo, date, employerName, estaName, estaAddress, subject, letterBody',
      });
    }

    // Generate letter
    const result = await generateEstaLetter(
      username,
      estaCode,
      rrcNo,
      date,
      employerName,
      estaName,
      estaAddress,
      subject,
      letterBody,
      regionalOffice || '',
      remark || ''
    );

    // Send file as response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    logger.error('Error in ESTA LETTER generation route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate ESTA Letter',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

export default router;

