/**
 * RRC Model
 * Recovery Certificate data model
 * Strict schema - only specified fields are saved
 */

import mongoose from 'mongoose';

const rrcSchema = new mongoose.Schema({
  // Username - primary identifier for data isolation
  // Each user has their own RRC data
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

  // Basic identification fields (from Excel)
  ESTA_CODE: {
    type: String,
    required: true,
    // Index defined via schema.index() below to avoid duplicate
  },
  IR_NIR: {
    type: String,
  },
  ESTA_NAME: {
    type: String,
    required: true,
  },
  RRC_NO: {
    type: String,
    required: true,
    index: true, // Index for faster lookups
  },
  RRC_DATE: {
    type: Date,
    required: true,
  },
  RRC_PERIOD: {
    type: String,
  },
  U_S: {
    type: String,
  },

  // Address & Contact Fields
  RO: {
    type: String,
  },
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
  PIN_CD: {
    type: String,
  },
  CIRCLE: {
    type: String,
  },
  MOBILE_NO: {
    type: String,
  },
  EMAIL: {
    type: String,
  },
  STATUS: {
    type: String,
  },
  ESTA_PAN: {
    type: String,
  },

  // Date Fields
  CP_1_DATE: {
    type: Date,
  },

  // Other Fields
  REMARKS: {
    type: String,
  },
  ENFORCEMENT_OFFICER: {
    type: String,
  },

  // Demand fields (from Excel) - Section level
  DEMAND_7A: {
    type: Number,
    default: 0,
  },
  DEMAND_14B: {
    type: Number,
    default: 0,
  },
  DEMAND_7Q: {
    type: Number,
    default: 0,
  },

  // Demand fields - Account-wise for 7A
  DEMAND_7A_ACCOUNT_1_EE: {
    type: Number,
    default: 0,
  },
  DEMAND_7A_ACCOUNT_1_ER: {
    type: Number,
    default: 0,
  },
  DEMAND_7A_ACCOUNT_2: {
    type: Number,
    default: 0,
  },
  DEMAND_7A_ACCOUNT_10: {
    type: Number,
    default: 0,
  },
  DEMAND_7A_ACCOUNT_21: {
    type: Number,
    default: 0,
  },
  DEMAND_7A_ACCOUNT_22: {
    type: Number,
    default: 0,
  },

  // Demand fields - Account-wise for 14B
  DEMAND_14B_ACCOUNT_1: {
    type: Number,
    default: 0,
  },
  DEMAND_14B_ACCOUNT_2: {
    type: Number,
    default: 0,
  },
  DEMAND_14B_ACCOUNT_10: {
    type: Number,
    default: 0,
  },
  DEMAND_14B_ACCOUNT_21: {
    type: Number,
    default: 0,
  },
  DEMAND_14B_ACCOUNT_22: {
    type: Number,
    default: 0,
  },

  // Demand fields - Account-wise for 7Q
  DEMAND_7Q_ACCOUNT_1: {
    type: Number,
    default: 0,
  },
  DEMAND_7Q_ACCOUNT_2: {
    type: Number,
    default: 0,
  },
  DEMAND_7Q_ACCOUNT_10: {
    type: Number,
    default: 0,
  },
  DEMAND_7Q_ACCOUNT_21: {
    type: Number,
    default: 0,
  },
  DEMAND_7Q_ACCOUNT_22: {
    type: Number,
    default: 0,
  },

  // Recovery fields (from Excel) - Section level
  RECOVERY_7A: {
    type: Number,
    default: 0,
  },
  RECOVERY_14B: {
    type: Number,
    default: 0,
  },
  RECOVERY_7Q: {
    type: Number,
    default: 0,
  },

  // Recovery fields - Account-wise for 7A
  RECOVERY_7A_ACCOUNT_1_EE: {
    type: Number,
    default: 0,
  },
  RECOVERY_7A_ACCOUNT_1_ER: {
    type: Number,
    default: 0,
  },
  RECOVERY_7A_ACCOUNT_2: {
    type: Number,
    default: 0,
  },
  RECOVERY_7A_ACCOUNT_10: {
    type: Number,
    default: 0,
  },
  RECOVERY_7A_ACCOUNT_21: {
    type: Number,
    default: 0,
  },
  RECOVERY_7A_ACCOUNT_22: {
    type: Number,
    default: 0,
  },

  // Recovery fields - Account-wise for 14B
  RECOVERY_14B_ACCOUNT_1: {
    type: Number,
    default: 0,
  },
  RECOVERY_14B_ACCOUNT_2: {
    type: Number,
    default: 0,
  },
  RECOVERY_14B_ACCOUNT_10: {
    type: Number,
    default: 0,
  },
  RECOVERY_14B_ACCOUNT_21: {
    type: Number,
    default: 0,
  },
  RECOVERY_14B_ACCOUNT_22: {
    type: Number,
    default: 0,
  },

  // Recovery fields - Account-wise for 7Q
  RECOVERY_7Q_ACCOUNT_1: {
    type: Number,
    default: 0,
  },
  RECOVERY_7Q_ACCOUNT_2: {
    type: Number,
    default: 0,
  },
  RECOVERY_7Q_ACCOUNT_10: {
    type: Number,
    default: 0,
  },
  RECOVERY_7Q_ACCOUNT_21: {
    type: Number,
    default: 0,
  },
  RECOVERY_7Q_ACCOUNT_22: {
    type: Number,
    default: 0,
  },

  // Computed fields (calculated by backend)
  DEMAND_TOTAL: {
    type: Number,
    default: 0,
  },
  RECOVERY_TOTAL: {
    type: Number,
    default: 0,
  },
  // Outstanding fields - Section level (computed)
  OUTSTAND_7A: {
    type: Number,
    default: 0,
  },
  OUTSTAND_14B: {
    type: Number,
    default: 0,
  },
  OUTSTAND_7Q: {
    type: Number,
    default: 0,
  },
  OUTSTAND_TOTAL: {
    type: Number,
    default: 0,
  },

  // Outstanding fields - Account-wise for 7A (computed)
  OUTSTAND_7A_ACCOUNT_1_EE: {
    type: Number,
    default: 0,
  },
  OUTSTAND_7A_ACCOUNT_1_ER: {
    type: Number,
    default: 0,
  },
  OUTSTAND_7A_ACCOUNT_2: {
    type: Number,
    default: 0,
  },
  OUTSTAND_7A_ACCOUNT_10: {
    type: Number,
    default: 0,
  },
  OUTSTAND_7A_ACCOUNT_21: {
    type: Number,
    default: 0,
  },
  OUTSTAND_7A_ACCOUNT_22: {
    type: Number,
    default: 0,
  },

  // Outstanding fields - Account-wise for 14B (computed)
  OUTSTAND_14B_ACCOUNT_1: {
    type: Number,
    default: 0,
  },
  OUTSTAND_14B_ACCOUNT_2: {
    type: Number,
    default: 0,
  },
  OUTSTAND_14B_ACCOUNT_10: {
    type: Number,
    default: 0,
  },
  OUTSTAND_14B_ACCOUNT_21: {
    type: Number,
    default: 0,
  },
  OUTSTAND_14B_ACCOUNT_22: {
    type: Number,
    default: 0,
  },

  // Outstanding fields - Account-wise for 7Q (computed)
  OUTSTAND_7Q_ACCOUNT_1: {
    type: Number,
    default: 0,
  },
  OUTSTAND_7Q_ACCOUNT_2: {
    type: Number,
    default: 0,
  },
  OUTSTAND_7Q_ACCOUNT_10: {
    type: Number,
    default: 0,
  },
  OUTSTAND_7Q_ACCOUNT_21: {
    type: Number,
    default: 0,
  },
  OUTSTAND_7Q_ACCOUNT_22: {
    type: Number,
    default: 0,
  },

  // ESTA-level fields (same for all RRCs with same ESTA_CODE)
  RECOVERY_COST: {
    type: Number,
    default: 0,
  },
  RECEVIED_REC_COST: {
    type: Number,
    default: 0,
  },
  OUTSTAND_REC_COST: {
    type: Number,
    default: 0,
  },
  OUTSTAND_TOT_WITH_REC: {
    type: Number,
    default: 0,
  },

  // RRC-level fields (calculated by grouping ESTA_CODE)
  DEMAND_TOTAL_RRC: {
    type: Number,
    default: 0,
  },
  RECOVERY_TOTAL_RRC: {
    type: Number,
    default: 0,
  },
  OUTSTAND_TOTAL_RRC: {
    type: Number,
    default: 0,
  },
  OUTSTAND_TOT_WITH_REC_RRC: {
    type: Number,
    default: 0,
  },

  // Optional field
  RACK_LOCATION: {
    type: String,
  },

  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  strict: true, // Strict schema - only defined fields allowed
  timestamps: false, // We'll handle timestamps manually if needed
});

// Compound index for unique RRC per user
rrcSchema.index({ username: 1, RRC_NO: 1 }, { unique: true });

// Index on ESTA_CODE for faster grouping queries
rrcSchema.index({ ESTA_CODE: 1 });

const RRC = mongoose.model('RRC', rrcSchema);

export default RRC;

