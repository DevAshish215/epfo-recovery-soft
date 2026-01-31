/**
 * DD to Cash Section Letter Generation Module
 * Handles generation of DD to Cash section letters
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import RRC from '../rrc/rrc.model.js';
import Establishment from '../establishment/establishment.model.js';
import Recovery from '../recovery/recovery.model.js';
import logger from '../../utils/logger.js';
import { formatDateDDMMMYYYY } from '../../utils/date.util.js';
import { formatNumber, numberToWords, formatRRCDate, parseUSValue } from './helpers.js';
import { createDocxtemplater, renderTemplate, generateBuffer } from './template.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate DD to Cash Section Letter
 * @param {string} username - Username
 * @param {string} recoveryId - Recovery transaction ID
 * @param {Object} officeData - Office data with regional_office_name
 * @returns {Object} { success, buffer, filename }
 */
export async function generateDDToCashSectionLetter(username, recoveryId, officeData = {}) {
  try {
    // Fetch recovery transaction
    const recovery = await Recovery.findById(recoveryId);
    if (!recovery || recovery.username !== username) {
      throw new Error('Recovery transaction not found');
    }

    // Fetch RRC data
    const rrc = await RRC.findOne({
      username: username,
      ESTA_CODE: recovery.ESTA_CODE,
      RRC_NO: recovery.RRC_NO,
    });

    if (!rrc) {
      throw new Error('RRC not found');
    }

    // Fetch Establishment data
    const establishment = await Establishment.findOne({
      username: username,
      ESTA_CODE: recovery.ESTA_CODE
    });

    // Determine template based on U/S
    const usValue = rrc.U_S || '';
    const sections = parseUSValue(usValue);
    
    // If U/S contains only 7A (and not 14B or 7Q), use 7A template
    // Otherwise use 14B_7Q template
    const templateFileName = (sections.has7A && !sections.has14B && !sections.has7Q)
      ? 'DD to Cashier 7A.docx'
      : 'DD to Cashier 14B_7Q.docx';

    // Format dates
    const currentDate = formatDateDDMMMYYYY(new Date());
    const ddDate = formatDateDDMMMYYYY(recovery.DD_TRRN_DATE);
    const rrcDate = formatRRCDate(rrc.RRC_DATE);
    const period = rrc.RRC_PERIOD || rrc.PERIOD || '';

    // Calculate totals
    const total14B = (recovery.ALLOCATED_14B_ACCOUNT_1 || 0) +
                     (recovery.ALLOCATED_14B_ACCOUNT_2 || 0) +
                     (recovery.ALLOCATED_14B_ACCOUNT_10 || 0) +
                     (recovery.ALLOCATED_14B_ACCOUNT_21 || 0) +
                     (recovery.ALLOCATED_14B_ACCOUNT_22 || 0);

    const total7Q = (recovery.ALLOCATED_7Q_ACCOUNT_1 || 0) +
                    (recovery.ALLOCATED_7Q_ACCOUNT_2 || 0) +
                    (recovery.ALLOCATED_7Q_ACCOUNT_10 || 0) +
                    (recovery.ALLOCATED_7Q_ACCOUNT_21 || 0) +
                    (recovery.ALLOCATED_7Q_ACCOUNT_22 || 0);

    const total7A = (recovery.ALLOCATED_7A_ACCOUNT_1_EE || 0) +
                    (recovery.ALLOCATED_7A_ACCOUNT_1_ER || 0) +
                    (recovery.ALLOCATED_7A_ACCOUNT_2 || 0) +
                    (recovery.ALLOCATED_7A_ACCOUNT_10 || 0) +
                    (recovery.ALLOCATED_7A_ACCOUNT_21 || 0) +
                    (recovery.ALLOCATED_7A_ACCOUNT_22 || 0);

    const recoveryAmount = recovery.RECOVERY_AMOUNT || 0;

    // Prepare template data
    const templateData = {
      // Basic fields
      'ESTA CODE': String(recovery.ESTA_CODE || ''),
      'ESTA_CODE': String(recovery.ESTA_CODE || ''),
      'DATE': String(currentDate || ''),
      'ESTA NAME': String(rrc.ESTA_NAME || establishment?.ESTA_NAME || ''),
      'ESTA_NAME': String(rrc.ESTA_NAME || establishment?.ESTA_NAME || ''),
      'BANK NAME': String(recovery.BANK_NAME || ''),
      'BANK_NAME': String(recovery.BANK_NAME || ''),
      'DD NO': String(recovery.REFERENCE_NUMBER || ''),
      'DD_NO': String(recovery.REFERENCE_NUMBER || ''),
      'DD DATE': String(ddDate || ''),
      'DD_DATE': String(ddDate || ''),
      'RECOVERY AMT': formatNumber(recoveryAmount),
      'RECOVERY_AMT': formatNumber(recoveryAmount),
      'RRC NO': String(recovery.RRC_NO || ''),
      'RRC_NO': String(recovery.RRC_NO || ''),
      'RRC DATE': String(rrcDate || ''),
      'RRC_DATE': String(rrcDate || ''),
      'PERIOD': String(period || ''),
      'RO': String(officeData?.regional_office_name || ''),
      'DISPATCH_NO': String(officeData?.dispatch_no_for_letters_cps || ''),
      'DISPATCH NO': String(officeData?.dispatch_no_for_letters_cps || ''),
      'DISPATCHNO': String(officeData?.dispatch_no_for_letters_cps || ''), // No space or underscore variant
      'Dispatch No': String(officeData?.dispatch_no_for_letters_cps || ''), // Title case variant
      'Dispatch_No': String(officeData?.dispatch_no_for_letters_cps || ''), // Title case with underscore
      
      // 14B Account allocations
      'ALLOCATED_14B_AC_1': formatNumber(recovery.ALLOCATED_14B_ACCOUNT_1 || 0),
      'ALLOCATED_14B_AC_2': formatNumber(recovery.ALLOCATED_14B_ACCOUNT_2 || 0),
      'ALLOCATED_14B_AC_10': formatNumber(recovery.ALLOCATED_14B_ACCOUNT_10 || 0),
      'ALLOCATED_14B_AC_21': formatNumber(recovery.ALLOCATED_14B_ACCOUNT_21 || 0),
      'ALLOCATED_14B_AC_22': formatNumber(recovery.ALLOCATED_14B_ACCOUNT_22 || 0),
      'TOTAL_ALLOCATED_14B': formatNumber(total14B),
      
      // 7Q Account allocations
      'ALLOCATED_7Q_AC_1': formatNumber(recovery.ALLOCATED_7Q_ACCOUNT_1 || 0),
      'ALLOCATED_7Q_AC_2': formatNumber(recovery.ALLOCATED_7Q_ACCOUNT_2 || 0),
      'ALLOCATED_7Q_AC_10': formatNumber(recovery.ALLOCATED_7Q_ACCOUNT_10 || 0),
      'ALLOCATED_7Q_AC_21': formatNumber(recovery.ALLOCATED_7Q_ACCOUNT_21 || 0),
      'ALLOCATED_7Q_AC_22': formatNumber(recovery.ALLOCATED_7Q_ACCOUNT_22 || 0),
      'TOTAL_ALLOCATED_7Q': formatNumber(total7Q),
      
      // 7A Account allocations (for 7A template only)
      'ALLOCATED_7A_AC_1_EE': formatNumber(recovery.ALLOCATED_7A_ACCOUNT_1_EE || 0),
      'ALLOCATED_7A_AC_1_ER': formatNumber(recovery.ALLOCATED_7A_ACCOUNT_1_ER || 0),
      'ALLOCATED_7A_AC_2': formatNumber(recovery.ALLOCATED_7A_ACCOUNT_2 || 0),
      'ALLOCATED_7A_AC_10': formatNumber(recovery.ALLOCATED_7A_ACCOUNT_10 || 0),
      'ALLOCATED_7A_AC_21': formatNumber(recovery.ALLOCATED_7A_ACCOUNT_21 || 0),
      'ALLOCATED_7A_AC_22': formatNumber(recovery.ALLOCATED_7A_ACCOUNT_22 || 0),
      'TOTAL_ALLOCATED_7A': formatNumber(total7A),
      
      // Recovery Cost
      'REC COST': formatNumber(recovery.RECOVERY_COST || 0),
      'REC_COST': formatNumber(recovery.RECOVERY_COST || 0),
      
      // Total recovery amount
      'RECOVEY_AMOUNT': formatNumber(recoveryAmount),
      'RECOVERY_AMOUNT': formatNumber(recoveryAmount),
      'RECOVERY_AMOUNTS_IN_WORDS': numberToWords(recoveryAmount),
    };

    // Resolve template path - DD to Cash uses a different folder structure
    // Try backend templates folder first, then root Notice Formats folder
    let templatePath = path.join(__dirname, '../../../templates/notices/dd to cash section', templateFileName);
    
    // If template not found in backend, try root Notice Formats folder
    if (!fs.existsSync(templatePath)) {
      const rootTemplatePath = path.join(process.cwd(), 'Notice Formats', 'dd to cash section', templateFileName);
      if (fs.existsSync(rootTemplatePath)) {
        templatePath = rootTemplatePath;
        logger.debug('Using template from root Notice Formats folder');
      } else {
        logger.error('Template not found at:', templatePath);
        logger.error('Also checked:', rootTemplatePath);
        throw new Error(`DD to Cash template not found: ${templateFileName}. Checked: ${templatePath} and ${rootTemplatePath}`);
      }
    }
    
    logger.debug('Using template path:', templatePath);

    // Create and render template
    const doc = createDocxtemplater(templatePath);
    renderTemplate(doc, templateData);
    const buffer = generateBuffer(doc);

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `DD_to_Cash_${recovery.ESTA_CODE}_${dateStr}.docx`;

    return {
      success: true,
      buffer,
      filename,
    };
  } catch (error) {
    logger.error('Error generating DD to Cash letter:', error);
    throw error;
  }
}

