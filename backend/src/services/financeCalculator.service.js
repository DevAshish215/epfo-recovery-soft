/**
 * Finance Calculator Service
 * Calculates all financial fields for RRC data
 * Backend is the final authority for all calculations
 */

import { toNumber } from '../utils/number.util.js';

/**
 * Calculate demand total for a row
 * DEMAND_TOTAL = DEMAND_7A + DEMAND_14B + DEMAND_7Q
 * DEMAND_7A = Sum of all 7A account demands
 * DEMAND_14B = Sum of all 14B account demands
 * DEMAND_7Q = Sum of all 7Q account demands
 * @param {Object} row - Row data object
 * @returns {Object} Demand calculations including totals and section totals
 */
export function calculateDemand(row) {
  // Calculate section totals from account components
  // DEMAND_7A = Sum of all 7A accounts
  const demand7A = toNumber(row['DEMAND 7A']) || (
    toNumber(row['DEMAND_7A_ACCOUNT_1_EE'] || row['DEMAND 7A A/C 1_EE'] || 0) +
    toNumber(row['DEMAND_7A_ACCOUNT_1_ER'] || row['DEMAND 7A A/C 1_ER'] || 0) +
    toNumber(row['DEMAND_7A_ACCOUNT_2'] || row['DEMAND 7A A/C 2'] || 0) +
    toNumber(row['DEMAND_7A_ACCOUNT_10'] || row['DEMAND 7A A/C 10'] || 0) +
    toNumber(row['DEMAND_7A_ACCOUNT_21'] || row['DEMAND 7A A/C 21'] || 0) +
    toNumber(row['DEMAND_7A_ACCOUNT_22'] || row['DEMAND 7A A/C 22'] || 0)
  );

  // DEMAND_14B = Sum of all 14B accounts
  const demand14B = toNumber(row['DEMAND 14B']) || (
    toNumber(row['DEMAND_14B_ACCOUNT_1'] || row['DEMAND 14B A/C 1'] || 0) +
    toNumber(row['DEMAND_14B_ACCOUNT_2'] || row['DEMAND 14B A/C 2'] || 0) +
    toNumber(row['DEMAND_14B_ACCOUNT_10'] || row['DEMAND 14B A/C 10'] || 0) +
    toNumber(row['DEMAND_14B_ACCOUNT_21'] || row['DEMAND 14B A/C 21'] || 0) +
    toNumber(row['DEMAND_14B_ACCOUNT_22'] || row['DEMAND 14B A/C 22'] || 0)
  );

  // DEMAND_7Q = Sum of all 7Q accounts
  const demand7Q = toNumber(row['DEMAND 7Q']) || (
    toNumber(row['DEMAND_7Q_ACCOUNT_1'] || row['DEMAND 7Q A/C 1'] || 0) +
    toNumber(row['DEMAND_7Q_ACCOUNT_2'] || row['DEMAND 7Q A/C 2'] || 0) +
    toNumber(row['DEMAND_7Q_ACCOUNT_10'] || row['DEMAND 7Q A/C 10'] || 0) +
    toNumber(row['DEMAND_7Q_ACCOUNT_21'] || row['DEMAND 7Q A/C 21'] || 0) +
    toNumber(row['DEMAND_7Q_ACCOUNT_22'] || row['DEMAND 7Q A/C 22'] || 0)
  );

  const demandTotal = demand7A + demand14B + demand7Q;

  return {
    'DEMAND 7A': demand7A,
    'DEMAND 14B': demand14B,
    'DEMAND 7Q': demand7Q,
    'DEMAND TOTAL': demandTotal,
  };
}

/**
 * Calculate recovery total for a row
 * RECOVERY_TOTAL = RECOVERY_7A + RECOVERY_14B + RECOVERY_7Q
 * RECOVERY_7A = Sum of all 7A account recoveries
 * RECOVERY_14B = Sum of all 14B account recoveries
 * RECOVERY_7Q = Sum of all 7Q account recoveries
 * @param {Object} row - Row data object
 * @returns {Object} Recovery calculations including totals and section totals
 */
