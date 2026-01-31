/**
 * CP-26 Notice Generation Module
 * Handles generation of CP-26 notices (Warrant of Arrest)
 */

import path from 'path';
import RRC from '../rrc/rrc.model.js';
import Establishment from '../establishment/establishment.model.js';
import Office from '../office/office.model.js';
import { updateRemarksForEstaCode } from '../rrc/rrc.service.js';
import logger from '../../utils/logger.js';
import { formatDateDDMMMYYYY } from '../../utils/date.util.js';
import { formatEstaAddress, formatNumber, formatRRCDate } from './helpers.js';
import { resolveTemplatePath, createDocxtemplater, renderTemplate, generateBuffer, ensureDirectoryExists, saveNoticeFile, getSavedNoticesPath } from './template.util.js';

/**
 * Generate CP-26 Warrant of Arrest Notice
 * @param {boolean} isAEO - If true, use AEO template, otherwise use regular template
 */
export async function generateCP26Notice(
  username, 
  estaCode, 
  rrcNo, 
  noticeDate,
  policeStationAddress,
  scheduledDate,
  showCauseRef,
  previousHearingDates,
  deputyPoliceCommissionerAddress,
  regionalOfficeName,
  enforcementOfficer,
  isAEO = false,
  remark = ''
) {
  try {
    // Fetch ALL RRCs for this ESTA_CODE
    const allRRCs = await RRC.find({ 
      username, 
      ESTA_CODE: estaCode,
      isDeleted: { $ne: true }
    }).sort({ RRC_DATE: 1, RRC_NO: 1 });

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
    logger.debug(`CP-26: Office found: ${!!office}, Dispatch No: "${dispatchNo}"`);

    // Format RRC DETAILS: "RRC NO dtd. RRC DATE RRC PERIOD under section U/S"
    const rrcDetailsParts = allRRCs.map(rrc => {
      const rrcDate = formatRRCDate(rrc.RRC_DATE);
      const period = rrc.RRC_PERIOD || rrc.PERIOD || '';
      const us = rrc.U_S || '';
      return `${rrc.RRC_NO || ''} dtd. ${rrcDate}${period ? ` ${period}` : ''}${us ? ` under section ${us}` : ''}`;
    });
    const rrcDetails = rrcDetailsParts.join(', ');

    // Calculate sums (using ESTA-level fields: OUTSTAND_REC_COST and OUTSTAND_TOT_WITH_REC)
    let demandTotalRRC = 0;
    let recoveryTotalRRC = 0;
    let outstandTotalRRC = 0;
    let outstandTotWithRecRRC = 0;  // Sum of OUTSTAND_TOT_WITH_REC
    
    allRRCs.forEach(rrc => {
      demandTotalRRC += parseFloat(rrc.DEMAND_TOTAL || 0);
      recoveryTotalRRC += parseFloat(rrc.RECOVERY_TOTAL || 0);
      outstandTotalRRC += parseFloat(rrc.OUTSTAND_TOTAL || 0);
      outstandTotWithRecRRC += parseFloat(rrc.OUTSTAND_TOT_WITH_REC || 0);
    });
    
    // OUTSTAND_REC_COST is ESTA-level (same for all RRCs with same ESTA_CODE)
    const outstandRecCostRRC = allRRCs.length > 0 ? (allRRCs[0].OUTSTAND_REC_COST || 0) : 0;

    // Format dates
    const formattedDate = formatDateDDMMMYYYY(noticeDate);
    const formattedScheduledDate = formatDateDDMMMYYYY(scheduledDate);

    // Show cause notice ref & date (now combined in showCauseRef)
    const showCauseNoticeRefAndDate = showCauseRef || '';

    // Format ESTA address (with newlines)
    const estaAddress = formatEstaAddress(selectedRRC, establishment);
    // Format ESTA address comma separated (replace newlines with commas)
    const estaAddressCommaSeparated = estaAddress.replace(/\n/g, ', ');

    const templateData = {
      // Basic fields
      'ESTA_CODE': String(selectedRRC.ESTA_CODE || estaCode || ''),
      'ESTA CODE': String(selectedRRC.ESTA_CODE || estaCode || ''),
      'DATE': String(formattedDate || noticeDate || ''),
      'ESTA_NAME': String(selectedRRC.ESTA_NAME || establishment?.ESTA_NAME || ''),
      'ESTA NAME': String(selectedRRC.ESTA_NAME || establishment?.ESTA_NAME || ''),
      'ESTA_ADDRESS': String(estaAddress),
      'ESTA ADDRESS': String(estaAddress),
      'ESTA_ADDRESS_COMMA_SEPARATED': String(estaAddressCommaSeparated),
      'ESTA ADDRESS comma separated': String(estaAddressCommaSeparated),
      'MOBILE': String(selectedRRC.MOBILE_NO || establishment?.MOBILE_NO || ''),
      'MOBILE_NO': String(selectedRRC.MOBILE_NO || establishment?.MOBILE_NO || ''),
      'RO': String(regionalOfficeName || ''),
      'Enforcement_Officer': String(enforcementOfficer || selectedRRC.ENFORCEMENT_OFFICER || ''),
      'Enforcement Officer': String(enforcementOfficer || selectedRRC.ENFORCEMENT_OFFICER || ''),
      'DISPATCH_NO': String(dispatchNo || ''),
      'DISPATCH NO': String(dispatchNo || ''),
      'DISPATCHNO': String(dispatchNo || ''), // No space or underscore variant
      'Dispatch No': String(dispatchNo || ''), // Title case variant
      'Dispatch_No': String(dispatchNo || ''), // Title case with underscore
      
      // RRC Details
      'RRC_DETAILS': String(rrcDetails || ''),
      'RRC DETAILS': String(rrcDetails || ''),
      
      // Financial fields (sums)
      'DEMAND_TOTAL_RRC': formatNumber(demandTotalRRC),
      'DEMAND TOTAL RRC': formatNumber(demandTotalRRC),
      'RECOVERY_TOTAL_RRC': formatNumber(recoveryTotalRRC),
      'RECOVERY TOTAL RRC': formatNumber(recoveryTotalRRC),
      'OUTSTAND_TOTAL_RRC': formatNumber(outstandTotalRRC),
      'OUTSTAND TOTAL RRC': formatNumber(outstandTotalRRC),
      'OUTSTAND_REC_COST': formatNumber(outstandRecCostRRC),
      'OUTSTAND REC COST': formatNumber(outstandRecCostRRC),
      'OUTSTAND_REC_COST_RRC': formatNumber(outstandRecCostRRC),
      'OUTSTAND REC COST RRC': formatNumber(outstandRecCostRRC),
      'OUTSTAND_TOT_WITH_REC_RRC': formatNumber(outstandTotWithRecRRC),
      'OUTSTAND TOT WITH REC RRC': formatNumber(outstandTotWithRecRRC),
      
      // User input fields
      'POLICE_STATION_ADDRESS': String(policeStationAddress || ''),
      'POLICE STATION ADDRESS': String(policeStationAddress || ''),
      'SCHEDULED_DATE': String(formattedScheduledDate || scheduledDate || ''),
      'SCHEDULED DATE': String(formattedScheduledDate || scheduledDate || ''),
      'show cause notice ref & date': String(showCauseNoticeRefAndDate || ''),
      'SHOW_CAUSE_NOTICE_REF_AND_DATE': String(showCauseNoticeRefAndDate || ''),
      'previous hearing dates': String(previousHearingDates || ''),
      'PREVIOUS_HEARING_DATES': String(previousHearingDates || ''),
      'dy police Commissioner address': String(deputyPoliceCommissionerAddress || ''),
      'DY_POLICE_COMMISSIONER_ADDRESS': String(deputyPoliceCommissionerAddress || ''),
      'DEPUTY_POLICE_COMMISSIONER_ADDRESS': String(deputyPoliceCommissionerAddress || ''),
    };

    // Read template file - use AEO template if isAEO is true
    const templateFileName = isAEO ? 'CP 26 Warrant of Arrest AEO.docx' : 'CP 26 Warrant of Arrest.docx';
    const templatePath = resolveTemplatePath('cp26', templateFileName);

    // Log dispatch no for debugging
    logger.debug(`CP-26: Template data includes DISPATCH NO: "${templateData['DISPATCH NO']}"`);

    // Create and render template
    const doc = createDocxtemplater(templatePath);
    renderTemplate(doc, templateData);
    const buffer = generateBuffer(doc);

    // Create saved notices directory if it doesn't exist
    const savedNoticesDir = getSavedNoticesPath('CP-26');
    ensureDirectoryExists(savedNoticesDir);

    // Generate filename: CP-26_{ESTA_CODE}_{DATE}.docx or CP-26_AEO_{ESTA_CODE}_{DATE}.docx
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = isAEO ? `CP-26_AEO_${estaCode}_${dateStr}.docx` : `CP-26_${estaCode}_${dateStr}.docx`;
    const filePath = path.join(savedNoticesDir, filename);

    // Save file
    saveNoticeFile(buffer, filePath);

    // Update REMARKS field if remark is provided (same as recovery entries)
    if (remark && remark.trim()) {
      try {
        await updateRemarksForEstaCode(username, estaCode, remark.trim(), '');
        logger.debug('CP-26: Remark updated successfully');
      } catch (err) {
        logger.error('CP-26: Failed to update remarks:', err);
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
    logger.error('Error generating CP-26 notice:', error);
    throw error;
  }
}

