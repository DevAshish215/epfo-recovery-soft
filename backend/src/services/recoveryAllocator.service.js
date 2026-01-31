/**
 * Recovery Allocator Service
 * Implements EPFO recovery law logic with strict priority-based allocation
 * 
 * Allocation Priority:
 * 1. Section Priority: 7A → 7Q → 14B (only for sections present in U/S)
 * 2. Account Priority (within each section):
 *    - Section 7A: ACCOUNT_1_EE → ACCOUNT_1_ER → ACCOUNT_10 → ACCOUNT_21 → ACCOUNT_2 → ACCOUNT_22
 *    - Section 7Q & 14B: ACCOUNT_1 → ACCOUNT_10 → ACCOUNT_21 → ACCOUNT_2 → ACCOUNT_22
 * 
 * U/S Field Logic:
 * - Only allocates to sections present in U/S field
 * - Maintains EPFO priority within allowed sections
 * - Examples:
 *   - U/S = "7Q" → Only allocate to 7Q (skip 7A and 14B)
 *   - U/S = "14B" → Only allocate to 14B (skip 7A and 7Q)
 *   - U/S = "14B & 7Q" → Allocate to 7Q first, then 14B (skip 7A)
 *   - U/S = "7A, 14B & 7Q" → Normal priority: 7A → 7Q → 14B
 * 
 * This service is the final authority for all recovery allocations
 */

import { toNumber } from '../utils/number.util.js';

/**
 * Parse U/S value to determine which sections are allowed for allocation
 * @param {string} usValue - U/S field value from RRC
 * @returns {Object} Object with flags for allowed sections: { allow7A, allow7Q, allow14B }
 */
function parseUSValue(usValue) {
  // Default: allow all sections if U/S is empty or null
  if (!usValue) {
    return { allow7A: true, allow7Q: true, allow14B: true };
  }
  
  const usUpper = String(usValue).toUpperCase();
  
  // Check for all three sections
  if (usUpper.includes('7A') && usUpper.includes('14B') && usUpper.includes('7Q')) {
    return { allow7A: true, allow7Q: true, allow14B: true };
  }
  
  // Check for pairs
  if (usUpper.includes('14B') && usUpper.includes('7Q')) {
    return { allow7A: false, allow7Q: true, allow14B: true };
  }
  if (usUpper.includes('7A') && usUpper.includes('14B')) {
    return { allow7A: true, allow7Q: false, allow14B: true };
  }
  if (usUpper.includes('7A') && usUpper.includes('7Q')) {
    return { allow7A: true, allow7Q: true, allow14B: false };
  }
  
  // Check for individual sections
  if (usUpper.includes('7A')) {
    return { allow7A: true, allow7Q: false, allow14B: false };
  }
  if (usUpper.includes('14B')) {
    return { allow7A: false, allow7Q: false, allow14B: true };
  }
  if (usUpper.includes('7Q')) {
    return { allow7A: false, allow7Q: true, allow14B: false };
  }
  
  // Default: allow all if pattern doesn't match
  return { allow7A: true, allow7Q: true, allow14B: true };
}

/**
 * Allocate recovery amount based on EPFO legal priority and U/S field
 * @param {number} recoveryAmount - Total recovery amount to allocate
 * @param {Object} outstandingAmounts - Current outstanding amounts for the RRC
 * @param {string} usValue - U/S field value from RRC (optional, defaults to all sections)
 * @returns {Object} Allocation breakdown with section-wise and account-wise details
 */