export function calculateRecovery(row) {
  // Calculate section totals from account components
  // RECOVERY_7A = Sum of all 7A accounts
  const recovery7A = toNumber(row['RECOVERY 7A']) || (
    toNumber(row['RECOVERY_7A_ACCOUNT_1_EE'] || row['RECOVERY 7A A/C 1_EE'] || 0) +
    toNumber(row['RECOVERY_7A_ACCOUNT_1_ER'] || row['RECOVERY 7A A/C 1_ER'] || 0) +
    toNumber(row['RECOVERY_7A_ACCOUNT_2'] || row['RECOVERY 7A A/C 2'] || 0) +
    toNumber(row['RECOVERY_7A_ACCOUNT_10'] || row['RECOVERY 7A A/C 10'] || 0) +
    toNumber(row['RECOVERY_7A_ACCOUNT_21'] || row['RECOVERY 7A A/C 21'] || 0) +
    toNumber(row['RECOVERY_7A_ACCOUNT_22'] || row['RECOVERY 7A A/C 22'] || 0)
  );

  // RECOVERY_14B = Sum of all 14B accounts
  const recovery14B = toNumber(row['RECOVERY 14B']) || (
    toNumber(row['RECOVERY_14B_ACCOUNT_1'] || row['RECOVERY 14B A/C 1'] || 0) +
    toNumber(row['RECOVERY_14B_ACCOUNT_2'] || row['RECOVERY 14B A/C 2'] || 0) +
    toNumber(row['RECOVERY_14B_ACCOUNT_10'] || row['RECOVERY 14B A/C 10'] || 0) +
    toNumber(row['RECOVERY_14B_ACCOUNT_21'] || row['RECOVERY 14B A/C 21'] || 0) +
    toNumber(row['RECOVERY_14B_ACCOUNT_22'] || row['RECOVERY 14B A/C 22'] || 0)
  );

  // RECOVERY_7Q = Sum of all 7Q accounts
  const recovery7Q = toNumber(row['RECOVERY 7Q']) || (
    toNumber(row['RECOVERY_7Q_ACCOUNT_1'] || row['RECOVERY 7Q A/C 1'] || 0) +
    toNumber(row['RECOVERY_7Q_ACCOUNT_2'] || row['RECOVERY 7Q A/C 2'] || 0) +
    toNumber(row['RECOVERY_7Q_ACCOUNT_10'] || row['RECOVERY 7Q A/C 10'] || 0) +
    toNumber(row['RECOVERY_7Q_ACCOUNT_21'] || row['RECOVERY 7Q A/C 21'] || 0) +
    toNumber(row['RECOVERY_7Q_ACCOUNT_22'] || row['RECOVERY 7Q A/C 22'] || 0)
  );

  const recoveryTotal = recovery7A + recovery14B + recovery7Q;

  return {
    'RECOVERY 7A': recovery7A,
    'RECOVERY 14B': recovery14B,
    'RECOVERY 7Q': recovery7Q,
    'RECOVERY TOTAL': recoveryTotal,
  };
}

/**
 * Calculate outstanding amounts (account-wise and section-wise)
 * Account-wise: OUTSTAND = DEMAND - RECOVERY (for each account)
 * Section-wise: OUTSTAND = Sum of account-wise outstanding
 * OUTSTAND_TOTAL = OUTSTAND_7A + OUTSTAND_14B + OUTSTAND_7Q
 * @param {Object} demand - Object with demand values (section and account-wise)
 * @param {Object} recovery - Object with recovery values (section and account-wise)
 * @returns {Object} Outstanding amounts (account-wise and section-wise)
 */
