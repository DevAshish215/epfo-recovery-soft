/**
 * Income Tax Letter Generation Module
 * Handles generation of Income Tax disclosure application (u/s 138 IT Act) and Form 46
 */

import path from 'path';
import RRC from '../rrc/rrc.model.js';
import Establishment from '../establishment/establishment.model.js';
import Office from '../office/office.model.js';
import { updateRemarksForEstaCode } from '../rrc/rrc.service.js';
import logger from '../../utils/logger.js';
import { formatDateDDMMMYYYY } from '../../utils/date.util.js';
import { formatNumber } from './helpers.js';
import { resolveTemplatePath, createDocxtemplater, renderTemplate, generateBuffer, ensureDirectoryExists, saveNoticeFile, getSavedNoticesPath } from './template.util.js';

/**
 * Generate Income Tax Letter (application u/s 138 + Form 46)
 * @param {string} username
 * @param {string} estaCode
 * @param {string} rrcNo
 * @param {string} noticeDate
 * @param {string} incomeTaxAddress - Address of Pr. Chief Commissioner of Income Tax
 * @param {string} officerName - Officer signing the letter (not necessarily recovery officer)
 * @param {string} officerFatherName - S/o [Officer Father Name]
 * @param {string} officerDesignation - Officer designation
 * @param {Array<{name:string,pan:string,designation:string}>} employers - Multiple employers with name, pan, designation
 * @param {string} officeAddress - Office / RO address (optional; overrides office regional_office_address)
 * @param {string} regionalOfficeName
 * @param {string} remark
 */
