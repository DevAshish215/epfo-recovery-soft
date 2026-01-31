/**
 * Recovery Service
 * Business logic for recovery operations
 * Handles DD/TRRN recovery entry and allocation
 */

import Recovery from './recovery.model.js';
import RRC from '../rrc/rrc.model.js';
import { allocateRecovery } from '../../services/recoveryAllocator.service.js';
import {
  calculateRecovery,
  calculateOutstanding,
  calculateRecoveryCost,
} from '../../services/financeCalculator.service.js';
import { parseExcelFile } from '../../services/excelParser.service.js';
import XLSX from 'xlsx';
import { updateRemarksForEstaCode } from '../rrc/rrc.service.js';
import logger from '../../utils/logger.js';
import { toNumber } from '../../utils/number.util.js';

/**
 * Create a new recovery transaction
 * This function:
 * 1. Allocates the recovery amount based on EPFO priority
 * 2. Updates RRC recovery and outstanding amounts
 * 3. Recalculates RRC totals
 * @param {Object} recoveryData - Recovery transaction data
 * @returns {Object} Created recovery transaction
 */
export async function createRecovery(recoveryData) {
  const {
    username,
    regional_office_code,
    ESTA_CODE,
    RRC_NO,
    RECOVERY_AMOUNT,
    BANK_NAME,
    RECOVERY_DATE,
    DD_TRRN_DATE,
    REFERENCE_NUMBER,
    TRANSACTION_TYPE,
    RECOVERY_COST, // Recovery Cost (ESTA-level field)
    remark, // Remark to be added to REMARKS field
    // Optional manual allocation (for bulk upload)
    manualAllocation,
  } = recoveryData;

  // Step 1: Check for duplicate recovery entry (same REFERENCE_NUMBER and DD_TRRN_DATE)
  // Normalize dates to start of day for comparison (ignore time)
  const ddTrrnDate = new Date(DD_TRRN_DATE);
  const startOfDay = new Date(ddTrrnDate.getFullYear(), ddTrrnDate.getMonth(), ddTrrnDate.getDate());
  const endOfDay = new Date(ddTrrnDate.getFullYear(), ddTrrnDate.getMonth(), ddTrrnDate.getDate(), 23, 59, 59, 999);

  const existingRecovery = await Recovery.findOne({
    username: username,
    REFERENCE_NUMBER: REFERENCE_NUMBER,
    DD_TRRN_DATE: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  if (existingRecovery) {
    const formattedDate = new Date(DD_TRRN_DATE).toLocaleDateString('en-IN');
    throw new Error(`Duplicate recovery entry: A recovery with DD/TRRN Number "${REFERENCE_NUMBER}" and DD/TRRN Date "${formattedDate}" already exists.`);
  }

  // Step 2: Find the RRC for this recovery
  const rrc = await RRC.findOne({
    username: username,
    ESTA_CODE: ESTA_CODE,
    RRC_NO: RRC_NO,
  });

  if (!rrc) {
    throw new Error(`RRC not found for ESTA_CODE: ${ESTA_CODE}, RRC_NO: ${RRC_NO}`);
  }

  // Step 3: Get current outstanding amounts for allocation (use actual account-wise values from RRC)
  const outstandingAmounts = {
    OUTSTAND_7A: rrc.OUTSTAND_7A || 0,
    OUTSTAND_7Q: rrc.OUTSTAND_7Q || 0,
    OUTSTAND_14B: rrc.OUTSTAND_14B || 0,
    // Account-wise outstanding (use actual values from RRC)
    OUTSTAND_7A_ACCOUNT_1_EE: rrc.OUTSTAND_7A_ACCOUNT_1_EE || 0,
    OUTSTAND_7A_ACCOUNT_1_ER: rrc.OUTSTAND_7A_ACCOUNT_1_ER || 0,
    OUTSTAND_7A_ACCOUNT_2: rrc.OUTSTAND_7A_ACCOUNT_2 || 0,
    OUTSTAND_7A_ACCOUNT_10: rrc.OUTSTAND_7A_ACCOUNT_10 || 0,
    OUTSTAND_7A_ACCOUNT_21: rrc.OUTSTAND_7A_ACCOUNT_21 || 0,
    OUTSTAND_7A_ACCOUNT_22: rrc.OUTSTAND_7A_ACCOUNT_22 || 0,
    OUTSTAND_7Q_ACCOUNT_1: rrc.OUTSTAND_7Q_ACCOUNT_1 || 0,
    OUTSTAND_7Q_ACCOUNT_2: rrc.OUTSTAND_7Q_ACCOUNT_2 || 0,
    OUTSTAND_7Q_ACCOUNT_10: rrc.OUTSTAND_7Q_ACCOUNT_10 || 0,
    OUTSTAND_7Q_ACCOUNT_21: rrc.OUTSTAND_7Q_ACCOUNT_21 || 0,
    OUTSTAND_7Q_ACCOUNT_22: rrc.OUTSTAND_7Q_ACCOUNT_22 || 0,
    OUTSTAND_14B_ACCOUNT_1: rrc.OUTSTAND_14B_ACCOUNT_1 || 0,
    OUTSTAND_14B_ACCOUNT_2: rrc.OUTSTAND_14B_ACCOUNT_2 || 0,
    OUTSTAND_14B_ACCOUNT_10: rrc.OUTSTAND_14B_ACCOUNT_10 || 0,
    OUTSTAND_14B_ACCOUNT_21: rrc.OUTSTAND_14B_ACCOUNT_21 || 0,
    OUTSTAND_14B_ACCOUNT_22: rrc.OUTSTAND_14B_ACCOUNT_22 || 0,
  };

  // Step 4: Allocate recovery amount
  // If manual allocation is provided, use it; otherwise use automatic allocation
  let allocation;
  if (manualAllocation) {
    // Use manual allocation from Excel
    allocation = manualAllocation;
  } else {
    // Use automatic allocation based on EPFO priority and U/S field
    allocation = allocateRecovery(toNumber(RECOVERY_AMOUNT), outstandingAmounts, rrc.U_S);
  }

  // Step 5: Create recovery transaction with allocation details
  const recovery = new Recovery({
    username,
    regional_office_code: regional_office_code || '',
    ESTA_CODE,
    RRC_NO,
    RECOVERY_AMOUNT: toNumber(RECOVERY_AMOUNT),
    BANK_NAME,
    RECOVERY_DATE: new Date(RECOVERY_DATE),
    DD_TRRN_DATE: new Date(DD_TRRN_DATE),
    REFERENCE_NUMBER,
    TRANSACTION_TYPE,
    RECOVERY_COST: RECOVERY_COST !== undefined && RECOVERY_COST !== null && RECOVERY_COST !== '' ? toNumber(RECOVERY_COST) : 0,
    ...allocation,
  });

  // Step 6: Save recovery transaction first
  await recovery.save();

  // Step 6.5: Update REMARKS field if remark is provided
  if (remark && remark.trim()) {
    try {
      await updateRemarksForEstaCode(username, ESTA_CODE, remark.trim(), '');
    } catch (err) {
      logger.error('Failed to update remarks:', err);
      // Don't fail the recovery save if remark update fails
    }
  }

  // Step 7: Recalculate all financial fields for the RRC
  // This function sums all recoveries for this RRC and updates recovery amounts
  // It also recalculates all OUTSTAND fields using financeCalculator
  await recalculateRRCFinancials(username, ESTA_CODE, RRC_NO);

  // Step 8: Update Recovery Cost if provided (ESTA-level field)
  if (RECOVERY_COST !== undefined && RECOVERY_COST !== null && RECOVERY_COST !== '') {
    await updateRecoveryCostForEstaCode(ESTA_CODE, username, toNumber(RECOVERY_COST));
  }

  // Step 9: Update RRC totals for the ESTA_CODE
  await updateRRCTotalsForEstaCode(ESTA_CODE, username);

  return recovery;
}

/**
 * Recalculate all financial fields for an RRC after recovery entry
 * This ensures all RECOVERY and OUTSTAND fields are correct
 */
async function recalculateRRCFinancials(username, estaCode, rrcNo) {
  // Get all recoveries for this RRC
  const recoveries = await Recovery.find({
    username: username,
    ESTA_CODE: estaCode,
    RRC_NO: rrcNo,
  });

  // Sum up all recovery amounts by section and account
  let totalRecovery7A = 0;
  let totalRecovery7Q = 0;
  let totalRecovery14B = 0;
  
  // Account-wise recovery totals
  let totalRecovery7AAc1EE = 0;
  let totalRecovery7AAc1ER = 0;
  let totalRecovery7AAc2 = 0;
  let totalRecovery7AAc10 = 0;
  let totalRecovery7AAc21 = 0;
  let totalRecovery7AAc22 = 0;
  let totalRecovery7QAc1 = 0;
  let totalRecovery7QAc2 = 0;
  let totalRecovery7QAc10 = 0;
  let totalRecovery7QAc21 = 0;
  let totalRecovery7QAc22 = 0;
  let totalRecovery14BAc1 = 0;
  let totalRecovery14BAc2 = 0;
  let totalRecovery14BAc10 = 0;
  let totalRecovery14BAc21 = 0;
  let totalRecovery14BAc22 = 0;

  for (let i = 0; i < recoveries.length; i++) {
    totalRecovery7A += toNumber(recoveries[i].ALLOCATED_7A);
    totalRecovery7Q += toNumber(recoveries[i].ALLOCATED_7Q);
    totalRecovery14B += toNumber(recoveries[i].ALLOCATED_14B);
    
    // Sum account-wise allocations
    totalRecovery7AAc1EE += toNumber(recoveries[i].ALLOCATED_7A_ACCOUNT_1_EE);
    totalRecovery7AAc1ER += toNumber(recoveries[i].ALLOCATED_7A_ACCOUNT_1_ER);
    totalRecovery7AAc2 += toNumber(recoveries[i].ALLOCATED_7A_ACCOUNT_2);
    totalRecovery7AAc10 += toNumber(recoveries[i].ALLOCATED_7A_ACCOUNT_10);
    totalRecovery7AAc21 += toNumber(recoveries[i].ALLOCATED_7A_ACCOUNT_21);
    totalRecovery7AAc22 += toNumber(recoveries[i].ALLOCATED_7A_ACCOUNT_22);
    totalRecovery7QAc1 += toNumber(recoveries[i].ALLOCATED_7Q_ACCOUNT_1);
    totalRecovery7QAc2 += toNumber(recoveries[i].ALLOCATED_7Q_ACCOUNT_2);
    totalRecovery7QAc10 += toNumber(recoveries[i].ALLOCATED_7Q_ACCOUNT_10);
    totalRecovery7QAc21 += toNumber(recoveries[i].ALLOCATED_7Q_ACCOUNT_21);
    totalRecovery7QAc22 += toNumber(recoveries[i].ALLOCATED_7Q_ACCOUNT_22);
    totalRecovery14BAc1 += toNumber(recoveries[i].ALLOCATED_14B_ACCOUNT_1);
    totalRecovery14BAc2 += toNumber(recoveries[i].ALLOCATED_14B_ACCOUNT_2);
    totalRecovery14BAc10 += toNumber(recoveries[i].ALLOCATED_14B_ACCOUNT_10);
    totalRecovery14BAc21 += toNumber(recoveries[i].ALLOCATED_14B_ACCOUNT_21);
    totalRecovery14BAc22 += toNumber(recoveries[i].ALLOCATED_14B_ACCOUNT_22);
  }

  // Get the RRC
  const rrc = await RRC.findOne({
    username: username,
    ESTA_CODE: estaCode,
    RRC_NO: rrcNo,
  });

  if (!rrc) {
    return;
  }

  // Update recovery amounts (section totals)
  rrc.RECOVERY_7A = totalRecovery7A;
  rrc.RECOVERY_7Q = totalRecovery7Q;
  rrc.RECOVERY_14B = totalRecovery14B;
  
  // Update account-wise recovery amounts
  rrc.RECOVERY_7A_ACCOUNT_1_EE = totalRecovery7AAc1EE;
  rrc.RECOVERY_7A_ACCOUNT_1_ER = totalRecovery7AAc1ER;
  rrc.RECOVERY_7A_ACCOUNT_2 = totalRecovery7AAc2;
  rrc.RECOVERY_7A_ACCOUNT_10 = totalRecovery7AAc10;
  rrc.RECOVERY_7A_ACCOUNT_21 = totalRecovery7AAc21;
  rrc.RECOVERY_7A_ACCOUNT_22 = totalRecovery7AAc22;
  rrc.RECOVERY_7Q_ACCOUNT_1 = totalRecovery7QAc1;
  rrc.RECOVERY_7Q_ACCOUNT_2 = totalRecovery7QAc2;
  rrc.RECOVERY_7Q_ACCOUNT_10 = totalRecovery7QAc10;
  rrc.RECOVERY_7Q_ACCOUNT_21 = totalRecovery7QAc21;
  rrc.RECOVERY_7Q_ACCOUNT_22 = totalRecovery7QAc22;
  rrc.RECOVERY_14B_ACCOUNT_1 = totalRecovery14BAc1;
  rrc.RECOVERY_14B_ACCOUNT_2 = totalRecovery14BAc2;
  rrc.RECOVERY_14B_ACCOUNT_10 = totalRecovery14BAc10;
  rrc.RECOVERY_14B_ACCOUNT_21 = totalRecovery14BAc21;
  rrc.RECOVERY_14B_ACCOUNT_22 = totalRecovery14BAc22;

  // Recalculate recovery total using financeCalculator
  // Format RRC data for calculator (it expects fields with spaces, not underscores)
  const rrcForCalc = {
    'RECOVERY 7A': rrc.RECOVERY_7A || 0,
    'RECOVERY 7Q': rrc.RECOVERY_7Q || 0,
    'RECOVERY 14B': rrc.RECOVERY_14B || 0,
  };
  const recoveryCalc = calculateRecovery(rrcForCalc);
  const recoveryTotal = recoveryCalc['RECOVERY TOTAL'] || 0;

  // Recalculate outstanding amounts using financeCalculator
  // Format account-wise demand and recovery data for calculator (needed for account-wise outstanding)
  const demandForCalc = {
    'DEMAND 7A A/C 1_EE': rrc.DEMAND_7A_ACCOUNT_1_EE || 0,
    'DEMAND 7A A/C 1_ER': rrc.DEMAND_7A_ACCOUNT_1_ER || 0,
    'DEMAND 7A A/C 2': rrc.DEMAND_7A_ACCOUNT_2 || 0,
    'DEMAND 7A A/C 10': rrc.DEMAND_7A_ACCOUNT_10 || 0,
    'DEMAND 7A A/C 21': rrc.DEMAND_7A_ACCOUNT_21 || 0,
    'DEMAND 7A A/C 22': rrc.DEMAND_7A_ACCOUNT_22 || 0,
    'DEMAND 14B A/C 1': rrc.DEMAND_14B_ACCOUNT_1 || 0,
    'DEMAND 14B A/C 2': rrc.DEMAND_14B_ACCOUNT_2 || 0,
    'DEMAND 14B A/C 10': rrc.DEMAND_14B_ACCOUNT_10 || 0,
    'DEMAND 14B A/C 21': rrc.DEMAND_14B_ACCOUNT_21 || 0,
    'DEMAND 14B A/C 22': rrc.DEMAND_14B_ACCOUNT_22 || 0,
    'DEMAND 7Q A/C 1': rrc.DEMAND_7Q_ACCOUNT_1 || 0,
    'DEMAND 7Q A/C 2': rrc.DEMAND_7Q_ACCOUNT_2 || 0,
    'DEMAND 7Q A/C 10': rrc.DEMAND_7Q_ACCOUNT_10 || 0,
    'DEMAND 7Q A/C 21': rrc.DEMAND_7Q_ACCOUNT_21 || 0,
    'DEMAND 7Q A/C 22': rrc.DEMAND_7Q_ACCOUNT_22 || 0,
  };
  const recoveryForCalc = {
    'RECOVERY 7A A/C 1_EE': rrc.RECOVERY_7A_ACCOUNT_1_EE || 0,
    'RECOVERY 7A A/C 1_ER': rrc.RECOVERY_7A_ACCOUNT_1_ER || 0,
    'RECOVERY 7A A/C 2': rrc.RECOVERY_7A_ACCOUNT_2 || 0,
    'RECOVERY 7A A/C 10': rrc.RECOVERY_7A_ACCOUNT_10 || 0,
    'RECOVERY 7A A/C 21': rrc.RECOVERY_7A_ACCOUNT_21 || 0,
    'RECOVERY 7A A/C 22': rrc.RECOVERY_7A_ACCOUNT_22 || 0,
    'RECOVERY 14B A/C 1': rrc.RECOVERY_14B_ACCOUNT_1 || 0,
    'RECOVERY 14B A/C 2': rrc.RECOVERY_14B_ACCOUNT_2 || 0,
    'RECOVERY 14B A/C 10': rrc.RECOVERY_14B_ACCOUNT_10 || 0,
    'RECOVERY 14B A/C 21': rrc.RECOVERY_14B_ACCOUNT_21 || 0,
    'RECOVERY 14B A/C 22': rrc.RECOVERY_14B_ACCOUNT_22 || 0,
    'RECOVERY 7Q A/C 1': rrc.RECOVERY_7Q_ACCOUNT_1 || 0,
    'RECOVERY 7Q A/C 2': rrc.RECOVERY_7Q_ACCOUNT_2 || 0,
    'RECOVERY 7Q A/C 10': rrc.RECOVERY_7Q_ACCOUNT_10 || 0,
    'RECOVERY 7Q A/C 21': rrc.RECOVERY_7Q_ACCOUNT_21 || 0,
    'RECOVERY 7Q A/C 22': rrc.RECOVERY_7Q_ACCOUNT_22 || 0,
  };
  const outstanding = calculateOutstanding(demandForCalc, recoveryForCalc);
  
  // Update account-wise outstanding fields
  rrc.OUTSTAND_7A_ACCOUNT_1_EE = outstanding['OUTSTAND_7A_ACCOUNT_1_EE'] || 0;
  rrc.OUTSTAND_7A_ACCOUNT_1_ER = outstanding['OUTSTAND_7A_ACCOUNT_1_ER'] || 0;
  rrc.OUTSTAND_7A_ACCOUNT_2 = outstanding['OUTSTAND_7A_ACCOUNT_2'] || 0;
  rrc.OUTSTAND_7A_ACCOUNT_10 = outstanding['OUTSTAND_7A_ACCOUNT_10'] || 0;
  rrc.OUTSTAND_7A_ACCOUNT_21 = outstanding['OUTSTAND_7A_ACCOUNT_21'] || 0;
  rrc.OUTSTAND_7A_ACCOUNT_22 = outstanding['OUTSTAND_7A_ACCOUNT_22'] || 0;
  rrc.OUTSTAND_14B_ACCOUNT_1 = outstanding['OUTSTAND_14B_ACCOUNT_1'] || 0;
  rrc.OUTSTAND_14B_ACCOUNT_2 = outstanding['OUTSTAND_14B_ACCOUNT_2'] || 0;
  rrc.OUTSTAND_14B_ACCOUNT_10 = outstanding['OUTSTAND_14B_ACCOUNT_10'] || 0;
  rrc.OUTSTAND_14B_ACCOUNT_21 = outstanding['OUTSTAND_14B_ACCOUNT_21'] || 0;
  rrc.OUTSTAND_14B_ACCOUNT_22 = outstanding['OUTSTAND_14B_ACCOUNT_22'] || 0;
  rrc.OUTSTAND_7Q_ACCOUNT_1 = outstanding['OUTSTAND_7Q_ACCOUNT_1'] || 0;
  rrc.OUTSTAND_7Q_ACCOUNT_2 = outstanding['OUTSTAND_7Q_ACCOUNT_2'] || 0;
  rrc.OUTSTAND_7Q_ACCOUNT_10 = outstanding['OUTSTAND_7Q_ACCOUNT_10'] || 0;
  rrc.OUTSTAND_7Q_ACCOUNT_21 = outstanding['OUTSTAND_7Q_ACCOUNT_21'] || 0;
  rrc.OUTSTAND_7Q_ACCOUNT_22 = outstanding['OUTSTAND_7Q_ACCOUNT_22'] || 0;

  // Recalculate recovery cost using financeCalculator
  // Format RRC data for cost calculator
  const rrcForCostCalc = {
    'OUTSTAND TOTAL': outstanding['OUTSTAND TOTAL'],
    'RECOVERY COST': rrc.RECOVERY_COST || 0,
    'RECEVIED REC COST': rrc.RECEVIED_REC_COST || 0,
  };
  const recoveryCost = calculateRecoveryCost(rrcForCostCalc);

  // Update all calculated fields
  rrc.RECOVERY_TOTAL = recoveryTotal;
  rrc.OUTSTAND_7A = outstanding['OUTSTAND 7A'];
  rrc.OUTSTAND_14B = outstanding['OUTSTAND 14B'];
  rrc.OUTSTAND_7Q = outstanding['OUTSTAND 7Q'];
  rrc.OUTSTAND_TOTAL = outstanding['OUTSTAND TOTAL'];
  rrc.OUTSTAND_REC_COST = recoveryCost['OUTSTAND REC COST'];
  rrc.OUTSTAND_TOT_WITH_REC = recoveryCost['OUTSTAND TOT WITH REC'];

  await rrc.save();
}

/**
 * Update Recovery Cost for all RRCs with same ESTA_CODE
 * This adds the recovery cost amount to RECEVIED_REC_COST for all RRCs
 * @param {string} estaCode - Establishment code
 * @param {string} username - Username for data isolation
 * @param {number} recoveryCostAmount - Amount to add to RECEVIED_REC_COST
 */
async function updateRecoveryCostForEstaCode(estaCode, username, recoveryCostAmount) {
  if (!recoveryCostAmount || recoveryCostAmount <= 0) {
    return; // No update needed if amount is 0 or negative
  }

  // Get all RRCs for this ESTA_CODE
  const rrcs = await RRC.find({
    username: username,
    ESTA_CODE: estaCode,
  });

  if (rrcs.length === 0) {
    return;
  }

  // Update RECEVIED_REC_COST for all RRCs (add the new recovery cost amount)
  for (let i = 0; i < rrcs.length; i++) {
    const currentReceived = toNumber(rrcs[i].RECEVIED_REC_COST);
    rrcs[i].RECEVIED_REC_COST = currentReceived + recoveryCostAmount;
    
    // Recalculate OUTSTAND_REC_COST and OUTSTAND_TOT_WITH_REC for this RRC
    const rrcForCostCalc = {
      'OUTSTAND TOTAL': rrcs[i].OUTSTAND_TOTAL || 0,
      'RECOVERY COST': rrcs[i].RECOVERY_COST || 0,
      'RECEVIED REC COST': rrcs[i].RECEVIED_REC_COST,
    };
    const recoveryCost = calculateRecoveryCost(rrcForCostCalc);
    
    rrcs[i].OUTSTAND_REC_COST = recoveryCost['OUTSTAND REC COST'];
    rrcs[i].OUTSTAND_TOT_WITH_REC = recoveryCost['OUTSTAND TOT WITH REC'];
    
    await rrcs[i].save();
  }
}

/**
 * Update RRC totals for all RRCs with same ESTA_CODE
 */
async function updateRRCTotalsForEstaCode(estaCode, username) {
  const rrcs = await RRC.find({
    username: username,
    ESTA_CODE: estaCode,
  });

  // Calculate totals by summing all RRCs for this ESTA_CODE
  let demandTotalRrc = 0;
  let recoveryTotalRrc = 0;
  let outstandingTotalRrc = 0;
  let outstandingTotWithRecRrc = 0;

  for (let i = 0; i < rrcs.length; i++) {
    demandTotalRrc += toNumber(rrcs[i].DEMAND_TOTAL);
    recoveryTotalRrc += toNumber(rrcs[i].RECOVERY_TOTAL);
    outstandingTotalRrc += toNumber(rrcs[i].OUTSTAND_TOTAL);
    outstandingTotWithRecRrc += toNumber(rrcs[i].OUTSTAND_TOT_WITH_REC);
  }

  // Update all RRCs with the same ESTA_CODE
  await RRC.updateMany(
    {
      username: username,
      ESTA_CODE: estaCode,
    },
    {
      $set: {
        DEMAND_TOTAL_RRC: demandTotalRrc,
        RECOVERY_TOTAL_RRC: recoveryTotalRrc,
        OUTSTAND_TOTAL_RRC: outstandingTotalRrc,
        OUTSTAND_TOT_WITH_REC_RRC: outstandingTotWithRecRrc,
      },
    }
  );
}

/**
 * Get recoveries for a specific ESTA_CODE
 * @param {string} username - Username for data isolation
 * @param {string} estaCode - Establishment code
 * @returns {Array} Array of recovery transactions sorted by date descending
 */
export async function getRecoveriesByEstaCode(username, estaCode) {
  return await Recovery.find({
    username: username,
    ESTA_CODE: estaCode,
  }).sort({ RECOVERY_DATE: -1 });
}

/**
 * Get all recovery transactions for a username
 * @param {string} username - Username to filter recoveries
 * @returns {Array} Array of recovery transactions sorted by date descending
 */
export async function getRecoveriesByUsername(username) {
  return await Recovery.find({
    username: username,
  }).sort({ RECOVERY_DATE: -1, createdAt: -1 });
}

/**
 * Update a recovery transaction
 * This will:
 * 1. Find the existing recovery record
 * 2. Reverse old allocation (subtract from RRC)
 * 3. Check for duplicates (excluding current record)
 * 4. Calculate new allocation
 * 5. Update recovery record
 * 6. Recalculate RRC financials
 * 7. Update recovery cost (handle old and new)
 * 8. Update RRC totals
 * @param {string} recoveryId - Recovery transaction ID
 * @param {Object} updateData - Updated recovery data
 * @param {string} username - Username for data isolation
 * @returns {Object} Updated recovery transaction
 */
export async function updateRecovery(recoveryId, updateData, username) {
  // Step 1: Find the existing recovery record
  const existingRecovery = await Recovery.findOne({
    _id: recoveryId,
    username: username,
  });

  if (!existingRecovery) {
    throw new Error('Recovery transaction not found');
  }

  const estaCode = existingRecovery.ESTA_CODE;
  const rrcNo = existingRecovery.RRC_NO;
  const oldRecoveryCost = existingRecovery.RECOVERY_COST || 0;

  // Step 2: Check for duplicate (excluding current record)
  if (updateData.REFERENCE_NUMBER && updateData.DD_TRRN_DATE) {
    const ddTrrnDate = new Date(updateData.DD_TRRN_DATE);
    const startOfDay = new Date(ddTrrnDate.getFullYear(), ddTrrnDate.getMonth(), ddTrrnDate.getDate());
    const endOfDay = new Date(ddTrrnDate.getFullYear(), ddTrrnDate.getMonth(), ddTrrnDate.getDate(), 23, 59, 59, 999);

    const duplicateRecovery = await Recovery.findOne({
      username: username,
      REFERENCE_NUMBER: updateData.REFERENCE_NUMBER,
      DD_TRRN_DATE: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      _id: { $ne: recoveryId }, // Exclude current record
    });

    if (duplicateRecovery) {
      const formattedDate = new Date(updateData.DD_TRRN_DATE).toLocaleDateString('en-IN');
      throw new Error(`Duplicate recovery entry: A recovery with DD/TRRN Number "${updateData.REFERENCE_NUMBER}" and DD/TRRN Date "${formattedDate}" already exists.`);
    }
  }

  // Step 3: Find the RRC
  const rrc = await RRC.findOne({
    username: username,
    ESTA_CODE: estaCode,
    RRC_NO: rrcNo,
  });

  if (!rrc) {
    throw new Error(`RRC not found for ESTA_CODE: ${estaCode}, RRC_NO: ${rrcNo}`);
  }

  // Step 4: Reverse old allocation (subtract old recovery amounts from RRC)
  // This is done by recalculating RRC financials without this recovery
  // We'll do this by temporarily deleting the old recovery, recalculating, then updating

  // Get current outstanding amounts (after reversing old allocation temporarily)
  // We need to get outstanding amounts BEFORE this recovery was applied
  // So we'll recalculate by summing all recoveries except this one
  const allOtherRecoveries = await Recovery.find({
    username: username,
    ESTA_CODE: estaCode,
    RRC_NO: rrcNo,
    _id: { $ne: recoveryId },
  });

  // Sum all other recoveries to get the RRC state before this recovery
  let baseRecovery7A = 0;
  let baseRecovery7Q = 0;
  let baseRecovery14B = 0;
  // Account-wise
  let baseRecovery7AAc1EE = 0, baseRecovery7AAc1ER = 0, baseRecovery7AAc2 = 0;
  let baseRecovery7AAc10 = 0, baseRecovery7AAc21 = 0, baseRecovery7AAc22 = 0;
  let baseRecovery7QAc1 = 0, baseRecovery7QAc2 = 0, baseRecovery7QAc10 = 0;
  let baseRecovery7QAc21 = 0, baseRecovery7QAc22 = 0;
  let baseRecovery14BAc1 = 0, baseRecovery14BAc2 = 0, baseRecovery14BAc10 = 0;
  let baseRecovery14BAc21 = 0, baseRecovery14BAc22 = 0;

  allOtherRecoveries.forEach(rec => {
    baseRecovery7A += toNumber(rec.ALLOCATED_7A);
    baseRecovery7Q += toNumber(rec.ALLOCATED_7Q);
    baseRecovery14B += toNumber(rec.ALLOCATED_14B);
    baseRecovery7AAc1EE += toNumber(rec.ALLOCATED_7A_ACCOUNT_1_EE);
    baseRecovery7AAc1ER += toNumber(rec.ALLOCATED_7A_ACCOUNT_1_ER);
    baseRecovery7AAc2 += toNumber(rec.ALLOCATED_7A_ACCOUNT_2);
    baseRecovery7AAc10 += toNumber(rec.ALLOCATED_7A_ACCOUNT_10);
    baseRecovery7AAc21 += toNumber(rec.ALLOCATED_7A_ACCOUNT_21);
    baseRecovery7AAc22 += toNumber(rec.ALLOCATED_7A_ACCOUNT_22);
    baseRecovery7QAc1 += toNumber(rec.ALLOCATED_7Q_ACCOUNT_1);
    baseRecovery7QAc2 += toNumber(rec.ALLOCATED_7Q_ACCOUNT_2);
    baseRecovery7QAc10 += toNumber(rec.ALLOCATED_7Q_ACCOUNT_10);
    baseRecovery7QAc21 += toNumber(rec.ALLOCATED_7Q_ACCOUNT_21);
    baseRecovery7QAc22 += toNumber(rec.ALLOCATED_7Q_ACCOUNT_22);
    baseRecovery14BAc1 += toNumber(rec.ALLOCATED_14B_ACCOUNT_1);
    baseRecovery14BAc2 += toNumber(rec.ALLOCATED_14B_ACCOUNT_2);
    baseRecovery14BAc10 += toNumber(rec.ALLOCATED_14B_ACCOUNT_10);
    baseRecovery14BAc21 += toNumber(rec.ALLOCATED_14B_ACCOUNT_21);
    baseRecovery14BAc22 += toNumber(rec.ALLOCATED_14B_ACCOUNT_22);
  });

  // Calculate outstanding amounts based on base recoveries (without current recovery)
  // Outstanding = Demand - Base Recovery
  const outstandingAmounts = {
    OUTSTAND_7A: Math.max(0, toNumber(rrc.DEMAND_7A) - baseRecovery7A),
    OUTSTAND_7Q: Math.max(0, toNumber(rrc.DEMAND_7Q) - baseRecovery7Q),
    OUTSTAND_14B: Math.max(0, toNumber(rrc.DEMAND_14B) - baseRecovery14B),
    // Account-wise outstanding
    OUTSTAND_7A_ACCOUNT_1_EE: Math.max(0, toNumber(rrc.DEMAND_7A_ACCOUNT_1_EE) - baseRecovery7AAc1EE),
    OUTSTAND_7A_ACCOUNT_1_ER: Math.max(0, toNumber(rrc.DEMAND_7A_ACCOUNT_1_ER) - baseRecovery7AAc1ER),
    OUTSTAND_7A_ACCOUNT_2: Math.max(0, toNumber(rrc.DEMAND_7A_ACCOUNT_2) - baseRecovery7AAc2),
    OUTSTAND_7A_ACCOUNT_10: Math.max(0, toNumber(rrc.DEMAND_7A_ACCOUNT_10) - baseRecovery7AAc10),
    OUTSTAND_7A_ACCOUNT_21: Math.max(0, toNumber(rrc.DEMAND_7A_ACCOUNT_21) - baseRecovery7AAc21),
    OUTSTAND_7A_ACCOUNT_22: Math.max(0, toNumber(rrc.DEMAND_7A_ACCOUNT_22) - baseRecovery7AAc22),
    OUTSTAND_7Q_ACCOUNT_1: Math.max(0, toNumber(rrc.DEMAND_7Q_ACCOUNT_1) - baseRecovery7QAc1),
    OUTSTAND_7Q_ACCOUNT_2: Math.max(0, toNumber(rrc.DEMAND_7Q_ACCOUNT_2) - baseRecovery7QAc2),
    OUTSTAND_7Q_ACCOUNT_10: Math.max(0, toNumber(rrc.DEMAND_7Q_ACCOUNT_10) - baseRecovery7QAc10),
    OUTSTAND_7Q_ACCOUNT_21: Math.max(0, toNumber(rrc.DEMAND_7Q_ACCOUNT_21) - baseRecovery7QAc21),
    OUTSTAND_7Q_ACCOUNT_22: Math.max(0, toNumber(rrc.DEMAND_7Q_ACCOUNT_22) - baseRecovery7QAc22),
    OUTSTAND_14B_ACCOUNT_1: Math.max(0, toNumber(rrc.DEMAND_14B_ACCOUNT_1) - baseRecovery14BAc1),
    OUTSTAND_14B_ACCOUNT_2: Math.max(0, toNumber(rrc.DEMAND_14B_ACCOUNT_2) - baseRecovery14BAc2),
    OUTSTAND_14B_ACCOUNT_10: Math.max(0, toNumber(rrc.DEMAND_14B_ACCOUNT_10) - baseRecovery14BAc10),
    OUTSTAND_14B_ACCOUNT_21: Math.max(0, toNumber(rrc.DEMAND_14B_ACCOUNT_21) - baseRecovery14BAc21),
    OUTSTAND_14B_ACCOUNT_22: Math.max(0, toNumber(rrc.DEMAND_14B_ACCOUNT_22) - baseRecovery14BAc22),
  };

  // Step 5: Calculate new allocation based on updated recovery amount and U/S field
  const newRecoveryAmount = updateData.RECOVERY_AMOUNT !== undefined ? toNumber(updateData.RECOVERY_AMOUNT) : existingRecovery.RECOVERY_AMOUNT;
  const newAllocation = allocateRecovery(newRecoveryAmount, outstandingAmounts, rrc.U_S);

  // Step 6: Update recovery record with new data
  // Merge updateData with new allocation
  const updatedRecoveryData = {
    ...existingRecovery.toObject(),
    ...updateData,
    ...newAllocation,
    RECOVERY_AMOUNT: newRecoveryAmount,
    RECOVERY_COST: updateData.RECOVERY_COST !== undefined ? (updateData.RECOVERY_COST !== null && updateData.RECOVERY_COST !== '' ? toNumber(updateData.RECOVERY_COST) : 0) : existingRecovery.RECOVERY_COST,
  };

  // Update date fields if provided
  if (updateData.RECOVERY_DATE) {
    updatedRecoveryData.RECOVERY_DATE = new Date(updateData.RECOVERY_DATE);
  }
  if (updateData.DD_TRRN_DATE) {
    updatedRecoveryData.DD_TRRN_DATE = new Date(updateData.DD_TRRN_DATE);
  }

  Object.assign(existingRecovery, updatedRecoveryData);
  await existingRecovery.save();

  // Step 6.5: Update REMARKS field if remark is provided
  if (updateData.remark && updateData.remark.trim()) {
    try {
      await updateRemarksForEstaCode(username, estaCode, updateData.remark.trim(), '');
    } catch (err) {
      logger.error('Failed to update remarks:', err);
      // Don't fail the recovery update if remark update fails
    }
  }

  // Step 7: Recalculate RRC financials (this will sum all recoveries including updated one)
  await recalculateRRCFinancials(username, estaCode, rrcNo);

  // Step 8: Recalculate recovery cost for all RRCs with this ESTA_CODE
  // Sum all recovery costs (including the updated one) for this ESTA_CODE
  const allRecoveriesForEsta = await Recovery.find({
    username: username,
    ESTA_CODE: estaCode,
  });

  const totalRecoveryCost = allRecoveriesForEsta.reduce((sum, rec) => {
    return sum + (toNumber(rec.RECOVERY_COST) || 0);
  }, 0);

  // Update all RRCs with this ESTA_CODE
  const rrcsForCost = await RRC.find({
    username: username,
    ESTA_CODE: estaCode,
  });

  for (let i = 0; i < rrcsForCost.length; i++) {
    rrcsForCost[i].RECEVIED_REC_COST = totalRecoveryCost;
    
    // Recalculate OUTSTAND_REC_COST and OUTSTAND_TOT_WITH_REC
    const rrcForCostCalc = {
      'OUTSTAND TOTAL': rrcsForCost[i].OUTSTAND_TOTAL || 0,
      'RECOVERY COST': rrcsForCost[i].RECOVERY_COST || 0,
      'RECEVIED REC COST': rrcsForCost[i].RECEVIED_REC_COST,
    };
    const recoveryCost = calculateRecoveryCost(rrcForCostCalc);
    
    rrcsForCost[i].OUTSTAND_REC_COST = recoveryCost['OUTSTAND REC COST'];
    rrcsForCost[i].OUTSTAND_TOT_WITH_REC = recoveryCost['OUTSTAND TOT WITH REC'];
    
    await rrcsForCost[i].save();
  }

  // Step 9: Update RRC totals for the ESTA_CODE
  await updateRRCTotalsForEstaCode(estaCode, username);

  return existingRecovery;
}

/**
 * Delete a recovery transaction
 * This will:
 * 1. Delete the recovery record
 * 2. Recalculate RRC financials (sum all remaining recoveries)
 * 3. Recalculate recovery cost (sum all remaining recovery costs)
 * 4. Update RRC totals
 * @param {string} recoveryId - Recovery transaction ID
 * @param {string} username - Username for data isolation
 * @returns {Object} Success status
 */
export async function deleteRecovery(recoveryId, username) {
  // Step 1: Find the recovery to get ESTA_CODE and RRC_NO before deletion
  const recovery = await Recovery.findOne({
    _id: recoveryId,
    username: username,
  });

  if (!recovery) {
    throw new Error('Recovery transaction not found');
  }

  const estaCode = recovery.ESTA_CODE;
  const rrcNo = recovery.RRC_NO;

  // Step 2: Delete the recovery transaction
  await Recovery.deleteOne({
    _id: recoveryId,
    username: username,
  });

  // Step 3: Recalculate RRC financials (this will sum all remaining recoveries)
  await recalculateRRCFinancials(username, estaCode, rrcNo);

  // Step 4: Recalculate recovery cost for all RRCs with this ESTA_CODE
  // Sum all remaining recovery costs for this ESTA_CODE
  const remainingRecoveries = await Recovery.find({
    username: username,
    ESTA_CODE: estaCode,
  });

  const totalRecoveryCost = remainingRecoveries.reduce((sum, rec) => {
    return sum + (toNumber(rec.RECOVERY_COST) || 0);
  }, 0);

  // Update all RRCs with this ESTA_CODE
  const rrcs = await RRC.find({
    username: username,
    ESTA_CODE: estaCode,
  });

  for (let i = 0; i < rrcs.length; i++) {
    rrcs[i].RECEVIED_REC_COST = totalRecoveryCost;
    
    // Recalculate OUTSTAND_REC_COST and OUTSTAND_TOT_WITH_REC
    const rrcForCostCalc = {
      'OUTSTAND TOTAL': rrcs[i].OUTSTAND_TOTAL || 0,
      'RECOVERY COST': rrcs[i].RECOVERY_COST || 0,
      'RECEVIED REC COST': rrcs[i].RECEVIED_REC_COST,
    };
    const recoveryCost = calculateRecoveryCost(rrcForCostCalc);
    
    rrcs[i].OUTSTAND_REC_COST = recoveryCost['OUTSTAND REC COST'];
    rrcs[i].OUTSTAND_TOT_WITH_REC = recoveryCost['OUTSTAND TOT WITH REC'];
    
    await rrcs[i].save();
  }

  // Step 5: Update RRC totals for the ESTA_CODE
  await updateRRCTotalsForEstaCode(estaCode, username);

  return { success: true };
}

/**
 * Preview allocation without saving
 * This is used by the frontend to show how the recovery will be allocated
 * @param {Object} previewData - Preview data with recovery amount and RRC details
 * @param {string} previewData.username - Username for data isolation
 * @param {string} previewData.ESTA_CODE - Establishment code
 * @param {string} previewData.RRC_NO - RRC number
 * @param {number} previewData.RECOVERY_AMOUNT - Recovery amount to allocate
 * @param {string} previewData.recoveryId - (Optional) Recovery ID to exclude from outstanding calculation (for edit mode)
 * @returns {Object} Preview of allocation
 */
export async function previewRecoveryAllocation(previewData) {
  const { username, ESTA_CODE, RRC_NO, RECOVERY_AMOUNT, recoveryId } = previewData;

  // Find the RRC
  const rrc = await RRC.findOne({
    username: username,
    ESTA_CODE: ESTA_CODE,
    RRC_NO: RRC_NO,
  });

  if (!rrc) {
    throw new Error(`RRC not found for ESTA_CODE: ${ESTA_CODE}, RRC_NO: ${RRC_NO}`);
  }

  let outstandingAmounts;

  // If recoveryId is provided (edit mode), exclude this recovery from outstanding calculation
  if (recoveryId) {
    // Get all recoveries except the one being edited
    const allOtherRecoveries = await Recovery.find({
      username: username,
      ESTA_CODE: ESTA_CODE,
      RRC_NO: RRC_NO,
      _id: { $ne: recoveryId },
    });

    // Sum all other recoveries to get the base recovery state
    let baseRecovery7A = 0;
    let baseRecovery7Q = 0;
    let baseRecovery14B = 0;
    // Account-wise
    let baseRecovery7AAc1EE = 0, baseRecovery7AAc1ER = 0, baseRecovery7AAc2 = 0;
    let baseRecovery7AAc10 = 0, baseRecovery7AAc21 = 0, baseRecovery7AAc22 = 0;
    let baseRecovery7QAc1 = 0, baseRecovery7QAc2 = 0, baseRecovery7QAc10 = 0;
    let baseRecovery7QAc21 = 0, baseRecovery7QAc22 = 0;
    let baseRecovery14BAc1 = 0, baseRecovery14BAc2 = 0, baseRecovery14BAc10 = 0;
    let baseRecovery14BAc21 = 0, baseRecovery14BAc22 = 0;

    allOtherRecoveries.forEach(rec => {
      baseRecovery7A += toNumber(rec.ALLOCATED_7A);
      baseRecovery7Q += toNumber(rec.ALLOCATED_7Q);
      baseRecovery14B += toNumber(rec.ALLOCATED_14B);
      baseRecovery7AAc1EE += toNumber(rec.ALLOCATED_7A_ACCOUNT_1_EE);
      baseRecovery7AAc1ER += toNumber(rec.ALLOCATED_7A_ACCOUNT_1_ER);
      baseRecovery7AAc2 += toNumber(rec.ALLOCATED_7A_ACCOUNT_2);
      baseRecovery7AAc10 += toNumber(rec.ALLOCATED_7A_ACCOUNT_10);
      baseRecovery7AAc21 += toNumber(rec.ALLOCATED_7A_ACCOUNT_21);
      baseRecovery7AAc22 += toNumber(rec.ALLOCATED_7A_ACCOUNT_22);
      baseRecovery7QAc1 += toNumber(rec.ALLOCATED_7Q_ACCOUNT_1);
      baseRecovery7QAc2 += toNumber(rec.ALLOCATED_7Q_ACCOUNT_2);
      baseRecovery7QAc10 += toNumber(rec.ALLOCATED_7Q_ACCOUNT_10);
      baseRecovery7QAc21 += toNumber(rec.ALLOCATED_7Q_ACCOUNT_21);
      baseRecovery7QAc22 += toNumber(rec.ALLOCATED_7Q_ACCOUNT_22);
      baseRecovery14BAc1 += toNumber(rec.ALLOCATED_14B_ACCOUNT_1);
      baseRecovery14BAc2 += toNumber(rec.ALLOCATED_14B_ACCOUNT_2);
      baseRecovery14BAc10 += toNumber(rec.ALLOCATED_14B_ACCOUNT_10);
      baseRecovery14BAc21 += toNumber(rec.ALLOCATED_14B_ACCOUNT_21);
      baseRecovery14BAc22 += toNumber(rec.ALLOCATED_14B_ACCOUNT_22);
    });

    // Calculate outstanding amounts based on base recoveries (without current recovery)
    // Outstanding = Demand - Base Recovery
    outstandingAmounts = {
      OUTSTAND_7A: Math.max(0, toNumber(rrc.DEMAND_7A) - baseRecovery7A),
      OUTSTAND_7Q: Math.max(0, toNumber(rrc.DEMAND_7Q) - baseRecovery7Q),
      OUTSTAND_14B: Math.max(0, toNumber(rrc.DEMAND_14B) - baseRecovery14B),
      // Account-wise outstanding
      OUTSTAND_7A_ACCOUNT_1_EE: Math.max(0, toNumber(rrc.DEMAND_7A_ACCOUNT_1_EE) - baseRecovery7AAc1EE),
      OUTSTAND_7A_ACCOUNT_1_ER: Math.max(0, toNumber(rrc.DEMAND_7A_ACCOUNT_1_ER) - baseRecovery7AAc1ER),
      OUTSTAND_7A_ACCOUNT_2: Math.max(0, toNumber(rrc.DEMAND_7A_ACCOUNT_2) - baseRecovery7AAc2),
      OUTSTAND_7A_ACCOUNT_10: Math.max(0, toNumber(rrc.DEMAND_7A_ACCOUNT_10) - baseRecovery7AAc10),
      OUTSTAND_7A_ACCOUNT_21: Math.max(0, toNumber(rrc.DEMAND_7A_ACCOUNT_21) - baseRecovery7AAc21),
      OUTSTAND_7A_ACCOUNT_22: Math.max(0, toNumber(rrc.DEMAND_7A_ACCOUNT_22) - baseRecovery7AAc22),
      OUTSTAND_7Q_ACCOUNT_1: Math.max(0, toNumber(rrc.DEMAND_7Q_ACCOUNT_1) - baseRecovery7QAc1),
      OUTSTAND_7Q_ACCOUNT_2: Math.max(0, toNumber(rrc.DEMAND_7Q_ACCOUNT_2) - baseRecovery7QAc2),
      OUTSTAND_7Q_ACCOUNT_10: Math.max(0, toNumber(rrc.DEMAND_7Q_ACCOUNT_10) - baseRecovery7QAc10),
      OUTSTAND_7Q_ACCOUNT_21: Math.max(0, toNumber(rrc.DEMAND_7Q_ACCOUNT_21) - baseRecovery7QAc21),
      OUTSTAND_7Q_ACCOUNT_22: Math.max(0, toNumber(rrc.DEMAND_7Q_ACCOUNT_22) - baseRecovery7QAc22),
      OUTSTAND_14B_ACCOUNT_1: Math.max(0, toNumber(rrc.DEMAND_14B_ACCOUNT_1) - baseRecovery14BAc1),
      OUTSTAND_14B_ACCOUNT_2: Math.max(0, toNumber(rrc.DEMAND_14B_ACCOUNT_2) - baseRecovery14BAc2),
      OUTSTAND_14B_ACCOUNT_10: Math.max(0, toNumber(rrc.DEMAND_14B_ACCOUNT_10) - baseRecovery14BAc10),
      OUTSTAND_14B_ACCOUNT_21: Math.max(0, toNumber(rrc.DEMAND_14B_ACCOUNT_21) - baseRecovery14BAc21),
      OUTSTAND_14B_ACCOUNT_22: Math.max(0, toNumber(rrc.DEMAND_14B_ACCOUNT_22) - baseRecovery14BAc22),
    };
  } else {
    // For new recovery (not edit mode), use current outstanding amounts from RRC
    outstandingAmounts = {
      OUTSTAND_7A: rrc.OUTSTAND_7A || 0,
      OUTSTAND_7Q: rrc.OUTSTAND_7Q || 0,
      OUTSTAND_14B: rrc.OUTSTAND_14B || 0,
      // Account-wise outstanding (use actual values from RRC)
      OUTSTAND_7A_ACCOUNT_1_EE: rrc.OUTSTAND_7A_ACCOUNT_1_EE || 0,
      OUTSTAND_7A_ACCOUNT_1_ER: rrc.OUTSTAND_7A_ACCOUNT_1_ER || 0,
      OUTSTAND_7A_ACCOUNT_2: rrc.OUTSTAND_7A_ACCOUNT_2 || 0,
      OUTSTAND_7A_ACCOUNT_10: rrc.OUTSTAND_7A_ACCOUNT_10 || 0,
      OUTSTAND_7A_ACCOUNT_21: rrc.OUTSTAND_7A_ACCOUNT_21 || 0,
      OUTSTAND_7A_ACCOUNT_22: rrc.OUTSTAND_7A_ACCOUNT_22 || 0,
      OUTSTAND_7Q_ACCOUNT_1: rrc.OUTSTAND_7Q_ACCOUNT_1 || 0,
      OUTSTAND_7Q_ACCOUNT_2: rrc.OUTSTAND_7Q_ACCOUNT_2 || 0,
      OUTSTAND_7Q_ACCOUNT_10: rrc.OUTSTAND_7Q_ACCOUNT_10 || 0,
      OUTSTAND_7Q_ACCOUNT_21: rrc.OUTSTAND_7Q_ACCOUNT_21 || 0,
      OUTSTAND_7Q_ACCOUNT_22: rrc.OUTSTAND_7Q_ACCOUNT_22 || 0,
      OUTSTAND_14B_ACCOUNT_1: rrc.OUTSTAND_14B_ACCOUNT_1 || 0,
      OUTSTAND_14B_ACCOUNT_2: rrc.OUTSTAND_14B_ACCOUNT_2 || 0,
      OUTSTAND_14B_ACCOUNT_10: rrc.OUTSTAND_14B_ACCOUNT_10 || 0,
      OUTSTAND_14B_ACCOUNT_21: rrc.OUTSTAND_14B_ACCOUNT_21 || 0,
      OUTSTAND_14B_ACCOUNT_22: rrc.OUTSTAND_14B_ACCOUNT_22 || 0,
    };
  }

  // Get allocation preview using allocateRecovery function (respects U/S field)
  const preview = allocateRecovery(toNumber(RECOVERY_AMOUNT), outstandingAmounts, rrc.U_S);
  
  // Add RRC details to preview for frontend display
  return {
    ...preview,
    RRC_DETAILS: {
      ESTA_CODE: rrc.ESTA_CODE,
      ESTA_NAME: rrc.ESTA_NAME,
      RRC_NO: rrc.RRC_NO,
      OUTSTAND_7A: outstandingAmounts.OUTSTAND_7A,
      OUTSTAND_7Q: outstandingAmounts.OUTSTAND_7Q,
      OUTSTAND_14B: outstandingAmounts.OUTSTAND_14B,
    },
  };
}

/**
 * Validate all RRC numbers in Excel before processing
 * @param {Array} excelRows - Array of row objects from Excel
 * @param {string} username - Username for data isolation
 * @returns {Array} Array of invalid RRCs with row numbers
 */
async function validateAllRRCs(excelRows, username) {
  const invalidRRCs = [];
  
  // Extract all unique ESTA_CODE + RRC_NO combinations from Excel
  const excelRRCs = new Set();
  const rrcRowMap = new Map(); // Map to track which row each RRC appears in
  
  excelRows.forEach((row, index) => {
    const estaCode = String(row['ESTA_CODE'] || row['ESTA CODE'] || '').trim();
    const rrcNo = String(row['RRC_NO'] || row['RRC NO'] || '').trim();
    const key = `${estaCode}|${rrcNo}`;
    
    if (estaCode && rrcNo) {
      excelRRCs.add(key);
      // Track the first row where this RRC appears (Excel row numbers start at 2, header is row 1)
      if (!rrcRowMap.has(key)) {
        rrcRowMap.set(key, index + 2);
      }
    }
  });
  
  // Get all existing RRC records for this user
  const existingRRCs = await RRC.find({
    username: username,
    isDeleted: { $ne: true }
  });
  
  // Create a Set of existing (ESTA_CODE, RRC_NO) combinations
  const existingRRCSet = new Set();
  existingRRCs.forEach(rrc => {
    const key = `${rrc.ESTA_CODE}|${rrc.RRC_NO}`;
    existingRRCSet.add(key);
  });
  
  // Find invalid RRCs (present in Excel but not in database)
  excelRRCs.forEach(key => {
    if (!existingRRCSet.has(key)) {
      const [estaCode, rrcNo] = key.split('|');
      invalidRRCs.push({
        row: rrcRowMap.get(key),
        ESTA_CODE: estaCode,
        RRC_NO: rrcNo,
      });
    }
  });
  
  return invalidRRCs;
}

/**
 * Map Excel row to recovery data format
 * @param {Object} excelRow - Excel row object
 * @returns {Object} Mapped recovery data
 */
function mapExcelToRecovery(excelRow) {
  // Handle date parsing (can be Date object, string, or Excel serial number)
  const parseDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      // Try parsing various date formats
      const date = new Date(value);
      if (!isNaN(date.getTime())) return date;
    }
    // Handle Excel serial dates (days since 1900-01-01)
    if (typeof value === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (value - 2) * 86400000);
      if (!isNaN(date.getTime())) return date;
    }
    return null;
  };

  return {
    ESTA_CODE: String(excelRow['ESTA_CODE'] || excelRow['ESTA CODE'] || '').trim(),
    RRC_NO: String(excelRow['RRC_NO'] || excelRow['RRC NO'] || '').trim(),
    RECOVERY_AMOUNT: excelRow['RECOVERY_AMOUNT'] || excelRow['RECOVERY AMOUNT'] || 0,
    BANK_NAME: String(excelRow['BANK_NAME'] || excelRow['BANK NAME'] || '').trim(),
    RECOVERY_DATE: parseDate(excelRow['RECOVERY_DATE'] || excelRow['RECOVERY DATE']),
    DD_TRRN_DATE: parseDate(excelRow['DD_TRRN_DATE'] || excelRow['DD TRRN DATE'] || excelRow['DD/TRRN_DATE'] || excelRow['DD/TRRN DATE']),
    REFERENCE_NUMBER: String(excelRow['REFERENCE_NUMBER'] || excelRow['REFERENCE NUMBER'] || '').trim(),
    TRANSACTION_TYPE: String(excelRow['TRANSACTION_TYPE'] || excelRow['TRANSACTION TYPE'] || '').trim().toUpperCase(),
    RECOVERY_COST: excelRow['RECOVERY_COST'] || excelRow['RECOVERY COST'] || 0,
  };
}