export function allocateRecovery(recoveryAmount, outstandingAmounts, usValue = null) {
  // Parse U/S to determine allowed sections
  const allowedSections = parseUSValue(usValue);
  // Convert all outstanding amounts to numbers
  const outstanding7A = toNumber(outstandingAmounts.OUTSTAND_7A || 0);
  const outstanding7Q = toNumber(outstandingAmounts.OUTSTAND_7Q || 0);
  const outstanding14B = toNumber(outstandingAmounts.OUTSTAND_14B || 0);

  // Initialize allocation result
  const allocation = {
    // Section-wise totals
    ALLOCATED_7A: 0,
    ALLOCATED_7Q: 0,
    ALLOCATED_14B: 0,
    
    // Section 7A account-wise allocation
    ALLOCATED_7A_ACCOUNT_1_EE: 0,
    ALLOCATED_7A_ACCOUNT_1_ER: 0,
    ALLOCATED_7A_ACCOUNT_10: 0,
    ALLOCATED_7A_ACCOUNT_21: 0,
    ALLOCATED_7A_ACCOUNT_2: 0,
    ALLOCATED_7A_ACCOUNT_22: 0,
    
    // Section 7Q account-wise allocation
    ALLOCATED_7Q_ACCOUNT_1: 0,
    ALLOCATED_7Q_ACCOUNT_10: 0,
    ALLOCATED_7Q_ACCOUNT_21: 0,
    ALLOCATED_7Q_ACCOUNT_2: 0,
    ALLOCATED_7Q_ACCOUNT_22: 0,
    
    // Section 14B account-wise allocation
    ALLOCATED_14B_ACCOUNT_1: 0,
    ALLOCATED_14B_ACCOUNT_10: 0,
    ALLOCATED_14B_ACCOUNT_21: 0,
    ALLOCATED_14B_ACCOUNT_2: 0,
    ALLOCATED_14B_ACCOUNT_22: 0,
  };

  // Remaining amount to allocate
  let remainingAmount = toNumber(recoveryAmount);

  // STEP 1: Allocate to Section 7A (highest priority) - only if allowed by U/S
  // Section 7A account priority: ACCOUNT_1_EE → ACCOUNT_1_ER → ACCOUNT_10 → ACCOUNT_21 → ACCOUNT_2 → ACCOUNT_22
  if (remainingAmount > 0 && outstanding7A > 0 && allowedSections.allow7A) {
    // Get outstanding amounts for each 7A account
    // Note: We need to calculate these from the RRC data
    // For now, we'll allocate proportionally or use the total outstanding7A
    const outstanding7AAccounts = {
      ACCOUNT_1_EE: toNumber(outstandingAmounts.OUTSTAND_7A_ACCOUNT_1_EE || 0),
      ACCOUNT_1_ER: toNumber(outstandingAmounts.OUTSTAND_7A_ACCOUNT_1_ER || 0),
      ACCOUNT_10: toNumber(outstandingAmounts.OUTSTAND_7A_ACCOUNT_10 || 0),
      ACCOUNT_21: toNumber(outstandingAmounts.OUTSTAND_7A_ACCOUNT_21 || 0),
      ACCOUNT_2: toNumber(outstandingAmounts.OUTSTAND_7A_ACCOUNT_2 || 0),
      ACCOUNT_22: toNumber(outstandingAmounts.OUTSTAND_7A_ACCOUNT_22 || 0),
    };

    // Allocate to 7A accounts in priority order
    const account7APriority = [
      { key: 'ALLOCATED_7A_ACCOUNT_1_EE', outstanding: outstanding7AAccounts.ACCOUNT_1_EE },
      { key: 'ALLOCATED_7A_ACCOUNT_1_ER', outstanding: outstanding7AAccounts.ACCOUNT_1_ER },
      { key: 'ALLOCATED_7A_ACCOUNT_10', outstanding: outstanding7AAccounts.ACCOUNT_10 },
      { key: 'ALLOCATED_7A_ACCOUNT_21', outstanding: outstanding7AAccounts.ACCOUNT_21 },
      { key: 'ALLOCATED_7A_ACCOUNT_2', outstanding: outstanding7AAccounts.ACCOUNT_2 },
      { key: 'ALLOCATED_7A_ACCOUNT_22', outstanding: outstanding7AAccounts.ACCOUNT_22 },
    ];

    for (let i = 0; i < account7APriority.length && remainingAmount > 0; i++) {
      const account = account7APriority[i];
      if (account.outstanding > 0) {
        // Allocate as much as possible to this account (up to its outstanding amount)
        const allocateToAccount = Math.min(remainingAmount, account.outstanding);
        allocation[account.key] = allocateToAccount;
        allocation.ALLOCATED_7A += allocateToAccount;
        remainingAmount -= allocateToAccount;
      }
    }
  }

  // STEP 2: Allocate to Section 7Q (second priority) - only if allowed by U/S
  // Section 7Q account priority: ACCOUNT_1 → ACCOUNT_10 → ACCOUNT_21 → ACCOUNT_2 → ACCOUNT_22
  if (remainingAmount > 0 && outstanding7Q > 0 && allowedSections.allow7Q) {
    const outstanding7QAccounts = {
      ACCOUNT_1: toNumber(outstandingAmounts.OUTSTAND_7Q_ACCOUNT_1 || 0),
      ACCOUNT_10: toNumber(outstandingAmounts.OUTSTAND_7Q_ACCOUNT_10 || 0),
      ACCOUNT_21: toNumber(outstandingAmounts.OUTSTAND_7Q_ACCOUNT_21 || 0),
      ACCOUNT_2: toNumber(outstandingAmounts.OUTSTAND_7Q_ACCOUNT_2 || 0),
      ACCOUNT_22: toNumber(outstandingAmounts.OUTSTAND_7Q_ACCOUNT_22 || 0),
    };

    const account7QPriority = [
      { key: 'ALLOCATED_7Q_ACCOUNT_1', outstanding: outstanding7QAccounts.ACCOUNT_1 },
      { key: 'ALLOCATED_7Q_ACCOUNT_10', outstanding: outstanding7QAccounts.ACCOUNT_10 },
      { key: 'ALLOCATED_7Q_ACCOUNT_21', outstanding: outstanding7QAccounts.ACCOUNT_21 },
      { key: 'ALLOCATED_7Q_ACCOUNT_2', outstanding: outstanding7QAccounts.ACCOUNT_2 },
      { key: 'ALLOCATED_7Q_ACCOUNT_22', outstanding: outstanding7QAccounts.ACCOUNT_22 },
    ];

    for (let i = 0; i < account7QPriority.length && remainingAmount > 0; i++) {
      const account = account7QPriority[i];
      if (account.outstanding > 0) {
        const allocateToAccount = Math.min(remainingAmount, account.outstanding);
        allocation[account.key] = allocateToAccount;
        allocation.ALLOCATED_7Q += allocateToAccount;
        remainingAmount -= allocateToAccount;
      }
    }
  }

  // STEP 3: Allocate to Section 14B (lowest priority) - only if allowed by U/S
  // Section 14B account priority: ACCOUNT_1 → ACCOUNT_10 → ACCOUNT_21 → ACCOUNT_2 → ACCOUNT_22
  if (remainingAmount > 0 && outstanding14B > 0 && allowedSections.allow14B) {
    const outstanding14BAccounts = {
      ACCOUNT_1: toNumber(outstandingAmounts.OUTSTAND_14B_ACCOUNT_1 || 0),
      ACCOUNT_10: toNumber(outstandingAmounts.OUTSTAND_14B_ACCOUNT_10 || 0),
      ACCOUNT_21: toNumber(outstandingAmounts.OUTSTAND_14B_ACCOUNT_21 || 0),
      ACCOUNT_2: toNumber(outstandingAmounts.OUTSTAND_14B_ACCOUNT_2 || 0),
      ACCOUNT_22: toNumber(outstandingAmounts.OUTSTAND_14B_ACCOUNT_22 || 0),
    };

    const account14BPriority = [
      { key: 'ALLOCATED_14B_ACCOUNT_1', outstanding: outstanding14BAccounts.ACCOUNT_1 },
      { key: 'ALLOCATED_14B_ACCOUNT_10', outstanding: outstanding14BAccounts.ACCOUNT_10 },
      { key: 'ALLOCATED_14B_ACCOUNT_21', outstanding: outstanding14BAccounts.ACCOUNT_21 },
      { key: 'ALLOCATED_14B_ACCOUNT_2', outstanding: outstanding14BAccounts.ACCOUNT_2 },
      { key: 'ALLOCATED_14B_ACCOUNT_22', outstanding: outstanding14BAccounts.ACCOUNT_22 },
    ];

    for (let i = 0; i < account14BPriority.length && remainingAmount > 0; i++) {
      const account = account14BPriority[i];
      if (account.outstanding > 0) {
        const allocateToAccount = Math.min(remainingAmount, account.outstanding);
        allocation[account.key] = allocateToAccount;
        allocation.ALLOCATED_14B += allocateToAccount;
        remainingAmount -= allocateToAccount;
      }
    }
  }

  // Return allocation result
  return allocation;
}

/**
 * Preview allocation without saving
 * This is used by the frontend to show how the recovery will be allocated
 * @param {number} recoveryAmount - Total recovery amount
 * @param {Object} outstandingAmounts - Current outstanding amounts
 * @param {string} usValue - U/S field value from RRC (optional)
 * @returns {Object} Preview of allocation
 */
export function previewAllocation(recoveryAmount, outstandingAmounts, usValue = null) {
  return allocateRecovery(recoveryAmount, outstandingAmounts, usValue);
}

