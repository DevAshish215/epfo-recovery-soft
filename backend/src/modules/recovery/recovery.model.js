/**
 * Recovery Model
 * DD/TRRN based recovery transaction model
 * Each recovery transaction represents one DD (Demand Draft) or TRRN (Transaction Reference Number)
 */

import mongoose from 'mongoose';

const recoverySchema = new mongoose.Schema({
  // Username - primary identifier for data isolation
  // Each user has their own recovery transactions
  username: {
    type: String,
    required: true,
    index: true,
  },
  
  // Regional office code (can be shared by multiple offices)
  regional_office_code: {
    type: String,
    required: false,
    default: '',
    index: true,
  },

  // Establishment and RRC identification
  ESTA_CODE: {
    type: String,
    required: true,
    index: true,
  },
  RRC_NO: {
    type: String,
    required: true,
    index: true,
  },

  // Recovery transaction details
  RECOVERY_AMOUNT: {
    type: Number,
    required: true,
    default: 0,
  },
  BANK_NAME: {
    type: String,
    required: true,
  },
  RECOVERY_DATE: {
    type: Date,
    required: true,
  },
  DD_TRRN_DATE: {
    type: Date,
    required: true,
  },
  REFERENCE_NUMBER: {
    type: String,
    required: true,
  },
  TRANSACTION_TYPE: {
    type: String,
    enum: ['DD', 'TRRN'],
    required: true,
  },

  // Allocation details (how the recovery was allocated)
  // These fields store the breakdown of how RECOVERY_AMOUNT was allocated
  ALLOCATED_7A: {
    type: Number,
    default: 0,
  },
  ALLOCATED_7Q: {
    type: Number,
    default: 0,
  },
  ALLOCATED_14B: {
    type: Number,
    default: 0,
  },

  // Account-wise allocation breakdown (for detailed tracking)
  // Section 7A accounts
  ALLOCATED_7A_ACCOUNT_1_EE: {
    type: Number,
    default: 0,
  },
  ALLOCATED_7A_ACCOUNT_1_ER: {
    type: Number,
    default: 0,
  },
  ALLOCATED_7A_ACCOUNT_10: {
    type: Number,
    default: 0,
  },
  ALLOCATED_7A_ACCOUNT_21: {
    type: Number,
    default: 0,
  },
  ALLOCATED_7A_ACCOUNT_2: {
    type: Number,
    default: 0,
  },
  ALLOCATED_7A_ACCOUNT_22: {
    type: Number,
    default: 0,
  },

  // Section 7Q accounts
  ALLOCATED_7Q_ACCOUNT_1: {
    type: Number,
    default: 0,
  },
  ALLOCATED_7Q_ACCOUNT_10: {
    type: Number,
    default: 0,
  },
  ALLOCATED_7Q_ACCOUNT_21: {
    type: Number,
    default: 0,
  },
  ALLOCATED_7Q_ACCOUNT_2: {
    type: Number,
    default: 0,
  },
  ALLOCATED_7Q_ACCOUNT_22: {
    type: Number,
    default: 0,
  },

  // Section 14B accounts
  ALLOCATED_14B_ACCOUNT_1: {
    type: Number,
    default: 0,
  },
  ALLOCATED_14B_ACCOUNT_10: {
    type: Number,
    default: 0,
  },
  ALLOCATED_14B_ACCOUNT_21: {
    type: Number,
    default: 0,
  },
  ALLOCATED_14B_ACCOUNT_2: {
    type: Number,
    default: 0,
  },
  ALLOCATED_14B_ACCOUNT_22: {
    type: Number,
    default: 0,
  },

  // Recovery Cost (ESTA-level field)
  RECOVERY_COST: {
    type: Number,
    default: 0,
  },

  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  strict: true,
  timestamps: false,
});

// Indexes for faster queries
recoverySchema.index({ username: 1, ESTA_CODE: 1, RRC_NO: 1 });
recoverySchema.index({ username: 1, RECOVERY_DATE: -1 });
// Compound index to prevent duplicate DD/TRRN entries (same REFERENCE_NUMBER and DD_TRRN_DATE for same username)
recoverySchema.index({ username: 1, REFERENCE_NUMBER: 1, DD_TRRN_DATE: 1 }, { unique: true });

const Recovery = mongoose.model('Recovery', recoverySchema);

export default Recovery;

