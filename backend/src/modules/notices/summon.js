/**
 * Summon Notice Generation Module
 * Handles generation of Summon notices (Under Rule 83 of the Second Schedule of Income Tax Act, 1961)
 */

import path from 'path';
import fs from 'fs';
import RRC from '../rrc/rrc.model.js';
import Establishment from '../establishment/establishment.model.js';
import Office from '../office/office.model.js';
import { updateRemarksForEstaCode } from '../rrc/rrc.service.js';
import logger from '../../utils/logger.js';
import { formatDateDDMMMYYYY } from '../../utils/date.util.js';
import { formatEstaAddress, formatNumber, formatRRCDate } from './helpers.js';
import { resolveTemplatePath, createDocxtemplater, renderTemplate, generateBuffer, ensureDirectoryExists, saveNoticeFile, getSavedNoticesPath } from './template.util.js';

/**
 * Generate Summon Notice
 */
export async function generateSummonNotice(username, estaCode, rrcNo, noticeDate, hearingDate, hearingTime, regionalOfficeName, remark = '') {
  try {
    // Fetch ALL RRCs for this ESTA_CODE (not just the selected one)
    const allRRCs = await RRC.find({ 
      username, 
      ESTA_CODE: estaCode,
      isDeleted: { $ne: true }
    }).sort({ RRC_DATE: 1, RRC_NO: 1 }); // Sort by date and RRC number

    if (!allRRCs || allRRCs.length === 0) {
      throw new Error('No RRCs found for this ESTA_CODE');
    }

    // Find the selected RRC
    const selectedRRC = allRRCs.find(r => r.RRC_NO === rrcNo);
    if (!selectedRRC) {
      throw new Error('Selected RRC not found');
    }

    // Fetch Establishment data
    const establishment = await Establishment.findOne({
      username,
      ESTA_CODE: estaCode
    });

    // Fetch Office data for DISPATCH NO
    const office = await Office.findOne({ username });
    const dispatchNo = office?.dispatch_no_for_letters_cps || '';
    logger.debug(`Summon: Office found: ${!!office}, Dispatch No: "${dispatchNo}"`);

    // Format RRC DETAILS: "RRC NO dtd. RRC DATE RRC PERIOD under section U/S"
    const rrcDetailsParts = allRRCs.map(rrc => {
      const rrcDate = formatRRCDate(rrc.RRC_DATE);
      const period = rrc.RRC_PERIOD || rrc.PERIOD || '';
      const us = rrc.U_S || '';
      return `${rrc.RRC_NO || ''} dtd. ${rrcDate}${period ? ` ${period}` : ''}${us ? ` under section ${us}` : ''}`;
    });
    const rrcDetails = rrcDetailsParts.join(', ');

    // Calculate ESTA-level OUTSTAND values (sum from all RRCs)
    let outstandTotWithRecRRC = 0;
    
    allRRCs.forEach(rrc => {
      outstandTotWithRecRRC += parseFloat(rrc.OUTSTAND_TOT_WITH_REC_RRC || rrc.OUTSTAND_TOT_WITH_REC || 0);
    });
    
    // OUTSTAND_REC_COST is ESTA-level (same for all RRCs with same ESTA_CODE)
    const outstandRecCostRRC = allRRCs.length > 0 ? (allRRCs[0].OUTSTAND_REC_COST || 0) : 0;

    // Format hearing date to DD MMM YYYY (e.g., "28 Jan 2026")
    let formattedHearingDate = formatDateDDMMMYYYY(hearingDate);
    
    // Format notice date to DD MMM YYYY (e.g., "28 Jan 2026")
    let formattedDate = formatDateDDMMMYYYY(noticeDate);
    
    const templateData = {
      // Basic fields - provide both underscore and space versions
      'ESTA_CODE': String(selectedRRC.ESTA_CODE || estaCode || ''),
      'ESTA CODE': String(selectedRRC.ESTA_CODE || estaCode || ''),
      'DATE': String(formattedDate || noticeDate || ''),
      'ESTA_NAME': String(selectedRRC.ESTA_NAME || establishment?.ESTA_NAME || ''),
      'ESTA NAME': String(selectedRRC.ESTA_NAME || establishment?.ESTA_NAME || ''),
      'ESTA_ADDRESS': String(formatEstaAddress(selectedRRC, establishment)),
      'ESTA ADDRESS': String(formatEstaAddress(selectedRRC, establishment)),
      'RRC_DETAILS': String(rrcDetails || ''),
      'RRC DETAILS': String(rrcDetails || ''),
      'HEARING_DATE': String(formattedHearingDate || hearingDate || ''),
      'HEARING DATE': String(formattedHearingDate || hearingDate || ''),
      'HEARING_TIME': String(hearingTime || ''),
      'HEARING TIME': String(hearingTime || ''),
      'RO': String(regionalOfficeName || ''),
      'DISPATCH_NO': String(dispatchNo || ''),
      'DISPATCH NO': String(dispatchNo || ''),
      'DISPATCHNO': String(dispatchNo || ''), // No space or underscore variant
      'Dispatch No': String(dispatchNo || ''), // Title case variant
      'Dispatch_No': String(dispatchNo || ''), // Title case with underscore
      'OUTSTAND_TOT_WITH_REC_RRC': formatNumber(outstandTotWithRecRRC),
      'OUTSTAND TOT WITH REC RRC': formatNumber(outstandTotWithRecRRC),
      'OUTSTAND_REC_COST_RRC': formatNumber(outstandRecCostRRC),
      'OUTSTAND REC COST RRC': formatNumber(outstandRecCostRRC),
      'OUTSTAND_REC_COST': formatNumber(outstandRecCostRRC),
      'OUTSTAND REC COST': formatNumber(outstandRecCostRRC),
    };

    // Read template file - try both SUMMOM.docx (existing with typo) and Summon.docx
    let templateFileName = 'SUMMOM.docx';
    let templatePath;
    
    try {
      templatePath = resolveTemplatePath('summon', templateFileName);
    } catch (err) {
      // If SUMMOM.docx doesn't exist, try Summon.docx
      logger.debug(`Summon: ${templateFileName} not found, trying Summon.docx`);
      templateFileName = 'Summon.docx';
      try {
        templatePath = resolveTemplatePath('summon', templateFileName);
      } catch (err2) {
        throw new Error(`Summon template not found. Please ensure the template file exists at backend/templates/notices/summon/SUMMOM.docx or backend/templates/notices/summon/Summon.docx. Error: ${err2.message}`);
      }
    }

    // Log dispatch no for debugging
    logger.debug(`Summon: Template data includes DISPATCH NO: "${templateData['DISPATCH NO']}"`);

    // Create and render template
    const doc = createDocxtemplater(templatePath);
    renderTemplate(doc, templateData);
    const buffer = generateBuffer(doc);

    // Create saved notices directory if it doesn't exist
    const savedNoticesDir = getSavedNoticesPath('Summon');
    ensureDirectoryExists(savedNoticesDir);

    // Generate filename: Summon_{ESTA_CODE}_{YYYYMMDD}.docx
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `Summon_${estaCode}_${dateStr}.docx`;
    const filePath = path.join(savedNoticesDir, filename);

    // Save file
    saveNoticeFile(buffer, filePath);

    // Update REMARKS field if remark is provided
    if (remark && remark.trim()) {
      try {
        await updateRemarksForEstaCode(username, estaCode, remark.trim(), '');
        logger.debug('Summon: Remark updated successfully');
      } catch (err) {
        logger.error('Summon: Failed to update remarks:', err);
        // Don't fail the notice generation if remark update fails
      }
    }

    return {
      success: true,
      filePath,
      filename,
      buffer,
    };
  } catch (error) {
    logger.error('Error generating Summon notice:', error);
    throw error;
  }
}
