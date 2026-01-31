/**
 * ESTA Letter Generation Module
 * Handles generation of ESTA letters
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import RRC from '../rrc/rrc.model.js';
import Office from '../office/office.model.js';
import { updateRemarksForEstaCode } from '../rrc/rrc.service.js';
import logger from '../../utils/logger.js';
import { createDocxtemplater, renderTemplate, generateBuffer, ensureDirectoryExists, saveNoticeFile, getSavedNoticesPath } from './template.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate ESTA LETTER
 * @param {string} username - Username
 * @param {string} estaCode - ESTA CODE
 * @param {string} rrcNo - RRC NO
 * @param {string} date - Letter date (YYYY-MM-DD)
 * @param {string} employerName - Employer name
 * @param {string} estaName - ESTA name
 * @param {string} estaAddress - ESTA address
 * @param {string} subject - Letter subject
 * @param {string} letterBody - Letter body content
 * @param {string} regionalOffice - Regional office name
 * @returns {Object} { success, buffer, filename }
 */
export async function generateEstaLetter(
  username,
  estaCode,
  rrcNo,
  date,
  employerName,
  estaName,
  estaAddress,
  subject,
  letterBody,
  regionalOffice = '',
  remark = ''
) {
  try {
    // Fetch RRC data (for validation)
    const rrc = await RRC.findOne({
      username,
      ESTA_CODE: estaCode,
      RRC_NO: rrcNo,
      isDeleted: { $ne: true }
    });

    if (!rrc) {
      throw new Error('RRC not found');
    }

    // Fetch Office data for regional office name and DISPATCH NO
    let regionalOfficeName = regionalOffice;
    let dispatchNo = '';
    const office = await Office.findOne({ username });
    if (office) {
      if (!regionalOfficeName) {
        regionalOfficeName = office.regional_office_name || '';
      }
      dispatchNo = office.dispatch_no_for_letters_cps || '';
    }
    logger.debug(`ESTA Letter: Office found: ${!!office}, Dispatch No: "${dispatchNo}"`);

    // Format date to DD-MM-YYYY
    let formattedDate = '';
    if (date) {
      try {
        const dateParts = date.split('-');
        if (dateParts.length === 3) {
          formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // DD-MM-YYYY
        } else {
          formattedDate = date;
        }
      } catch (e) {
        formattedDate = date;
      }
    }

    // Prepare template data
    const templateData = {
      // Provide both underscore and space versions for compatibility
      'ESTA_CODE': String(estaCode || ''),
      'ESTA CODE': String(estaCode || ''),
      'DATE': String(formattedDate || date || ''),
      'EMPLOYER_NAME': String(employerName || ''),
      'EMPLOYER NAME': String(employerName || ''),
      'ESTA_NAME': String(estaName || ''),
      'ESTA NAME': String(estaName || ''),
      'ESTA_ADDRESS': String(estaAddress || ''),
      'ESTA ADDRESS': String(estaAddress || ''),
      'SUBJECT': String(subject || ''),
      'LETTER_BODY': String(letterBody || ''),
      'LETTER BODY': String(letterBody || ''),
      'RO': String(regionalOfficeName || ''),
      'DISPATCH_NO': String(dispatchNo || ''),
      'DISPATCH NO': String(dispatchNo || ''),
      'DISPATCHNO': String(dispatchNo || ''), // No space or underscore variant
      'Dispatch No': String(dispatchNo || ''), // Title case variant
      'Dispatch_No': String(dispatchNo || ''), // Title case with underscore
    };

    // Log dispatch no for debugging
    logger.debug(`ESTA Letter: Template data includes DISPATCH NO: "${templateData['DISPATCH NO']}"`);

    // Resolve template path - ESTA LETTER uses a different folder structure
    const templateFileName = 'Letter to Estt.docx';
    let templatePath = path.join(__dirname, '../../../templates/notices/ESTA LETTER', templateFileName);
    
    // Normalize path separators for Windows
    templatePath = path.normalize(templatePath);
    
    // If template not found in backend, try root Notice Formats folder
    if (!fs.existsSync(templatePath)) {
      const rootTemplatePath = path.normalize(path.join(process.cwd(), 'Notice Formats', templateFileName));
      if (fs.existsSync(rootTemplatePath)) {
        templatePath = rootTemplatePath;
        logger.debug('Using template from root Notice Formats folder:', templatePath);
      } else {
        logger.error('Template not found at:', templatePath);
        logger.error('Also checked:', rootTemplatePath);
        logger.debug('Current working directory:', process.cwd());
        logger.debug('__dirname:', __dirname);
        throw new Error(`ESTA LETTER template not found. Checked: ${templatePath} and ${rootTemplatePath}`);
      }
    } else {
      logger.debug('Using template path:', templatePath);
    }
    
    // Verify file is readable
    try {
      fs.accessSync(templatePath, fs.constants.R_OK);
    } catch (err) {
      throw new Error(`Template file exists but is not readable: ${templatePath}. Error: ${err.message}`);
    }

    // Create and render template
    const doc = createDocxtemplater(templatePath);
    logger.debug('Setting template data with keys:', Object.keys(templateData));
    renderTemplate(doc, templateData);
    logger.debug('ESTA LETTER template rendered successfully');
    const buffer = generateBuffer(doc);

    // Create saved notices directory if it doesn't exist
    const savedNoticesDir = getSavedNoticesPath('ESTA LETTER');
    ensureDirectoryExists(savedNoticesDir);

    // Generate filename: ESTA_LETTER_{ESTA_CODE}_{YYYYMMDD}.docx
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `ESTA_LETTER_${estaCode}_${dateStr}.docx`;
    const filePath = path.join(savedNoticesDir, filename);

    // Save file
    saveNoticeFile(buffer, filePath);

    // Update REMARKS field if remark is provided (same as recovery entries)
    if (remark && remark.trim()) {
      try {
        await updateRemarksForEstaCode(username, estaCode, remark.trim(), '');
        logger.debug('ESTA Letter: Remark updated successfully');
      } catch (err) {
        logger.error('ESTA Letter: Failed to update remarks:', err);
        // Don't fail the letter generation if remark update fails
      }
    }

    return {
      success: true,
      filePath,
      filename,
      buffer,
    };
  } catch (error) {
    logger.error('Error generating ESTA LETTER:', error);
    throw error;
  }
}

