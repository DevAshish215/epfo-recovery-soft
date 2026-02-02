/**
 * Server Entry Point
 */

import app from './app.js';
import connectDB from './config/db.js';
import { PORT } from './config/env.js';
import logger from './utils/logger.js';

// Connect to database
await connectDB();

// Start server - bind to 0.0.0.0 so Render/cloud can reach the port
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  logger.info(`Server running on ${HOST}:${PORT}`);
});

