/**
 * File Utility Functions
 * Centralized file operations for template handling
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the base directory for templates
 * @returns {string} Base templates directory path
 */
export function getTemplatesBaseDir() {
  // __dirname is backend/src/utils/
  // Go up to backend/ then to templates/
  return path.join(__dirname, '../../templates');
}

/**
 * Resolve template file path
 * @param {string} templateType - Type of template (e.g., 'cp1', 'cp25', 'cp26')
 * @param {string} templateFileName - Name of the template file
 * @returns {string} Full path to template file
 */
export function resolveTemplatePath(templateType, templateFileName) {
  const baseDir = getTemplatesBaseDir();
  return path.join(baseDir, 'notices', templateType, templateFileName);
}

/**
 * Check if template file exists and is readable
 * @param {string} templatePath - Full path to template file
 * @returns {boolean} True if file exists and is readable
 */
export function isTemplateReadable(templatePath) {
  try {
    fs.accessSync(templatePath, fs.constants.R_OK);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Read template file as binary
 * @param {string} templatePath - Full path to template file
 * @returns {Buffer} File content as buffer
 */
export function readTemplateFile(templatePath) {
  return fs.readFileSync(templatePath, 'binary');
}

/**
 * Check if root-level Notice Formats folder exists and get template path
 * @param {string} templateType - Type of template
 * @param {string} templateFileName - Name of template file
 * @returns {string|null} Path to template in root folder, or null if not found
 */
export function getRootTemplatePath(templateType, templateFileName) {
  // Check root-level Notice Formats folder (for saved notices)
  // Go up from backend/src/utils/ to project root
  const projectRoot = path.join(__dirname, '../../../');
  const rootTemplatePath = path.join(projectRoot, 'backend', 'Notice Formats', templateType, templateFileName);
  
  if (isTemplateReadable(rootTemplatePath)) {
    return rootTemplatePath;
  }
  
  return null;
}

