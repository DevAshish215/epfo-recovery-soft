/**
 * CP-1 Notice Generation Module
 * Handles generation of CP-1 notices
 */

import path from 'path';
import RRC from '../rrc/rrc.model.js';
import Establishment from '../establishment/establishment.model.js';
import Office from '../office/office.model.js';
import { updateRemarksForEstaCode } from '../rrc/rrc.service.js';
import logger from '../../utils/logger.js';
import { formatEstaAddress, formatNumber, numberToWords, getTemplateFileName } from './helpers.js';
import { resolveTemplatePath, createDocxtemplater, renderTemplate, generateBuffer, ensureDirectoryExists, saveNoticeFile, getSavedNoticesPath } from './template.util.js';

/**
 * Generate CP-1 Notice
 */
export async function generateCP1Notice(username, estaCode, rrcNo, noticeDate, remark = '') {
  try {
    // Fetch RRC data
    const rrc = await RRC.findOne({ 
      username, 
      ESTA_CODE: estaCode, 
      RRC_NO: rrcNo,
      isDeleted: { $ne: true }
    });

    if (!rrc) {
      throw new Error('RRC not found');
    }

    // Fetch Establishment data
    const establishment = await Establishment.findOne({
      username,
      ESTA_CODE: estaCode
    });
    
    // Fetch Office data for DISPATCH NO
    const office = await Office.findOne({ username });
    const dispatchNo = office?.dispatch_no_for_letters_cps || '';
    logger.debug(`CP-1: Office found: ${!!office}, Dispatch No: "${dispatchNo}"`);
    
    // Determine which template to use based on U/S field
    const templateFileName = getTemplateFileName(rrc.U_S);
    logger.debug(`RRC U/S: ${rrc.U_S}, Using template: ${templateFileName}`);

    // Prepare data for template
    // Provide both underscore and space versions (matching backup approach)
    const demandTotal = formatNumber(rrc.DEMAND_TOTAL || 0);
    const demand14B = formatNumber(rrc.DEMAND_14B || 0);
    const demand7Q = formatNumber(rrc.DEMAND_7Q || 0);
    const demand7A = formatNumber(rrc.DEMAND_7A || 0);
    
    // Format date from YYYY-MM-DD to DD-MM-YYYY (matching backup)
    let formattedDate = '';
    if (noticeDate) {
      const dateParts = noticeDate.split('-');
      if (dateParts.length === 3) {
        formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // DD-MM-YYYY
      } else {
        formattedDate = noticeDate;
      }
    }
    
    // Format RRC_DATE
    let formattedRrcDate = '';
    if (rrc.RRC_DATE) {
      try {
        const rrcDateObj = new Date(rrc.RRC_DATE);
        if (!isNaN(rrcDateObj.getTime())) {
          const day = String(rrcDateObj.getDate()).padStart(2, '0');
          const month = String(rrcDateObj.getMonth() + 1).padStart(2, '0');
          const year = rrcDateObj.getFullYear();
          formattedRrcDate = `${day}-${month}-${year}`;
        } else {
          formattedRrcDate = String(rrc.RRC_DATE);
        }
      } catch (e) {
        formattedRrcDate = String(rrc.RRC_DATE);
      }
    }
    
    const templateData = {
      // Basic fields - provide both underscore and space versions
      'ESTA_CODE': String(rrc.ESTA_CODE || ''),
      'ESTA CODE': String(rrc.ESTA_CODE || ''), // Template uses this format
      'DATE': String(formattedDate || noticeDate || ''),
      'ESTA_NAME': String(rrc.ESTA_NAME || ''),
      'ESTA NAME': String(rrc.ESTA_NAME || ''), // Template uses this format
      'ESTA_ADDRESS': String(formatEstaAddress(rrc, establishment)),
      'ESTA ADDRESS': String(formatEstaAddress(rrc, establishment)), // Template uses this format
      'RRC_NO': String(rrc.RRC_NO || ''),
      'RRC NO': String(rrc.RRC_NO || ''), // Template uses this format
      'RRC_DATE': String(formattedRrcDate || rrc.RRC_DATE || ''),
      'RRC DATE': String(formattedRrcDate || rrc.RRC_DATE || ''), // Template uses this format
      'PERIOD': String(rrc.RRC_PERIOD || rrc.PERIOD || ''),
      'RRC_PERIOD': String(rrc.RRC_PERIOD || rrc.PERIOD || ''),
      'DEMAND_TOTAL': demandTotal,
      'DEMAND TOTAL': demandTotal, // Template uses this format
      'DEMAD_TOTAL': demandTotal, // Handle typo in template (missing 'N')
      'U_S': String(rrc.U_S || ''),
      'U/S': String(rrc.U_S || ''), // Template uses U/S format
      'DEMAND_7A': demand7A,
      'DEMAND 7A': demand7A,
      'DEMAND_14B': demand14B,
      'DEMAND 14B': demand14B,
      'DEMAND_7Q': demand7Q,
      'DEMAND 7Q': demand7Q,
      'Enforcement_Officer': String(rrc.ENFORCEMENT_OFFICER || ''),
      'Enforcement Officer': String(rrc.ENFORCEMENT_OFFICER || ''), // Template uses space format
      'DISPATCH_NO': String(dispatchNo || ''),
      'DISPATCH NO': String(dispatchNo || ''),
      'DISPATCHNO': String(dispatchNo || ''), // No space or underscore variant
      'Dispatch No': String(dispatchNo || ''), // Title case variant
      'Dispatch_No': String(dispatchNo || ''), // Title case with underscore
      
      // Account-wise demand fields (7A) - provide both underscore and space versions
      'DEMAND_7A_A/C_1_EE': formatNumber(rrc.DEMAND_7A_ACCOUNT_1_EE || 0),
      'DEMAND 7A A/C 1_EE': formatNumber(rrc.DEMAND_7A_ACCOUNT_1_EE || 0),
      'DEMAND_7A_A/C_1_ER': formatNumber(rrc.DEMAND_7A_ACCOUNT_1_ER || 0),
      'DEMAND 7A A/C 1_ER': formatNumber(rrc.DEMAND_7A_ACCOUNT_1_ER || 0),
      'DEMAND_7A_A/C_2': formatNumber(rrc.DEMAND_7A_ACCOUNT_2 || 0),
      'DEMAND 7A A/C 2': formatNumber(rrc.DEMAND_7A_ACCOUNT_2 || 0),
      'DEMAND_7A_A/C_10': formatNumber(rrc.DEMAND_7A_ACCOUNT_10 || 0),
      'DEMAND 7A A/C 10': formatNumber(rrc.DEMAND_7A_ACCOUNT_10 || 0),
      'DEMAND_7A_A/C_21': formatNumber(rrc.DEMAND_7A_ACCOUNT_21 || 0),
      'DEMAND 7A A/C 21': formatNumber(rrc.DEMAND_7A_ACCOUNT_21 || 0),
      'DEMAND_7A_A/C_22': formatNumber(rrc.DEMAND_7A_ACCOUNT_22 || 0),
      'DEMAND 7A A/C 22': formatNumber(rrc.DEMAND_7A_ACCOUNT_22 || 0),
      
      // Account-wise demand fields (14B)
      'DEMAND_14B_A/C_1': formatNumber(rrc.DEMAND_14B_ACCOUNT_1 || 0),
      'DEMAND 14B A/C 1': formatNumber(rrc.DEMAND_14B_ACCOUNT_1 || 0),
      'DEMAND_14B_A/C_2': formatNumber(rrc.DEMAND_14B_ACCOUNT_2 || 0),
      'DEMAND 14B A/C 2': formatNumber(rrc.DEMAND_14B_ACCOUNT_2 || 0),
      'DEMAND_14B_A/C_10': formatNumber(rrc.DEMAND_14B_ACCOUNT_10 || 0),
      'DEMAND 14B A/C 10': formatNumber(rrc.DEMAND_14B_ACCOUNT_10 || 0),
      'DEMAND_14B_A/C_21': formatNumber(rrc.DEMAND_14B_ACCOUNT_21 || 0),
      'DEMAND 14B A/C 21': formatNumber(rrc.DEMAND_14B_ACCOUNT_21 || 0),
      'DEMAND_14B_A/C_22': formatNumber(rrc.DEMAND_14B_ACCOUNT_22 || 0),
      'DEMAND 14B A/C 22': formatNumber(rrc.DEMAND_14B_ACCOUNT_22 || 0),
      
      // Account-wise demand fields (7Q)
      'DEMAND_7Q_A/C_1': formatNumber(rrc.DEMAND_7Q_ACCOUNT_1 || 0),
      'DEMAND 7Q A/C 1': formatNumber(rrc.DEMAND_7Q_ACCOUNT_1 || 0),
      'DEMAND_7Q_A/C_2': formatNumber(rrc.DEMAND_7Q_ACCOUNT_2 || 0),
      'DEMAND 7Q A/C 2': formatNumber(rrc.DEMAND_7Q_ACCOUNT_2 || 0),
      'DEMAND_7Q_A/C_10': formatNumber(rrc.DEMAND_7Q_ACCOUNT_10 || 0),
      'DEMAND 7Q A/C 10': formatNumber(rrc.DEMAND_7Q_ACCOUNT_10 || 0),
      'DEMAND_7Q_A/C_21': formatNumber(rrc.DEMAND_7Q_ACCOUNT_21 || 0),
      'DEMAND 7Q A/C 21': formatNumber(rrc.DEMAND_7Q_ACCOUNT_21 || 0),
      'DEMAND_7Q_A/C_22': formatNumber(rrc.DEMAND_7Q_ACCOUNT_22 || 0),
      'DEMAND 7Q A/C 22': formatNumber(rrc.DEMAND_7Q_ACCOUNT_22 || 0),
      
      // Amount in words
      'DEMAND_TOTAL_IN_WORDS': numberToWords(rrc.DEMAND_TOTAL || 0),
      'DEMAND TOTAL IN WORDS': numberToWords(rrc.DEMAND_TOTAL || 0), // Template uses this format
      'AMOUNT_IN_WORDS': numberToWords(rrc.DEMAND_TOTAL || 0),
      'AMOUNT IN WORDS': numberToWords(rrc.DEMAND_TOTAL || 0),
    };

    // Resolve template path
    const templatePath = resolveTemplatePath('cp1', templateFileName);

    // Log dispatch no for debugging
    logger.debug(`CP-1: Template data includes DISPATCH NO: "${templateData['DISPATCH NO']}"`);

    // Create and render template
    const doc = createDocxtemplater(templatePath);
    renderTemplate(doc, templateData);
    const buffer = generateBuffer(doc);

    // Create saved notices directory if it doesn't exist
    const savedNoticesDir = getSavedNoticesPath('CP-1');
    ensureDirectoryExists(savedNoticesDir);

    // Generate filename: CP-1_{ESTA_CODE}_{YYYYMMDD}.docx
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `CP-1_${estaCode}_${dateStr}.docx`;
    const filePath = path.join(savedNoticesDir, filename);

    // Save file
    saveNoticeFile(buffer, filePath);

    // Update REMARKS field if remark is provided (same as recovery entries)
    if (remark && remark.trim()) {
      try {
        await updateRemarksForEstaCode(username, estaCode, remark.trim(), '');
        logger.debug('CP-1: Remark updated successfully');
      } catch (err) {
        logger.error('CP-1: Failed to update remarks:', err);
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
    logger.error('Error generating CP-1 notice:', error);
    throw error;
  }
}

