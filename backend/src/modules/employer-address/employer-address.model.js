/**
 * Employer Address Model
 * Stores multiple employer names and addresses per ESTA_CODE
 */

import mongoose from 'mongoose';

const employerAddressSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    index: true,
  },
  ESTA_CODE: {
    type: String,
    required: true,
    index: true,
  },
  employerName: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
  pinCode: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound index for username and ESTA_CODE
employerAddressSchema.index({ username: 1, ESTA_CODE: 1 });

const EmployerAddress = mongoose.model('EmployerAddress', employerAddressSchema);

export default EmployerAddress;

