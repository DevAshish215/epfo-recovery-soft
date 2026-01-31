/**
 * CP-3 Bank Notice Generation Module
 * Handles generation of CP-3 Bank notices (Prohibitory Order to Bank)
 */

import path from 'path';
import fs from 'fs';
import RRC from '../rrc/rrc.model.js';
import Establishment from '../establishment/establishment.model.js';
import Office from '../office/office.model.js';
import { updateRemarksForEstaCode } from '../rrc/rrc.service.js';
import logger from '../../utils/logger.js';
import { formatDateDDMMMYYYY } from '../../utils/date.util.js';
import { formatNumber, formatRRCDate } from './helpers.js';
import { resolveTemplatePath, createDocxtemplater, renderTemplate, generateBuffer, ensureDirectoryExists, saveNoticeFile, getSavedNoticesPath } from './template.util.js';

/**
 * Generate CP-3 Bank Notice
 */
export async function generateCP3BankNotice(
  username, 
  estaCode, 
  rrcNo, 
  noticeDate,
  bankAddress,
  bankAccountNumbers,
  employerName,
  employerPAN,
  employerMobile,
  regionalOfficeName,
  enforcementOfficer,
  remark = ''
) {
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

    // Fetch Office data for DISPATCH NO, Commissioner Name, and Grade
    const office = await Office.findOne({ username });
    const dispatchNo = office?.dispatch_no_for_letters_cps || '';
    const commissionerName = (office?.recovery_officer_names && office.recovery_officer_names.length > 0) 
      ? office.recovery_officer_names[0] 
      : '';
    const commissionerGrade = office?.officer_designation || '';
    
    logger.debug(`CP-3 Bank: Office found: ${!!office}, Dispatch No: "${dispatchNo}", Commissioner: "${commissionerName}"`);

    // Calculate ESTA-level DEMAND TOTAL (sum from all RRCs)
    let demandTotal = 0;
    allRRCs.forEach(rrc => {
      demandTotal += parseFloat(rrc.DEMAND_TOTAL || 0);
    });

    // Calculate ESTA-level OUTSTAND values (sum from all RRCs)
    let outstandTotWithRecRRC = 0;
    allRRCs.forEach(rrc => {
      outstandTotWithRecRRC += parseFloat(rrc.OUTSTAND_TOT_WITH_REC_RRC || rrc.OUTSTAND_TOT_WITH_REC || 0);
    });
    
    // OUTSTAND_REC_COST is ESTA-level (same for all RRCs with same ESTA_CODE)
    const outstandRecCostRRC = allRRCs.length > 0 ? (allRRCs[0].OUTSTAND_REC_COST || 0) : 0;

    // Get U/S from selected RRC
    const us = selectedRRC.U_S || '';

    // Format notice date to DD MMM YYYY (e.g., "28 Jan 2026")
    let formattedDate = formatDateDDMMMYYYY(noticeDate);
    
    const templateData = {
      // Basic fields - provide both underscore and space versions
      'ESTA_CODE': String(selectedRRC.ESTA_CODE || estaCode || ''),
      'ESTA CODE': String(selectedRRC.ESTA_CODE || estaCode || ''),
      'DATE': String(formattedDate || noticeDate || ''),
      'ESTA_NAME': String(selectedRRC.ESTA_NAME || establishment?.ESTA_NAME || ''),
      'ESTA NAME': String(selectedRRC.ESTA_NAME || establishment?.ESTA_NAME || ''),
      'BANK_ADDRESS': String(bankAddress || ''),
      'BANK ADDRESS': String(bankAddress || ''),
      'BANK_ACCOUNT_NUMBERS': String(bankAccountNumbers || ''),
      'BANK ACCOUNT NUMBERS': String(bankAccountNumbers || ''),
      'ESTA_BANK_AC_NOS': String(bankAccountNumbers || ''),
      'ESTA BANK AC NOS': String(bankAccountNumbers || ''),
      'EMPLOYER_NAME': String(employerName || ''),
      'EMPLOYER NAME': String(employerName || ''),
      'EMPLOYER_PAN': String(employerPAN || establishment?.ESTABLISHMENT_PAN || selectedRRC.ESTA_PAN || ''),
      'EMPLOYER PAN': String(employerPAN || establishment?.ESTABLISHMENT_PAN || selectedRRC.ESTA_PAN || ''),
      'EMPLOYER_MOBILE': String(employerMobile || establishment?.MOBILE_NO || selectedRRC.MOBILE_NO || ''),
      'EMPLOYER MOBILE': String(employerMobile || establishment?.MOBILE_NO || selectedRRC.MOBILE_NO || ''),
      'DEMAND_TOTAL': formatNumber(demandTotal),
      'DEMAND TOTAL': formatNumber(demandTotal),
      'U_S': String(us || ''),
      'U/S': String(us || ''),
      'OUTSTAND_TOT_WITH_REC_RRC': formatNumber(outstandTotWithRecRRC),
      'OUTSTAND TOT WITH REC RRC': formatNumber(outstandTotWithRecRRC),
      'OUTSTAND_REC_COST_RRC': formatNumber(outstandRecCostRRC),
      'OUTSTAND REC COST RRC': formatNumber(outstandRecCostRRC),
      'OUTSTAND_REC_COST': formatNumber(outstandRecCostRRC),
      'OUTSTAND REC COST': formatNumber(outstandRecCostRRC),
      'RO': String(regionalOfficeName || ''),
      'DISPATCH_NO': String(dispatchNo || ''),
      'DISPATCH NO': String(dispatchNo || ''),
      'DISPATCHNO': String(dispatchNo || ''), // No space or underscore variant
      'Dispatch No': String(dispatchNo || ''), // Title case variant
      'Dispatch_No': String(dispatchNo || ''), // Title case with underscore
      'COMMISSIONER_NAME': String(commissionerName || ''),
      'COMMISSIONER NAME': String(commissionerName || ''),
      'COMMISSIONER_GRADE': String(commissionerGrade || ''),
      'COMMISSIONER GRADE': String(commissionerGrade || ''),
      'Enforcement_Officer': String(enforcementOfficer || selectedRRC.ENFORCEMENT_OFFICER || ''),
      'Enforcement Officer': String(enforcementOfficer || selectedRRC.ENFORCEMENT_OFFICER || ''),
    };

    // Read template file - try CP-3 8F AEO.docx (existing), CP-3 Bank.docx, or CP3 Bank.docx
    let templateFileName = 'CP-3 8F AEO.docx';
    let templatePath;
    
    try {
      templatePath = resolveTemplatePath('cp3Bank', templateFileName);
    } catch (err) {
      // If CP-3 8F AEO.docx doesn't exist, try CP-3 Bank.docx
      logger.debug(`CP-3 Bank: ${templateFileName} not found, trying CP-3 Bank.docx`);
      templateFileName = 'CP-3 Bank.docx';
      try {
        templatePath = resolveTemplatePath('cp3Bank', templateFileName);
      } catch (err2) {
        // If CP-3 Bank.docx doesn't exist, try CP3 Bank.docx
        logger.debug(`CP-3 Bank: ${templateFileName} not found, trying CP3 Bank.docx`);
        templateFileName = 'CP3 Bank.docx';
        try {
          templatePath = resolveTemplatePath('cp3Bank', templateFileName);
        } catch (err3) {
          throw new Error(`CP-3 Bank template not found. Please ensure the template file exists at backend/templates/notices/cp3Bank/CP-3 8F AEO.docx, backend/templates/notices/cp3Bank/CP-3 Bank.docx, or backend/templates/notices/cp3Bank/CP3 Bank.docx. Error: ${err3.message}`);
        }
      }
    }

    // Log dispatch no for debugging
    logger.debug(`CP-3 Bank: Template data includes DISPATCH NO: "${templateData['DISPATCH NO']}"`);

    // Create and render template
    const doc = createDocxtemplater(templatePath);
    renderTemplate(doc, templateData);
    const buffer = generateBuffer(doc);

    // Create saved notices directory if it doesn't exist
    const savedNoticesDir = getSavedNoticesPath('CP-3 Bank');
    ensureDirectoryExists(savedNoticesDir);

    // Generate filename: CP-3_Bank_{ESTA_CODE}_{YYYYMMDD}.docx
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `CP-3_Bank_${estaCode}_${dateStr}.docx`;
    const filePath = path.join(savedNoticesDir, filename);

    // Save file
    saveNoticeFile(buffer, filePath);

    // Update REMARKS field if remark is provided
    if (remark && remark.trim()) {
      try {
        await updateRemarksForEstaCode(username, estaCode, remark.trim(), '');
        logger.debug('CP-3 Bank: Remark updated successfully');
      } catch (err) {
        logger.error('CP-3 Bank: Failed to update remarks:', err);
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
    logger.error('Error generating CP-3 Bank notice:', error);
    throw error;
  }
}
