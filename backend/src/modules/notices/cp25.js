/**
 * CP-25 Notice Generation Module
 * Handles generation of CP-25 notices (Show Cause Notice)
 */

import path from 'path';
import RRC from '../rrc/rrc.model.js';
import Establishment from '../establishment/establishment.model.js';
import Office from '../office/office.model.js';
import { updateRemarksForEstaCode } from '../rrc/rrc.service.js';
import logger from '../../utils/logger.js';
import { formatDateDDMMMYYYY } from '../../utils/date.util.js';
import { formatEstaAddress, formatNumber, numberToWords, formatRRCDate } from './helpers.js';
import { resolveTemplatePath, createDocxtemplater, renderTemplate, generateBuffer, ensureDirectoryExists, saveNoticeFile, getSavedNoticesPath } from './template.util.js';

/**
 * Generate CP-25 Notice
 * @param {boolean} isAEO - If true, use AEO template, otherwise use regular template
 * @param {string} cp1Date - CP-1 DATE from popup (optional, will use RRC record if not provided)
 */
export async function generateCP25Notice(username, estaCode, rrcNo, noticeDate, employerNames, address, hearingDate, hearingTime, regionalOfficeName, enforcementOfficer, isAEO = false, cp1Date = null, remark = '') {
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

    // Find the selected RRC (for CP-1 DATE)
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
    logger.debug(`CP-25: Office found: ${!!office}, Dispatch No: "${dispatchNo}"`);

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

    // Format CP-1 DATE - use from request if provided, otherwise use from RRC record
    let formattedCP1Date = '';
    if (cp1Date) {
      // Use CP-1 DATE from popup (user may have updated it)
      formattedCP1Date = formatRRCDate(cp1Date);
    } else if (selectedRRC.CP_1_DATE) {
      // Fall back to CP-1 DATE from RRC record
      formattedCP1Date = formatRRCDate(selectedRRC.CP_1_DATE);
    }

    // Format hearing date to DD MMM YYYY (e.g., "28 Jan 2026")
    let formattedHearingDate = formatDateDDMMMYYYY(hearingDate);
    
    // Format notice date to DD MMM YYYY (e.g., "28 Jan 2026")
    let formattedDate = formatDateDDMMMYYYY(noticeDate);
    
    const templateData = {
      // Basic fields - provide both underscore and space versions
      'ESTA_CODE': String(selectedRRC.ESTA_CODE || estaCode || ''),
      'ESTA CODE': String(selectedRRC.ESTA_CODE || estaCode || ''),
      'DATE': String(formattedDate || noticeDate || ''),
      // Handle multiple employer names - combine them with newlines (one above other)
      'EMPLOYER_NAME': String(Array.isArray(employerNames) ? employerNames.filter(n => n && n.trim()).join('\n') : (employerNames || '')),
      'EMPLOYER NAME': String(Array.isArray(employerNames) ? employerNames.filter(n => n && n.trim()).join('\n') : (employerNames || '')),
      'ESTA_NAME': String(selectedRRC.ESTA_NAME || establishment?.ESTA_NAME || ''),
      'ESTA NAME': String(selectedRRC.ESTA_NAME || establishment?.ESTA_NAME || ''),
      'ESTA_ADDRESS': String(address || formatEstaAddress(selectedRRC, establishment)),
      'ESTA ADDRESS': String(address || formatEstaAddress(selectedRRC, establishment)),
      'RRC_DETAILS': String(rrcDetails || ''),
      'RRC DETAILS': String(rrcDetails || ''),
      'RRC_NO': String(selectedRRC.RRC_NO || ''),
      'RRC NO': String(selectedRRC.RRC_NO || ''),
      'RRC_DATE': String(formatRRCDate(selectedRRC.RRC_DATE) || ''),
      'RRC DATE': String(formatRRCDate(selectedRRC.RRC_DATE) || ''),
      'PERIOD': String(selectedRRC.RRC_PERIOD || selectedRRC.PERIOD || ''),
      'RRC_PERIOD': String(selectedRRC.RRC_PERIOD || selectedRRC.PERIOD || ''),
      'CP_1_DATE': String(formattedCP1Date || ''),
      'CP-1_DATE': String(formattedCP1Date || ''),
      'CP-1 DATE': String(formattedCP1Date || ''),
      'CP1 DATE': String(formattedCP1Date || ''),
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
      'DEMAND_TOTAL': formatNumber(selectedRRC.DEMAND_TOTAL || 0),
      'DEMAND TOTAL': formatNumber(selectedRRC.DEMAND_TOTAL || 0),
      'DEMAD_TOTAL': formatNumber(selectedRRC.DEMAND_TOTAL || 0), // Handle typo in template
      'U_S': String(selectedRRC.U_S || ''),
      'U/S': String(selectedRRC.U_S || ''),
      'DEMAND_7A': formatNumber(selectedRRC.DEMAND_7A || 0),
      'DEMAND 7A': formatNumber(selectedRRC.DEMAND_7A || 0),
      'DEMAND_14B': formatNumber(selectedRRC.DEMAND_14B || 0),
      'DEMAND 14B': formatNumber(selectedRRC.DEMAND_14B || 0),
      'DEMAND_7Q': formatNumber(selectedRRC.DEMAND_7Q || 0),
      'DEMAND 7Q': formatNumber(selectedRRC.DEMAND_7Q || 0),
      'Enforcement_Officer': String(enforcementOfficer || selectedRRC.ENFORCEMENT_OFFICER || ''),
      'Enforcement Officer': String(enforcementOfficer || selectedRRC.ENFORCEMENT_OFFICER || ''),
      
      // Account-wise demand fields (7A) - from selected RRC
      'DEMAND_7A_A/C_1_EE': formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_1_EE || 0),
      'DEMAND 7A A/C 1_EE': formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_1_EE || 0),
      'DEMAND_7A_A/C_1_ER': formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_1_ER || 0),
      'DEMAND 7A A/C 1_ER': formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_1_ER || 0),
      'DEMAND_7A_A/C_2': formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_2 || 0),
      'DEMAND 7A A/C 2': formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_2 || 0),
      'DEMAND_7A_A/C_10': formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_10 || 0),
      'DEMAND 7A A/C 10': formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_10 || 0),
      'DEMAND_7A_A/C_21': formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_21 || 0),
      'DEMAND 7A A/C 21': formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_21 || 0),
      'DEMAND_7A_A/C_22': formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_22 || 0),
      'DEMAND 7A A/C 22': formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_22 || 0),
      
      // Account-wise demand fields (14B)
      'DEMAND_14B_A/C_1': formatNumber(selectedRRC.DEMAND_14B_ACCOUNT_1 || 0),
      'DEMAND 14B A/C 1': formatNumber(selectedRRC.DEMAND_14B_ACCOUNT_1 || 0),
      'DEMAND_14B_A/C_2': formatNumber(selectedRRC.DEMAND_14B_ACCOUNT_2 || 0),
      'DEMAND 14B A/C 2': formatNumber(selectedRRC.DEMAND_14B_ACCOUNT_2 || 0),
      'DEMAND_14B_A/C_10': formatNumber(selectedRRC.DEMAND_14B_ACCOUNT_10 || 0),
      'DEMAND 14B A/C 10': formatNumber(selectedRRC.DEMAND_14B_ACCOUNT_10 || 0),
      'DEMAND_14B_A/C_21': formatNumber(selectedRRC.DEMAND_14B_ACCOUNT_21 || 0),
      'DEMAND 14B A/C 21': formatNumber(selectedRRC.DEMAND_14B_ACCOUNT_21 || 0),
      'DEMAND_14B_A/C_22': formatNumber(selectedRRC.DEMAND_14B_ACCOUNT_22 || 0),
      'DEMAND 14B A/C 22': formatNumber(selectedRRC.DEMAND_14B_ACCOUNT_22 || 0),
      
      // Account-wise demand fields (7Q)
      'DEMAND_7Q_A/C_1': formatNumber(selectedRRC.DEMAND_7Q_ACCOUNT_1 || 0),
      'DEMAND 7Q A/C 1': formatNumber(selectedRRC.DEMAND_7Q_ACCOUNT_1 || 0),
      'DEMAND_7Q_A/C_2': formatNumber(selectedRRC.DEMAND_7Q_ACCOUNT_2 || 0),
      'DEMAND 7Q A/C 2': formatNumber(selectedRRC.DEMAND_7Q_ACCOUNT_2 || 0),
      'DEMAND_7Q_A/C_10': formatNumber(selectedRRC.DEMAND_7Q_ACCOUNT_10 || 0),
      'DEMAND 7Q A/C 10': formatNumber(selectedRRC.DEMAND_7Q_ACCOUNT_10 || 0),
      'DEMAND_7Q_A/C_21': formatNumber(selectedRRC.DEMAND_7Q_ACCOUNT_21 || 0),
      'DEMAND 7Q A/C 21': formatNumber(selectedRRC.DEMAND_7Q_ACCOUNT_21 || 0),
      'DEMAND_7Q_A/C_22': formatNumber(selectedRRC.DEMAND_7Q_ACCOUNT_22 || 0),
      'DEMAND 7Q A/C 22': formatNumber(selectedRRC.DEMAND_7Q_ACCOUNT_22 || 0),
      
      // Amount in words (for OUTSTAND TOT WITH REC RRC)
      'OUTSTAND_TOT_WITH_REC_RRC_IN_WORDS': numberToWords(outstandTotWithRecRRC),
      'OUTSTAND TOT WITH REC RRC IN WORDS': numberToWords(outstandTotWithRecRRC),
    };

    // Read template file - use AEO template if isAEO is true
    const templateFileName = isAEO ? 'CP-25 Notice AEO.docx' : 'CP-25 Notice.docx';
    const templatePath = resolveTemplatePath('cp25', templateFileName);

    // Log dispatch no for debugging
    logger.debug(`CP-25: Template data includes DISPATCH NO: "${templateData['DISPATCH NO']}"`);

    // Create and render template
    const doc = createDocxtemplater(templatePath);
    renderTemplate(doc, templateData);
    const buffer = generateBuffer(doc);

    // Create saved notices directory if it doesn't exist
    const savedNoticesDir = getSavedNoticesPath('CP-25');
    ensureDirectoryExists(savedNoticesDir);

    // Generate filename: CP-25_{ESTA_CODE}_{YYYYMMDD}.docx or CP-25_AEO_{ESTA_CODE}_{YYYYMMDD}.docx
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = isAEO ? `CP-25_AEO_${estaCode}_${dateStr}.docx` : `CP-25_${estaCode}_${dateStr}.docx`;
    const filePath = path.join(savedNoticesDir, filename);

    // Save file
    saveNoticeFile(buffer, filePath);

    // Update REMARKS field if remark is provided (same as recovery entries)
    if (remark && remark.trim()) {
      try {
        await updateRemarksForEstaCode(username, estaCode, remark.trim(), '');
        logger.debug('CP-25: Remark updated successfully');
      } catch (err) {
        logger.error('CP-25: Failed to update remarks:', err);
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
    logger.error('Error generating CP-25 notice:', error);
    throw error;
  }
}

