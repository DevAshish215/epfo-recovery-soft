/**
 * Template Utility Functions
 * Shared template processing logic for notice generation
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import logger from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve template path - checks backend templates folder first, then root Notice Formats folder
 * @param {string} templateType - Type of template (e.g., 'cp1', 'cp25')
 * @param {string} templateFileName - Name of template file
 * @returns {string} Resolved template path
 */
export function resolveTemplatePath(templateType, templateFileName) {
  // __dirname is backend/src/modules/notices/
  // Go up to backend/ then to templates/notices/{templateType}/
  let templatePath = path.join(__dirname, '../../../templates/notices', templateType, templateFileName);
  
  // If template not found in backend, try root Notice Formats folder
  if (!fs.existsSync(templatePath)) {
    const rootTemplatePath = path.join(process.cwd(), 'Notice Formats', templateFileName);
    if (fs.existsSync(rootTemplatePath)) {
      templatePath = rootTemplatePath;
      logger.debug(`Using template from root Notice Formats folder: ${templatePath}`);
    } else {
      logger.error('Template not found at:', templatePath);
      logger.error('Also checked:', rootTemplatePath);
      throw new Error(`${templateType} template not found. Checked: ${templatePath} and ${rootTemplatePath}`);
    }
  }
  
  logger.debug('Using template path:', templatePath);
  return templatePath;
}

/**
 * Create Docxtemplater instance from template path
 * @param {string} templatePath - Full path to template file
 * @returns {Docxtemplater} Docxtemplater instance
 */
export function createDocxtemplater(templatePath) {
  // Read template file as binary
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  
  try {
    // Configure docxtemplater with explicit delimiters and nullGetter
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}'
      },
      nullGetter: function(part) {
        // Return empty string for missing/null values instead of throwing error
        return '';
      }
    });
    return doc;
  } catch (error) {
    logger.error('Error creating Docxtemplater:', error);
    logger.debug('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    
    // If it's a template error with duplicate tags, provide helpful guidance
    if (error.properties && error.properties.errors) {
      const hasDuplicateTags = error.properties.errors.some(e => 
        e.properties?.id === 'duplicate_open_tag' || e.properties?.id === 'duplicate_close_tag'
      );
      
      if (hasDuplicateTags) {
        const errorSummary = error.properties.errors
          .filter(e => e.properties?.id === 'duplicate_open_tag' || e.properties?.id === 'duplicate_close_tag')
          .slice(0, 10) // Show first 10 errors
          .map(e => {
            const tag = e.properties?.xtag || e.properties?.context || 'unknown';
            const offset = e.properties?.offset || 'unknown';
            const explanation = e.properties?.explanation || e.message || '';
            return `"${tag}" at offset ${offset} - ${explanation}`;
          })
          .join('\n');
        
        throw new Error(
          `Template has duplicate or split tags. This usually happens when Word splits template tags across different XML runs.\n\n` +
          `To fix this issue:\n` +
          `1. Open the template in Word\n` +
          `2. Press Ctrl+A to select all\n` +
          `3. Press Ctrl+Shift+F9 to unlink all fields (this removes field codes)\n` +
          `4. Or: Copy all text and paste as plain text into Notepad\n` +
          `5. Check that all tags are complete: {{TAG_NAME}} (not split)\n` +
          `6. Copy back to Word and ensure tags are not split across lines\n` +
          `7. Save the file\n\n` +
          `First few errors:\n${errorSummary}`
        );
      }
      
      // Other template errors
      const errorMessages = error.properties.errors
        .slice(0, 10)
        .map(e => {
          const tag = e.properties?.xtag || e.properties?.context || 'unknown';
          const offset = e.properties?.offset || 'unknown';
          const explanation = e.properties?.explanation || e.message || '';
          return `Tag "${tag}" at offset ${offset}: ${explanation}`;
        })
        .join('\n');
      throw new Error(`Template has formatting errors:\n${errorMessages}`);
    }
    
    throw new Error(`Failed to load template: ${error.message}`);
  }
}

/**
 * Render template with data
 * @param {Docxtemplater} doc - Docxtemplater instance
 * @param {Object} templateData - Data to render
 */
export function renderTemplate(doc, templateData) {
  // Replace placeholders
  doc.setData(templateData);
  
  try {
    doc.render();
  } catch (error) {
    logger.error('Error rendering template:', error);
    logger.debug('Template data keys:', Object.keys(templateData));
    
    // Check for specific docxtemplater errors
    if (error.properties && error.properties.errors instanceof Array) {
      const errors = error.properties.errors.map(e => {
        return {
          name: e.name,
          message: e.message,
          properties: e.properties
        };
      });
      logger.error('Template rendering errors:', JSON.stringify(errors, null, 2));
      
      // Check for missing tags
      const missingTags = errors.filter(e => 
        e.properties?.id === 'unopened_tag' || 
        e.properties?.id === 'unclosed_tag' ||
        e.message?.includes('not found')
      );
      
      if (missingTags.length > 0) {
        const missingTagNames = missingTags.map(e => 
          e.properties?.tag || e.properties?.xtag || 'unknown'
        ).join(', ');
        throw new Error(`Template has missing or unclosed tags: ${missingTagNames}. Please check that all tags in the template are properly closed with {{ and }}.`);
      }
      
      throw new Error(`Template rendering error: ${errors.map(e => e.message).join(', ')}`);
    }
    
    throw new Error(`Template rendering failed: ${error.message}`);
  }
}

/**
 * Generate buffer from rendered template
 * @param {Docxtemplater} doc - Rendered Docxtemplater instance
 * @returns {Buffer} Generated buffer
 */
export function generateBuffer(doc) {
  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
export function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get the Desktop/Saved Notices directory path
 * @param {string} noticeType - Optional notice type (e.g., 'CP-1', 'CP-25', 'CP-26', 'ESTA LETTER')
 * @returns {string} Path to Desktop/Saved Notices folder or subfolder
 */
export function getSavedNoticesPath(noticeType = null) {
  const desktopPath = path.join(os.homedir(), 'Desktop');
  const savedNoticesPath = path.join(desktopPath, 'Saved Notices');
  
  // If notice type is provided, return path to specific subfolder
  if (noticeType) {
    return path.join(savedNoticesPath, noticeType);
  }
  
  // Otherwise return base Saved Notices path
  return savedNoticesPath;
}

/**
 * Save generated notice to file
 * @param {Buffer} buffer - Generated buffer
 * @param {string} filePath - Full path to save file
 */
export function saveNoticeFile(buffer, filePath) {
  fs.writeFileSync(filePath, buffer);
}

