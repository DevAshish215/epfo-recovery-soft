/**
 * Database Configuration
 * Connects to MongoDB using Mongoose
 * This file handles the connection to the MongoDB database
 */

import mongoose from 'mongoose';
import { MONGO_URI } from './env.js';
import logger from '../utils/logger.js';

/**
 * Connect to MongoDB database
 * This function tries to connect to MongoDB using the connection string
 * If connection fails, the application will exit (we can't run without a database)
 */
async function connectDB() {
  try {
    // Connect to MongoDB using the connection string from environment variables
    // mongoose.connect() returns a promise, so we use await to wait for it
    await mongoose.connect(MONGO_URI);
    
    // If we get here, connection was successful
    logger.info('MongoDB connected successfully');
  } catch (error) {
    // If connection fails, log the error message
    logger.error('MongoDB connection failed:', error);
    
    // Exit the application with error code 1
    // This stops the server because we can't work without a database
    process.exit(1);
  }
}

export default connectDB;