/**
 * Extract manual allocation from Excel row (mandatory)
 * @param {Object} excelRow - Excel row object
 * @returns {Object} Manual allocation object
 */
function extractManualAllocation(excelRow) {
  // Helper to get value from row with multiple possible column names
  const getValue = (variations) => {
    for (const col of variations) {
      const value = excelRow[col];
      if (value !== undefined && value !== null && value !== '') {
        return toNumber(value);
      }
    }
    return 0;
  };

  // Extract all allocation values (new shorter format preferred, but support old formats for backward compatibility)
  const alloc7AAc1EE = getValue(['7A_AC_1_EE', 'ALLOCATED_7A_ACCOUNT_1_EE', 'ALLOCATED 7A ACCOUNT 1_EE', 'ALLOCATED_7A_AC1_EE']);
  const alloc7AAc1ER = getValue(['7A_AC_1_ER', 'ALLOCATED_7A_ACCOUNT_1_ER', 'ALLOCATED 7A ACCOUNT 1_ER', 'ALLOCATED_7A_AC1_ER']);
  const alloc7AAc2 = getValue(['7A_AC_2', 'ALLOCATED_7A_ACCOUNT_2', 'ALLOCATED 7A ACCOUNT 2', 'ALLOCATED_7A_AC2']);
  const alloc7AAc10 = getValue(['7A_AC_10', 'ALLOCATED_7A_ACCOUNT_10', 'ALLOCATED 7A ACCOUNT 10', 'ALLOCATED_7A_AC10']);
  const alloc7AAc21 = getValue(['7A_AC_21', 'ALLOCATED_7A_ACCOUNT_21', 'ALLOCATED 7A ACCOUNT 21', 'ALLOCATED_7A_AC21']);
  const alloc7AAc22 = getValue(['7A_AC_22', 'ALLOCATED_7A_ACCOUNT_22', 'ALLOCATED 7A ACCOUNT 22', 'ALLOCATED_7A_AC22']);
  const alloc14BAc1 = getValue(['14B_AC_1', 'ALLOCATED_14B_ACCOUNT_1', 'ALLOCATED 14B ACCOUNT 1', 'ALLOCATED_14B_AC1']);
  const alloc14BAc2 = getValue(['14B_AC_2', 'ALLOCATED_14B_ACCOUNT_2', 'ALLOCATED 14B ACCOUNT 2', 'ALLOCATED_14B_AC2']);
  const alloc14BAc10 = getValue(['14B_AC_10', 'ALLOCATED_14B_ACCOUNT_10', 'ALLOCATED 14B ACCOUNT 10', 'ALLOCATED_14B_AC10']);
  const alloc14BAc21 = getValue(['14B_AC_21', 'ALLOCATED_14B_ACCOUNT_21', 'ALLOCATED 14B ACCOUNT 21', 'ALLOCATED_14B_AC21']);
  const alloc14BAc22 = getValue(['14B_AC_22', 'ALLOCATED_14B_ACCOUNT_22', 'ALLOCATED 14B ACCOUNT 22', 'ALLOCATED_14B_AC22']);
  const alloc7QAc1 = getValue(['7Q_AC_1', 'ALLOCATED_7Q_ACCOUNT_1', 'ALLOCATED 7Q ACCOUNT 1', 'ALLOCATED_7Q_AC1']);
  const alloc7QAc2 = getValue(['7Q_AC_2', 'ALLOCATED_7Q_ACCOUNT_2', 'ALLOCATED 7Q ACCOUNT 2', 'ALLOCATED_7Q_AC2']);
  const alloc7QAc10 = getValue(['7Q_AC_10', 'ALLOCATED_7Q_ACCOUNT_10', 'ALLOCATED 7Q ACCOUNT 10', 'ALLOCATED_7Q_AC10']);
  const alloc7QAc21 = getValue(['7Q_AC_21', 'ALLOCATED_7Q_ACCOUNT_21', 'ALLOCATED 7Q ACCOUNT 21', 'ALLOCATED_7Q_AC21']);
  const alloc7QAc22 = getValue(['7Q_AC_22', 'ALLOCATED_7Q_ACCOUNT_22', 'ALLOCATED 7Q ACCOUNT 22', 'ALLOCATED_7Q_AC22']);

  // Calculate section totals
  const allocated7A = alloc7AAc1EE + alloc7AAc1ER + alloc7AAc2 + alloc7AAc10 + alloc7AAc21 + alloc7AAc22;
  const allocated14B = alloc14BAc1 + alloc14BAc2 + alloc14BAc10 + alloc14BAc21 + alloc14BAc22;
  const allocated7Q = alloc7QAc1 + alloc7QAc2 + alloc7QAc10 + alloc7QAc21 + alloc7QAc22;

  return {
    ALLOCATED_7A: allocated7A,
    ALLOCATED_14B: allocated14B,
    ALLOCATED_7Q: allocated7Q,
    ALLOCATED_7A_ACCOUNT_1_EE: alloc7AAc1EE,
    ALLOCATED_7A_ACCOUNT_1_ER: alloc7AAc1ER,
    ALLOCATED_7A_ACCOUNT_2: alloc7AAc2,
    ALLOCATED_7A_ACCOUNT_10: alloc7AAc10,
    ALLOCATED_7A_ACCOUNT_21: alloc7AAc21,
    ALLOCATED_7A_ACCOUNT_22: alloc7AAc22,
    ALLOCATED_14B_ACCOUNT_1: alloc14BAc1,
    ALLOCATED_14B_ACCOUNT_2: alloc14BAc2,
    ALLOCATED_14B_ACCOUNT_10: alloc14BAc10,
    ALLOCATED_14B_ACCOUNT_21: alloc14BAc21,
    ALLOCATED_14B_ACCOUNT_22: alloc14BAc22,
    ALLOCATED_7Q_ACCOUNT_1: alloc7QAc1,
    ALLOCATED_7Q_ACCOUNT_2: alloc7QAc2,
    ALLOCATED_7Q_ACCOUNT_10: alloc7QAc10,
    ALLOCATED_7Q_ACCOUNT_21: alloc7QAc21,
    ALLOCATED_7Q_ACCOUNT_22: alloc7QAc22,
  };
}

