/**
 * Main Routes
 */

import express from 'express';
import mongoose from 'mongoose';
import authRoutes from '../modules/auth/auth.routes.js';
import officeRoutes from '../modules/office/office.routes.js';
import rrcRoutes from '../modules/rrc/rrc.routes.js';
import establishmentRoutes from '../modules/establishment/establishment.routes.js';
import recoveryRoutes from '../modules/recovery/recovery.routes.js';
import noticesRoutes from '../modules/notices/notices.routes.js';
import employerAddressRoutes from '../modules/employer-address/employer-address.routes.js';

const router = express.Router();

/**
 * Health check endpoint for uptime monitoring (UptimeRobot)
 * GET /api/health
 * This endpoint is pinged every 5 minutes to keep the Render backend awake
 */
router.get('/health', (req, res) => {
  try {
    // Check database connection status
    const dbStatus = mongoose.connection.readyState;
    const dbStatusText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }[dbStatus] || 'unknown';

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()), // Server uptime in seconds
      database: dbStatusText,
      service: 'EPFO Recovery Soft Backend',
      version: '6.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Auth routes
router.use('/auth', authRoutes);

// Office routes
router.use('/office', officeRoutes);

// RRC routes
router.use('/rrc', rrcRoutes);

// Establishment routes
router.use('/establishment', establishmentRoutes);

// Recovery routes
router.use('/recovery', recoveryRoutes);

// Notices routes
router.use('/notices', noticesRoutes);

// Employer Address routes
router.use('/employer-address', employerAddressRoutes);

export default router;

