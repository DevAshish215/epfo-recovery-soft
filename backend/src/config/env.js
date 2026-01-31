/**
 * Environment Configuration
 * Loads environment variables from .env file
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple paths to find .env file
const envPaths = [
  path.join(__dirname, '../../.env'),        // backend/.env (from backend/src/config/)
  path.join(process.cwd(), '.env'),         // Current working directory
  path.join(process.cwd(), 'backend/.env'), // From project root
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    logger.info('✅ Loaded .env from:', envPath);
    envLoaded = true;
    break;
  }
}

// Fallback to default dotenv.config() if no .env found in expected locations
if (!envLoaded) {
dotenv.config();
  logger.warn('⚠️ Using default dotenv.config() - .env file may not be in expected location');
}

// Export PORT and MONGO_URI
export const PORT = process.env.PORT || 5000;
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/epfo_recovery';

// JWT Configuration
export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // 7 days

// Groq API Key
export const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Debug: Log if API key is loaded
if (GROQ_API_KEY) {
  logger.info('✅ GROQ_API_KEY loaded:', GROQ_API_KEY.substring(0, 10) + '...');
} else {
  logger.warn('⚠️ GROQ_API_KEY not found in environment variables');
  logger.info('Get your free API key from: https://console.groq.com');
}