/**
 * Upload and process Recovery Excel file
 * @param {Buffer} fileBuffer - Excel file buffer
 * @param {string} username - Username for data isolation
 * @param {string} regionalOfficeCode - Regional office code
 * @param {string} originalName - Original filename
 * @returns {Object} Result with processed records count and errors
 */
export async function uploadRecoveryExcel(fileBuffer, username, regionalOfficeCode, originalName = '') {
  // Step 1: Parse Excel or CSV file
  const excelRows = parseExcelFile(fileBuffer, originalName);

  // Step 2: Validate required columns (check for both underscore and space versions)
  const firstRow = excelRows[0] || {};
  const existingColumns = Object.keys(firstRow);
  
  // Column mapping (required columns with variations)
  const columnMapping = {
    'ESTA_CODE': ['ESTA_CODE', 'ESTA CODE'],
    'RRC_NO': ['RRC_NO', 'RRC NO'],
    'RECOVERY_AMOUNT': ['RECOVERY_AMOUNT', 'RECOVERY AMOUNT'],
    'BANK_NAME': ['BANK_NAME', 'BANK NAME'],
    'RECOVERY_DATE': ['RECOVERY_DATE', 'RECOVERY DATE'],
    'DD_TRRN_DATE': ['DD_TRRN_DATE', 'DD TRRN DATE', 'DD/TRRN_DATE', 'DD/TRRN DATE'],
    'REFERENCE_NUMBER': ['REFERENCE_NUMBER', 'REFERENCE NUMBER'],
    'TRANSACTION_TYPE': ['TRANSACTION_TYPE', 'TRANSACTION TYPE'],
    // Account-wise allocation columns (mandatory) - new shorter format
    'ALLOCATED_7A_ACCOUNT_1_EE': ['7A_AC_1_EE', 'ALLOCATED_7A_ACCOUNT_1_EE', 'ALLOCATED 7A ACCOUNT 1_EE', 'ALLOCATED_7A_AC1_EE'],
    'ALLOCATED_7A_ACCOUNT_1_ER': ['7A_AC_1_ER', 'ALLOCATED_7A_ACCOUNT_1_ER', 'ALLOCATED 7A ACCOUNT 1_ER', 'ALLOCATED_7A_AC1_ER'],
    'ALLOCATED_7A_ACCOUNT_2': ['7A_AC_2', 'ALLOCATED_7A_ACCOUNT_2', 'ALLOCATED 7A ACCOUNT 2', 'ALLOCATED_7A_AC2'],
    'ALLOCATED_7A_ACCOUNT_10': ['7A_AC_10', 'ALLOCATED_7A_ACCOUNT_10', 'ALLOCATED 7A ACCOUNT 10', 'ALLOCATED_7A_AC10'],
    'ALLOCATED_7A_ACCOUNT_21': ['7A_AC_21', 'ALLOCATED_7A_ACCOUNT_21', 'ALLOCATED 7A ACCOUNT 21', 'ALLOCATED_7A_AC21'],
    'ALLOCATED_7A_ACCOUNT_22': ['7A_AC_22', 'ALLOCATED_7A_ACCOUNT_22', 'ALLOCATED 7A ACCOUNT 22', 'ALLOCATED_7A_AC22'],
    'ALLOCATED_14B_ACCOUNT_1': ['14B_AC_1', 'ALLOCATED_14B_ACCOUNT_1', 'ALLOCATED 14B ACCOUNT 1', 'ALLOCATED_14B_AC1'],
    'ALLOCATED_14B_ACCOUNT_2': ['14B_AC_2', 'ALLOCATED_14B_ACCOUNT_2', 'ALLOCATED 14B ACCOUNT 2', 'ALLOCATED_14B_AC2'],
    'ALLOCATED_14B_ACCOUNT_10': ['14B_AC_10', 'ALLOCATED_14B_ACCOUNT_10', 'ALLOCATED 14B ACCOUNT 10', 'ALLOCATED_14B_AC10'],
    'ALLOCATED_14B_ACCOUNT_21': ['14B_AC_21', 'ALLOCATED_14B_ACCOUNT_21', 'ALLOCATED 14B ACCOUNT 21', 'ALLOCATED_14B_AC21'],
    'ALLOCATED_14B_ACCOUNT_22': ['14B_AC_22', 'ALLOCATED_14B_ACCOUNT_22', 'ALLOCATED 14B ACCOUNT 22', 'ALLOCATED_14B_AC22'],
    'ALLOCATED_7Q_ACCOUNT_1': ['7Q_AC_1', 'ALLOCATED_7Q_ACCOUNT_1', 'ALLOCATED 7Q ACCOUNT 1', 'ALLOCATED_7Q_AC1'],
    'ALLOCATED_7Q_ACCOUNT_2': ['7Q_AC_2', 'ALLOCATED_7Q_ACCOUNT_2', 'ALLOCATED 7Q ACCOUNT 2', 'ALLOCATED_7Q_AC2'],
    'ALLOCATED_7Q_ACCOUNT_10': ['7Q_AC_10', 'ALLOCATED_7Q_ACCOUNT_10', 'ALLOCATED 7Q ACCOUNT 10', 'ALLOCATED_7Q_AC10'],
    'ALLOCATED_7Q_ACCOUNT_21': ['7Q_AC_21', 'ALLOCATED_7Q_ACCOUNT_21', 'ALLOCATED 7Q ACCOUNT 21', 'ALLOCATED_7Q_AC21'],
    'ALLOCATED_7Q_ACCOUNT_22': ['7Q_AC_22', 'ALLOCATED_7Q_ACCOUNT_22', 'ALLOCATED 7Q ACCOUNT 22', 'ALLOCATED_7Q_AC22'],
  };

  const missingColumns = [];
  for (const [required, variations] of Object.entries(columnMapping)) {
    const found = variations.some(v => existingColumns.includes(v));
    if (!found) {
      missingColumns.push(required);
    }
  }

  if (missingColumns.length > 0) {
    throw {
      type: 'VALIDATION_ERROR',
      missingColumns: missingColumns,
      message: `Missing required columns: ${missingColumns.join(', ')}`,
    };
  }

  // Step 3: PRE-VALIDATION - Check ALL RRC numbers exist BEFORE processing
  const invalidRRCs = await validateAllRRCs(excelRows, username);
  
  if (invalidRRCs.length > 0) {
    // REJECT ENTIRE UPLOAD
    const errorMessage = `Upload rejected: The following RRC numbers are not present in RRC data:\n${invalidRRCs.map(rrc => `Row ${rrc.row}: ESTA_CODE: ${rrc.ESTA_CODE}, RRC_NO: ${rrc.RRC_NO}`).join('\n')}\n\nPlease ensure all ESTA_CODE and RRC_NO combinations exist in RRC data before uploading.`;
    throw {
      type: 'RRC_VALIDATION_ERROR',
      message: errorMessage,
      invalidRRCs: invalidRRCs,
    };
  }

  // Step 4: Process each row
  const processedRecoveries = [];
  const errors = [];

  for (let i = 0; i < excelRows.length; i++) {
    const excelRow = excelRows[i];
    const rowNumber = i + 2; // Excel row number (header is row 1)

    try {
      // Map Excel row to recovery data
      const recoveryData = mapExcelToRecovery(excelRow);
      
      // Validate required fields
      if (!recoveryData.ESTA_CODE || !recoveryData.RRC_NO || !recoveryData.RECOVERY_AMOUNT ||
          !recoveryData.BANK_NAME || !recoveryData.RECOVERY_DATE || !recoveryData.DD_TRRN_DATE ||
          !recoveryData.REFERENCE_NUMBER || !recoveryData.TRANSACTION_TYPE) {
        errors.push({
          row: rowNumber,
          error: 'Missing required field(s)',
        });
        continue;
      }

      // Validate TRANSACTION_TYPE
      if (recoveryData.TRANSACTION_TYPE !== 'DD' && recoveryData.TRANSACTION_TYPE !== 'TRRN') {
        errors.push({
          row: rowNumber,
          error: `Invalid TRANSACTION_TYPE: ${recoveryData.TRANSACTION_TYPE}. Must be DD or TRRN`,
        });
        continue;
      }

      // Validate RECOVERY_AMOUNT
      const recoveryAmount = toNumber(recoveryData.RECOVERY_AMOUNT);
      if (recoveryAmount <= 0) {
        errors.push({
          row: rowNumber,
          error: 'RECOVERY_AMOUNT must be greater than 0',
        });
        continue;
      }

      // Extract manual allocation (mandatory)
      const manualAllocation = extractManualAllocation(excelRow);
      
      // Get recovery cost (optional, default to 0)
      const recoveryCost = toNumber(recoveryData.RECOVERY_COST) || 0;
      
      // Validate: RECOVERY_AMOUNT should equal sum of all account allocations + RECOVERY_COST
      const totalAllocation = manualAllocation.ALLOCATED_7A + manualAllocation.ALLOCATED_14B + manualAllocation.ALLOCATED_7Q;
      const expectedRecoveryAmount = totalAllocation + recoveryCost;
      if (Math.abs(expectedRecoveryAmount - recoveryAmount) > 0.01) {
        errors.push({
          row: rowNumber,
          error: `Sum of account allocations (${totalAllocation.toFixed(2)}) + RECOVERY_COST (${recoveryCost.toFixed(2)}) = ${expectedRecoveryAmount.toFixed(2)}, but RECOVERY_AMOUNT is ${recoveryAmount.toFixed(2)}`,
        });
        continue;
      }

      // Validate all allocations are non-negative
      const allocationValues = Object.values(manualAllocation).filter(v => typeof v === 'number' && v !== 0);
      const allAllocationValues = [
        manualAllocation.ALLOCATED_7A_ACCOUNT_1_EE,
        manualAllocation.ALLOCATED_7A_ACCOUNT_1_ER,
        manualAllocation.ALLOCATED_7A_ACCOUNT_2,
        manualAllocation.ALLOCATED_7A_ACCOUNT_10,
        manualAllocation.ALLOCATED_7A_ACCOUNT_21,
        manualAllocation.ALLOCATED_7A_ACCOUNT_22,
        manualAllocation.ALLOCATED_14B_ACCOUNT_1,
        manualAllocation.ALLOCATED_14B_ACCOUNT_2,
        manualAllocation.ALLOCATED_14B_ACCOUNT_10,
        manualAllocation.ALLOCATED_14B_ACCOUNT_21,
        manualAllocation.ALLOCATED_14B_ACCOUNT_22,
        manualAllocation.ALLOCATED_7Q_ACCOUNT_1,
        manualAllocation.ALLOCATED_7Q_ACCOUNT_2,
        manualAllocation.ALLOCATED_7Q_ACCOUNT_10,
        manualAllocation.ALLOCATED_7Q_ACCOUNT_21,
        manualAllocation.ALLOCATED_7Q_ACCOUNT_22,
      ];
      if (allAllocationValues.some(v => v < 0)) {
        errors.push({
          row: rowNumber,
          error: 'Account allocations cannot be negative',
        });
        continue;
      }

      // Create recovery data object
      const createData = {
        username,
        regional_office_code: regionalOfficeCode || '',
        ESTA_CODE: recoveryData.ESTA_CODE,
        RRC_NO: recoveryData.RRC_NO,
        RECOVERY_AMOUNT: recoveryAmount,
        BANK_NAME: recoveryData.BANK_NAME,
        RECOVERY_DATE: recoveryData.RECOVERY_DATE,
        DD_TRRN_DATE: recoveryData.DD_TRRN_DATE,
        REFERENCE_NUMBER: recoveryData.REFERENCE_NUMBER,
        TRANSACTION_TYPE: recoveryData.TRANSACTION_TYPE,
        RECOVERY_COST: recoveryData.RECOVERY_COST,
        manualAllocation: manualAllocation,
      };

      // Create recovery (uses manual allocation)
      const recovery = await createRecovery(createData);
      processedRecoveries.push(recovery);

    } catch (error) {
      errors.push({
        row: rowNumber,
        error: error.message || 'Failed to process recovery entry',
      });
    }
  }

  return {
    recordsProcessed: processedRecoveries.length,
    recordsFailed: errors.length,
    totalRecords: excelRows.length,
    errors: errors,
  };
}