export function calculateOutstanding(demand, recovery) {
  // Account-wise outstanding for 7A
  const outstand7AAc1EE = toNumber(demand['DEMAND_7A_ACCOUNT_1_EE'] || demand['DEMAND 7A A/C 1_EE'] || 0) - 
                          toNumber(recovery['RECOVERY_7A_ACCOUNT_1_EE'] || recovery['RECOVERY 7A A/C 1_EE'] || 0);
  const outstand7AAc1ER = toNumber(demand['DEMAND_7A_ACCOUNT_1_ER'] || demand['DEMAND 7A A/C 1_ER'] || 0) - 
                          toNumber(recovery['RECOVERY_7A_ACCOUNT_1_ER'] || recovery['RECOVERY 7A A/C 1_ER'] || 0);
  const outstand7AAc2 = toNumber(demand['DEMAND_7A_ACCOUNT_2'] || demand['DEMAND 7A A/C 2'] || 0) - 
                        toNumber(recovery['RECOVERY_7A_ACCOUNT_2'] || recovery['RECOVERY 7A A/C 2'] || 0);
  const outstand7AAc10 = toNumber(demand['DEMAND_7A_ACCOUNT_10'] || demand['DEMAND 7A A/C 10'] || 0) - 
                         toNumber(recovery['RECOVERY_7A_ACCOUNT_10'] || recovery['RECOVERY 7A A/C 10'] || 0);
  const outstand7AAc21 = toNumber(demand['DEMAND_7A_ACCOUNT_21'] || demand['DEMAND 7A A/C 21'] || 0) - 
                         toNumber(recovery['RECOVERY_7A_ACCOUNT_21'] || recovery['RECOVERY 7A A/C 21'] || 0);
  const outstand7AAc22 = toNumber(demand['DEMAND_7A_ACCOUNT_22'] || demand['DEMAND 7A A/C 22'] || 0) - 
                         toNumber(recovery['RECOVERY_7A_ACCOUNT_22'] || recovery['RECOVERY 7A A/C 22'] || 0);

  // Section 7A outstanding = sum of all 7A accounts
  const outstanding7A = outstand7AAc1EE + outstand7AAc1ER + outstand7AAc2 + outstand7AAc10 + outstand7AAc21 + outstand7AAc22;

  // Account-wise outstanding for 14B
  const outstand14BAc1 = toNumber(demand['DEMAND_14B_ACCOUNT_1'] || demand['DEMAND 14B A/C 1'] || 0) - 
                         toNumber(recovery['RECOVERY_14B_ACCOUNT_1'] || recovery['RECOVERY 14B A/C 1'] || 0);
  const outstand14BAc2 = toNumber(demand['DEMAND_14B_ACCOUNT_2'] || demand['DEMAND 14B A/C 2'] || 0) - 
                         toNumber(recovery['RECOVERY_14B_ACCOUNT_2'] || recovery['RECOVERY 14B A/C 2'] || 0);
  const outstand14BAc10 = toNumber(demand['DEMAND_14B_ACCOUNT_10'] || demand['DEMAND 14B A/C 10'] || 0) - 
                          toNumber(recovery['RECOVERY_14B_ACCOUNT_10'] || recovery['RECOVERY 14B A/C 10'] || 0);
  const outstand14BAc21 = toNumber(demand['DEMAND_14B_ACCOUNT_21'] || demand['DEMAND 14B A/C 21'] || 0) - 
                          toNumber(recovery['RECOVERY_14B_ACCOUNT_21'] || recovery['RECOVERY 14B A/C 21'] || 0);
  const outstand14BAc22 = toNumber(demand['DEMAND_14B_ACCOUNT_22'] || demand['DEMAND 14B A/C 22'] || 0) - 
                          toNumber(recovery['RECOVERY_14B_ACCOUNT_22'] || recovery['RECOVERY 14B A/C 22'] || 0);

  // Section 14B outstanding = sum of all 14B accounts
  const outstanding14B = outstand14BAc1 + outstand14BAc2 + outstand14BAc10 + outstand14BAc21 + outstand14BAc22;

  // Account-wise outstanding for 7Q
  const outstand7QAc1 = toNumber(demand['DEMAND_7Q_ACCOUNT_1'] || demand['DEMAND 7Q A/C 1'] || 0) - 
                        toNumber(recovery['RECOVERY_7Q_ACCOUNT_1'] || recovery['RECOVERY 7Q A/C 1'] || 0);
  const outstand7QAc2 = toNumber(demand['DEMAND_7Q_ACCOUNT_2'] || demand['DEMAND 7Q A/C 2'] || 0) - 
                       toNumber(recovery['RECOVERY_7Q_ACCOUNT_2'] || recovery['RECOVERY 7Q A/C 2'] || 0);
  const outstand7QAc10 = toNumber(demand['DEMAND_7Q_ACCOUNT_10'] || demand['DEMAND 7Q A/C 10'] || 0) - 
                         toNumber(recovery['RECOVERY_7Q_ACCOUNT_10'] || recovery['RECOVERY 7Q A/C 10'] || 0);
  const outstand7QAc21 = toNumber(demand['DEMAND_7Q_ACCOUNT_21'] || demand['DEMAND 7Q A/C 21'] || 0) - 
                         toNumber(recovery['RECOVERY_7Q_ACCOUNT_21'] || recovery['RECOVERY 7Q A/C 21'] || 0);
  const outstand7QAc22 = toNumber(demand['DEMAND_7Q_ACCOUNT_22'] || demand['DEMAND 7Q A/C 22'] || 0) - 
                         toNumber(recovery['RECOVERY_7Q_ACCOUNT_22'] || recovery['RECOVERY 7Q A/C 22'] || 0);

  // Section 7Q outstanding = sum of all 7Q accounts
  const outstanding7Q = outstand7QAc1 + outstand7QAc2 + outstand7QAc10 + outstand7QAc21 + outstand7QAc22;

  // Total outstanding = sum of all sections
  const outstandingTotal = outstanding7A + outstanding14B + outstanding7Q;

  return {
    // Section-wise outstanding
    'OUTSTAND 7A': outstanding7A,
    'OUTSTAND 14B': outstanding14B,
    'OUTSTAND 7Q': outstanding7Q,
    'OUTSTAND TOTAL': outstandingTotal,
    // Account-wise outstanding for 7A
    'OUTSTAND_7A_ACCOUNT_1_EE': outstand7AAc1EE,
    'OUTSTAND_7A_ACCOUNT_1_ER': outstand7AAc1ER,
    'OUTSTAND_7A_ACCOUNT_2': outstand7AAc2,
    'OUTSTAND_7A_ACCOUNT_10': outstand7AAc10,
    'OUTSTAND_7A_ACCOUNT_21': outstand7AAc21,
    'OUTSTAND_7A_ACCOUNT_22': outstand7AAc22,
    // Account-wise outstanding for 14B
    'OUTSTAND_14B_ACCOUNT_1': outstand14BAc1,
    'OUTSTAND_14B_ACCOUNT_2': outstand14BAc2,
    'OUTSTAND_14B_ACCOUNT_10': outstand14BAc10,
    'OUTSTAND_14B_ACCOUNT_21': outstand14BAc21,
    'OUTSTAND_14B_ACCOUNT_22': outstand14BAc22,
    // Account-wise outstanding for 7Q
    'OUTSTAND_7Q_ACCOUNT_1': outstand7QAc1,
    'OUTSTAND_7Q_ACCOUNT_2': outstand7QAc2,
    'OUTSTAND_7Q_ACCOUNT_10': outstand7QAc10,
    'OUTSTAND_7Q_ACCOUNT_21': outstand7QAc21,
    'OUTSTAND_7Q_ACCOUNT_22': outstand7QAc22,
  };
}