export async function generateIncomeTaxLetter(
  username,
  estaCode,
  rrcNo,
  noticeDate,
  incomeTaxAddress,
  officerName = '',
  officerFatherName = '',
  officerDesignation = '',
  employers = [],
  officeAddress = '',
  regionalOfficeName = '',
  remark = ''
) {
  try {
    const allRRCs = await RRC.find({
      username,
      ESTA_CODE: estaCode,
      isDeleted: { $ne: true },
    }).sort({ RRC_DATE: 1, RRC_NO: 1 });

    if (!allRRCs || allRRCs.length === 0) {
      throw new Error('No RRCs found for this ESTA_CODE');
    }

    const selectedRRC = allRRCs.find((r) => r.RRC_NO === rrcNo);
    if (!selectedRRC) {
      throw new Error('Selected RRC not found');
    }

    const establishment = await Establishment.findOne({
      username,
      ESTA_CODE: estaCode,
    });

    const office = await Office.findOne({ username });
    const dispatchNo = office?.dispatch_no_for_letters_cps || '';
    const officerNameResolved = (officerName && String(officerName).trim())
      ? String(officerName).trim()
      : (office?.recovery_officer_names && office.recovery_officer_names.length > 0)
        ? office.recovery_officer_names[0]
        : '';
    const officerDesignationResolved = (officerDesignation && String(officerDesignation).trim())
      ? String(officerDesignation).trim()
      : (office?.officer_designation || '');
    const roAddress = (officeAddress && String(officeAddress).trim())
      ? String(officeAddress).trim()
      : (office?.regional_office_address || regionalOfficeName || '');

    let outstandTotWithRecRRC = 0;
    allRRCs.forEach((rrc) => {
      outstandTotWithRecRRC += parseFloat(rrc.OUTSTAND_TOT_WITH_REC_RRC || rrc.OUTSTAND_TOT_WITH_REC || 0);
    });

    const us = selectedRRC.U_S || '';
    const rrcPeriod = selectedRRC.RRC_PERIOD || selectedRRC.PERIOD || '';
    const formattedDate = formatDateDDMMMYYYY(noticeDate);

    const employersList = Array.isArray(employers) ? employers.filter((e) => e && (String(e.name || '').trim() || String(e.pan || '').trim())) : [];
    const employerEntries = employersList.map((e) => {
      const n = String(e.name || '').trim();
      const p = String(e.pan || '').trim();
      const d = String(e.designation || '').trim();
      const part = p ? `${n || '—'} (${p})` : (n || '—');
      return { name: n || '—', pan: p, designation: d, formatted: d ? `${part}, ${d}` : part };
    }).filter((e) => e.name !== '—' || e.pan);
    const employersListFormatted = employerEntries.map((e) => e.formatted).join('; ');
    const employersListNewlines = employerEntries.map((e) => e.formatted).join('\n');
    const firstEmployer = employerEntries[0];
    const employerNameSingle = firstEmployer ? firstEmployer.name : (establishment?.ESTA_NAME || selectedRRC.ESTA_NAME || '');
    const employerPANSingle = firstEmployer ? firstEmployer.pan : (establishment?.ESTABLISHMENT_PAN || selectedRRC.ESTA_PAN || '');
    const designationSingle = firstEmployer ? firstEmployer.designation : '';
    const employersForLoop = employerEntries.map((e) => ({ name: e.name, pan: e.pan, designation: e.designation }));

    const templateData = {
      'DISPATCH_NO': String(dispatchNo || ''),
      'DISPATCH NO': String(dispatchNo || ''),
      'ESTA_CODE': String(selectedRRC.ESTA_CODE || estaCode || ''),
      'ESTA CODE': String(selectedRRC.ESTA_CODE || estaCode || ''),
      'DATE': String(formattedDate || noticeDate || ''),
      'Income Tax Address': String(incomeTaxAddress || ''),
      'Income_Tax_Address': String(incomeTaxAddress || ''),
      'OFFICER NAME': String(officerNameResolved || ''),
      'OFFICER_NAME': String(officerNameResolved || ''),
      'OFFICER FATHER NAME': String(officerFatherName || '').trim(),
      'OFFICER_FATHER_NAME': String(officerFatherName || '').trim(),
      'OFFICER DESIGNATION': String(officerDesignationResolved || ''),
      'OFFICER_DESIGNATION': String(officerDesignationResolved || ''),
      'RO ADDRESS': String(roAddress || ''),
      'RO_ADDRESS': String(roAddress || ''),
      'EMPLOYERS_LIST': String(employersListFormatted || employerNameSingle),
      'EMPLOYERS LIST': String(employersListFormatted || employerNameSingle),
      'EMPLOYERS_LIST_NEWLINES': String(employersListNewlines || employerNameSingle),
      'EMPLOYERS LIST NEWLINES': String(employersListNewlines || employerNameSingle),
      employers: employersForLoop,
      'EMPLOYER NAME': String(employerNameSingle || ''),
      'EMPLOYER_NAME': String(employerNameSingle || ''),
      'EMPLOYER PAN': String(employerPANSingle || ''),
      'EMPLOYER_PAN': String(employerPANSingle || ''),
      'DESIGNATION OF EMPLOYER': String(designationSingle || ''),
      'DESIGNATION_OF_EMPLOYER': String(designationSingle || ''),
      'ESTA NAME': String(selectedRRC.ESTA_NAME || establishment?.ESTA_NAME || ''),
      'ESTA_NAME': String(selectedRRC.ESTA_NAME || establishment?.ESTA_NAME || ''),
      'OUTSTAND TOT WITH REC RRC': formatNumber(outstandTotWithRecRRC),
      'OUTSTAND_TOT_WITH_REC_RRC': formatNumber(outstandTotWithRecRRC),
      'U/S': String(us || ''),
      'U_S': String(us || ''),
      'RRC PERIOD': String(rrcPeriod || ''),
      'RRC_PERIOD': String(rrcPeriod || ''),
    };

    const templateFileName = 'LETTER TO INCOME TAX FORM 46.docx';
    const templatePath = resolveTemplatePath('incomeTaxLetter', templateFileName);

    const doc = createDocxtemplater(templatePath);
    renderTemplate(doc, templateData);
    const buffer = generateBuffer(doc);

    const savedNoticesDir = getSavedNoticesPath('Income Tax Letter');
    ensureDirectoryExists(savedNoticesDir);

    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `Income_Tax_Letter_${estaCode}_${dateStr}.docx`;
    const filePath = path.join(savedNoticesDir, filename);

    saveNoticeFile(buffer, filePath);

    if (remark && remark.trim()) {
      try {
        await updateRemarksForEstaCode(username, estaCode, remark.trim(), '');
        logger.debug('Income Tax Letter: Remark updated successfully');
      } catch (err) {
        logger.error('Income Tax Letter: Failed to update remarks:', err);
      }
    }

    return { success: true, filePath, filename, buffer };
  } catch (error) {
    logger.error('Error generating Income Tax Letter:', error);
    throw error;
  }
}
