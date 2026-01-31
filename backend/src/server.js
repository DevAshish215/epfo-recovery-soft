/**
 * Server Entry Point
 */

import app from './app.js';
import connectDB from './config/db.js';
import { PORT } from './config/env.js';
import logger from './utils/logger.js';

// Connect to database
await connectDB();

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