/**
 * Calculate recovery cost outstanding
 * RECOVERY_COST = 0 (default)
 * RECEIVED_REC_COST = 0 (default)
 * OUTSTAND_REC_COST = RECOVERY_COST - RECEIVED_REC_COST
 * OUTSTAND_TOT_WITH_REC = OUTSTAND_TOTAL + OUTSTAND_REC_COST
 * @param {Object} row - Row data with OUTSTAND_TOTAL
 * @returns {Object} Recovery cost fields
 */
export function calculateRecoveryCost(row) {
  // Default values are 0
  const recoveryCost = toNumber(row['RECOVERY COST']);
  const receivedRecCost = toNumber(row['RECEVIED REC COST']);
  
  const outstandingTotal = toNumber(row['OUTSTAND TOTAL']);
  const outstandingRecCost = recoveryCost - receivedRecCost;
  const outstandingTotWithRec = outstandingTotal + outstandingRecCost;

  return {
    'RECOVERY COST': recoveryCost,
    'RECEVIED REC COST': receivedRecCost,
    'OUTSTAND REC COST': outstandingRecCost,
    'OUTSTAND TOT WITH REC': outstandingTotWithRec,
  };
}

/**
 * Calculate RRC-level totals (grouped by ESTA_CODE)
 * Groups all records by ESTA_CODE and calculates sums
 * @param {Array} rrcRecords - Array of RRC record objects
 * @returns {Object} RRC totals grouped by ESTA_CODE
 */
export function calculateRrcTotals(rrcRecords) {
  // Group records by ESTA_CODE
  const grouped = {};
  
  rrcRecords.forEach(record => {
    const estaCode = record['ESTA CODE'];
    if (!estaCode) return; // Skip if ESTA_CODE is missing
    
    if (!grouped[estaCode]) {
      grouped[estaCode] = [];
    }
    grouped[estaCode].push(record);
  });

  // Calculate totals for each ESTA_CODE group
  const totals = {};
  
  Object.keys(grouped).forEach(estaCode => {
    const records = grouped[estaCode];
    
    // Sum all values for this ESTA_CODE group
    totals[estaCode] = {
      'DEMAND TOTAL RRC': records.reduce((sum, record) => {
        return sum + toNumber(record['DEMAND TOTAL']);
      }, 0),
      
      'RECOVERY TOTAL RRC': records.reduce((sum, record) => {
        return sum + toNumber(record['RECOVERY TOTAL']);
      }, 0),
      
      'OUTSTAND TOTAL RRC': records.reduce((sum, record) => {
        return sum + toNumber(record['OUTSTAND TOTAL']);
      }, 0),
      
      // OUTSTAND REC COST is ESTA-level (same for all RRCs with same ESTA_CODE)
      'OUTSTAND REC COST RRC': records.length > 0 ? toNumber(records[0]['OUTSTAND REC COST']) : 0,
      
      'OUTSTAND TOT WITH REC RRC': records.reduce((sum, record) => {
        return sum + toNumber(record['OUTSTAND TOT WITH REC']);
      }, 0),
    };
  });

  return totals;
}

