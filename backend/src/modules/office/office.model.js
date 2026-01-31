/**
 * Office Model
 * Regional Office / Jurisdiction master data
 */

import mongoose from 'mongoose';

const officeSchema = new mongoose.Schema({
  // Username - unique identifier for data isolation
  // Each user has their own office details
  username: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  // Regional office code (can be shared by multiple offices)
  regional_office_code: {
    type: String,
    required: true,
    index: true,
  },
  regional_office_name: {
    type: String,
    required: true,
  },
  regional_office_address: {
    type: String,
    required: true,
  },
  regional_office_email: {
    type: String,
    required: true,
  },
  regional_office_phone: {
    type: String,
    required: true,
  },
  recovery_officer_names: {
    type: [String],
    default: [],
  },
  officer_designation: {
    type: String,
  },
  dispatch_no_for_letters_cps: {
    type: String,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  strict: true,
  timestamps: false,
});

const Office = mongoose.model('Office', officeSchema);

export default Office;