/**
 * Generate Recovery Excel template
 * @returns {Buffer} Excel file buffer
 */
export function generateRecoveryTemplate() {
  // Template data with all columns
  // Calculate totals from account-wise allocations for display
  const total7A = 1000.00 + 1000.00 + 2000.00 + 1500.00 + 1500.00 + 1000.00; // Sum of 7A_AC_* values
  const total14B = 500.00 + 500.00 + 0.00 + 0.00 + 0.00; // Sum of 14B_AC_* values
  const total7Q = 0.00 + 0.00 + 0.00 + 0.00 + 0.00; // Sum of 7Q_AC_* values

  const templateData = [{
    // Required fields
    'ESTA_CODE': 'PUPUN0033160000',
    'RRC_NO': 'RRC001',
    'RECOVERY_AMOUNT': 10000.50,
    'BANK_NAME': 'State Bank of India',
    'RECOVERY_DATE': new Date('2024-01-15'),
    'DD_TRRN_DATE': new Date('2024-01-10'),
    'REFERENCE_NUMBER': 'DD123456',
    'TRANSACTION_TYPE': 'DD',
    'RECOVERY_COST': 500.00,
    // Section 7A Account-wise Allocation (Mandatory)
    '7A_AC_1_EE': 1000.00,
    '7A_AC_1_ER': 1000.00,
    '7A_AC_2': 2000.00,
    '7A_AC_10': 1500.00,
    '7A_AC_21': 1500.00,
    '7A_AC_22': 1000.00,
    // Section 14B Account-wise Allocation (Mandatory)
    '14B_AC_1': 500.00,
    '14B_AC_2': 500.00,
    '14B_AC_10': 0.00,
    '14B_AC_21': 0.00,
    '14B_AC_22': 0.00,
    // Section 7Q Account-wise Allocation (Mandatory)
    '7Q_AC_1': 0.00,
    '7Q_AC_2': 0.00,
    '7Q_AC_10': 0.00,
    '7Q_AC_21': 0.00,
    '7Q_AC_22': 0.00,
    // Optional Total columns (for display/reference only - computed from account-wise values)
    'TOTAL_7A': total7A,
    'TOTAL_14B': total14B,
    'TOTAL_7Q': total7Q,
  }];

  // Create Excel file
  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recovery Data');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return buffer;
}