/**
 * Establishment Model
 * Establishment/Muster data model
 * One ESTA_CODE per establishment
 */

import mongoose from 'mongoose';

const establishmentSchema = new mongoose.Schema({
  // Username - primary identifier for data isolation
  // Each user has their own establishment data
  username: {
    type: String,
    required: true,
    index: true,
  },
  // Regional office code (can be shared by multiple offices, optional)
  regional_office_code: {
    type: String,
    default: '',
    index: true,
  },

  // Establishment code (unique per regional office)
  ESTA_CODE: {
    type: String,
    required: true,
    index: true,
  },
  ESTA_NAME: {
    type: String,
  },

  // Address fields
  ADD1: {
    type: String,
  },
  ADD2: {
    type: String,
  },
  CITY: {
    type: String,
  },
  DIST: {
    type: String,
  },
  PIN_CODE: {
    type: String,
  },
  CIRCLE: {
    type: String,
  },

  // Contact fields
  MOBILE_NO: {
    type: String,
  },
  EMAIL: {
    type: String,
  },

  // Status and PAN
  STATUS: {
    type: String,
  },
  ESTABLISHMENT_PAN: {
    type: String,
  },
}, {
  strict: true, // Strict schema - only defined fields allowed
  timestamps: false, // No automatic timestamps
});

// Compound index: ESTA_CODE must be unique per user
establishmentSchema.index({ username: 1, ESTA_CODE: 1 }, { unique: true });

// Index on ESTA_CODE for faster lookups
establishmentSchema.index({ ESTA_CODE: 1 });

const Establishment = mongoose.model('Establishment', establishmentSchema);

export default Establishment;

