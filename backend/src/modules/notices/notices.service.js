/**
 * Notices Service
 * Main service file that re-exports notice generation functions from modules
 * This maintains backward compatibility while allowing modular organization
 */

// Re-export all notice generation functions from their respective modules
export { generateCP1Notice } from './cp1.js';
export { generateCP25Notice } from './cp25.js';
export { generateCP26Notice } from './cp26.js';
export { generateSummonNotice } from './summon.js';
export { generateCP3BankNotice } from './cp3Bank.js';
export { generateIncomeTaxLetter } from './incomeTaxLetter.js';
export { generateDDToCashSectionLetter } from './ddToCash.js';
export { generateEstaLetter } from './estaLetter.js';
export { generateLetterBodyFromPrompt } from './aiLetter.js';
