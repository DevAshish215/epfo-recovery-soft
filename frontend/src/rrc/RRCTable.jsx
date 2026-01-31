/**
 * RRC Table Component
 * Displays comprehensive RRC data with all account-wise fields
 * Supports edit, update, and delete functionality with live calculations
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import api from '../api/api.js';
import PopupField from '../components/rrc/PopupField';
import CP25Popup from '../components/rrc/CP25Popup';
import CP26Popup from '../components/rrc/CP26Popup';
import EstaLetterPopup from '../components/rrc/EstaLetterPopup';
import SummonPopup from '../components/rrc/SummonPopup';
import CP3BankPopup from '../components/rrc/CP3BankPopup';
import IncomeTaxLetterPopup from '../components/rrc/IncomeTaxLetterPopup';
import logger from '../utils/logger.js';
import { toNumber, formatNumber } from '../utils/number.util.js';
import { formatDate, formatDateForInput } from '../utils/date.util.js';

function calculateDemand(row) {
  const demand7A = toNumber(row.DEMAND_7A_ACCOUNT_1_EE || 0) +
    toNumber(row.DEMAND_7A_ACCOUNT_1_ER || 0) +
    toNumber(row.DEMAND_7A_ACCOUNT_2 || 0) +
    toNumber(row.DEMAND_7A_ACCOUNT_10 || 0) +
    toNumber(row.DEMAND_7A_ACCOUNT_21 || 0) +
    toNumber(row.DEMAND_7A_ACCOUNT_22 || 0);

  const demand14B = toNumber(row.DEMAND_14B_ACCOUNT_1 || 0) +
    toNumber(row.DEMAND_14B_ACCOUNT_2 || 0) +
    toNumber(row.DEMAND_14B_ACCOUNT_10 || 0) +
    toNumber(row.DEMAND_14B_ACCOUNT_21 || 0) +
    toNumber(row.DEMAND_14B_ACCOUNT_22 || 0);

  const demand7Q = toNumber(row.DEMAND_7Q_ACCOUNT_1 || 0) +
    toNumber(row.DEMAND_7Q_ACCOUNT_2 || 0) +
    toNumber(row.DEMAND_7Q_ACCOUNT_10 || 0) +
    toNumber(row.DEMAND_7Q_ACCOUNT_21 || 0) +
    toNumber(row.DEMAND_7Q_ACCOUNT_22 || 0);

  const demandTotal = demand7A + demand14B + demand7Q;

  return {
    DEMAND_7A: demand7A,
    DEMAND_14B: demand14B,
    DEMAND_7Q: demand7Q,
    DEMAND_TOTAL: demandTotal,
  };
}

function calculateRecovery(row) {
  const recovery7A = toNumber(row.RECOVERY_7A_ACCOUNT_1_EE || 0) +
    toNumber(row.RECOVERY_7A_ACCOUNT_1_ER || 0) +
    toNumber(row.RECOVERY_7A_ACCOUNT_2 || 0) +
    toNumber(row.RECOVERY_7A_ACCOUNT_10 || 0) +
    toNumber(row.RECOVERY_7A_ACCOUNT_21 || 0) +
    toNumber(row.RECOVERY_7A_ACCOUNT_22 || 0);

  const recovery14B = toNumber(row.RECOVERY_14B_ACCOUNT_1 || 0) +
    toNumber(row.RECOVERY_14B_ACCOUNT_2 || 0) +
    toNumber(row.RECOVERY_14B_ACCOUNT_10 || 0) +
    toNumber(row.RECOVERY_14B_ACCOUNT_21 || 0) +
    toNumber(row.RECOVERY_14B_ACCOUNT_22 || 0);

  const recovery7Q = toNumber(row.RECOVERY_7Q_ACCOUNT_1 || 0) +
    toNumber(row.RECOVERY_7Q_ACCOUNT_2 || 0) +
    toNumber(row.RECOVERY_7Q_ACCOUNT_10 || 0) +
    toNumber(row.RECOVERY_7Q_ACCOUNT_21 || 0) +
    toNumber(row.RECOVERY_7Q_ACCOUNT_22 || 0);

  const recoveryTotal = recovery7A + recovery14B + recovery7Q;

  return {
    RECOVERY_7A: recovery7A,
    RECOVERY_14B: recovery14B,
    RECOVERY_7Q: recovery7Q,
    RECOVERY_TOTAL: recoveryTotal,
  };
}

function calculateOutstanding(row) {
  // Account-wise outstanding
  const outstand7AAc1EE = toNumber(row.DEMAND_7A_ACCOUNT_1_EE || 0) - toNumber(row.RECOVERY_7A_ACCOUNT_1_EE || 0);
  const outstand7AAc1ER = toNumber(row.DEMAND_7A_ACCOUNT_1_ER || 0) - toNumber(row.RECOVERY_7A_ACCOUNT_1_ER || 0);
  const outstand7AAc2 = toNumber(row.DEMAND_7A_ACCOUNT_2 || 0) - toNumber(row.RECOVERY_7A_ACCOUNT_2 || 0);
  const outstand7AAc10 = toNumber(row.DEMAND_7A_ACCOUNT_10 || 0) - toNumber(row.RECOVERY_7A_ACCOUNT_10 || 0);
  const outstand7AAc21 = toNumber(row.DEMAND_7A_ACCOUNT_21 || 0) - toNumber(row.RECOVERY_7A_ACCOUNT_21 || 0);
  const outstand7AAc22 = toNumber(row.DEMAND_7A_ACCOUNT_22 || 0) - toNumber(row.RECOVERY_7A_ACCOUNT_22 || 0);

  const outstand14BAc1 = toNumber(row.DEMAND_14B_ACCOUNT_1 || 0) - toNumber(row.RECOVERY_14B_ACCOUNT_1 || 0);
  const outstand14BAc2 = toNumber(row.DEMAND_14B_ACCOUNT_2 || 0) - toNumber(row.RECOVERY_14B_ACCOUNT_2 || 0);
  const outstand14BAc10 = toNumber(row.DEMAND_14B_ACCOUNT_10 || 0) - toNumber(row.RECOVERY_14B_ACCOUNT_10 || 0);
  const outstand14BAc21 = toNumber(row.DEMAND_14B_ACCOUNT_21 || 0) - toNumber(row.RECOVERY_14B_ACCOUNT_21 || 0);
  const outstand14BAc22 = toNumber(row.DEMAND_14B_ACCOUNT_22 || 0) - toNumber(row.RECOVERY_14B_ACCOUNT_22 || 0);

  const outstand7QAc1 = toNumber(row.DEMAND_7Q_ACCOUNT_1 || 0) - toNumber(row.RECOVERY_7Q_ACCOUNT_1 || 0);
  const outstand7QAc2 = toNumber(row.DEMAND_7Q_ACCOUNT_2 || 0) - toNumber(row.RECOVERY_7Q_ACCOUNT_2 || 0);
  const outstand7QAc10 = toNumber(row.DEMAND_7Q_ACCOUNT_10 || 0) - toNumber(row.RECOVERY_7Q_ACCOUNT_10 || 0);
  const outstand7QAc21 = toNumber(row.DEMAND_7Q_ACCOUNT_21 || 0) - toNumber(row.RECOVERY_7Q_ACCOUNT_21 || 0);
  const outstand7QAc22 = toNumber(row.DEMAND_7Q_ACCOUNT_22 || 0) - toNumber(row.RECOVERY_7Q_ACCOUNT_22 || 0);

  // Section totals
  const outstanding7A = outstand7AAc1EE + outstand7AAc1ER + outstand7AAc2 + outstand7AAc10 + outstand7AAc21 + outstand7AAc22;
  const outstanding14B = outstand14BAc1 + outstand14BAc2 + outstand14BAc10 + outstand14BAc21 + outstand14BAc22;
  const outstanding7Q = outstand7QAc1 + outstand7QAc2 + outstand7QAc10 + outstand7QAc21 + outstand7QAc22;
  const outstandingTotal = outstanding7A + outstanding14B + outstanding7Q;

  return {
    OUTSTAND_7A: outstanding7A,
    OUTSTAND_14B: outstanding14B,
    OUTSTAND_7Q: outstanding7Q,
    OUTSTAND_TOTAL: outstandingTotal,
    OUTSTAND_7A_ACCOUNT_1_EE: outstand7AAc1EE,
    OUTSTAND_7A_ACCOUNT_1_ER: outstand7AAc1ER,
    OUTSTAND_7A_ACCOUNT_2: outstand7AAc2,
    OUTSTAND_7A_ACCOUNT_10: outstand7AAc10,
    OUTSTAND_7A_ACCOUNT_21: outstand7AAc21,
    OUTSTAND_7A_ACCOUNT_22: outstand7AAc22,
    OUTSTAND_14B_ACCOUNT_1: outstand14BAc1,
    OUTSTAND_14B_ACCOUNT_2: outstand14BAc2,
    OUTSTAND_14B_ACCOUNT_10: outstand14BAc10,
    OUTSTAND_14B_ACCOUNT_21: outstand14BAc21,
    OUTSTAND_14B_ACCOUNT_22: outstand14BAc22,
    OUTSTAND_7Q_ACCOUNT_1: outstand7QAc1,
    OUTSTAND_7Q_ACCOUNT_2: outstand7QAc2,
    OUTSTAND_7Q_ACCOUNT_10: outstand7QAc10,
    OUTSTAND_7Q_ACCOUNT_21: outstand7QAc21,
    OUTSTAND_7Q_ACCOUNT_22: outstand7QAc22,
  };
}

function calculateRecoveryCost(row) {
  const recoveryCost = toNumber(row.RECOVERY_COST || 0);
  const receivedRecCost = toNumber(row.RECEVIED_REC_COST || 0);
  const outstandingTotal = toNumber(row.OUTSTAND_TOTAL || 0);
  const outstandingRecCost = recoveryCost - receivedRecCost;
  const outstandingTotWithRec = outstandingTotal + outstandingRecCost;

  return {
    OUTSTAND_REC_COST: outstandingRecCost,
    OUTSTAND_TOT_WITH_REC: outstandingTotWithRec,
  };
}

function calculateAllFinancials(row) {
  const demand = calculateDemand(row);
  const recovery = calculateRecovery(row);
  const outstanding = calculateOutstanding(row);
  const recoveryCost = calculateRecoveryCost({ ...row, OUTSTAND_TOTAL: outstanding.OUTSTAND_TOTAL });

  return {
    ...demand,
    ...recovery,
    ...outstanding,
    ...recoveryCost,
  };
}

function RRCTable({ rrcData, loading, error, username, establishmentData = [], officeData = null, onRefresh, onSuccess }) {
  // Validate and normalize props to prevent crashes
  try {
    if (!rrcData) {
      logger.warn('RRCTable: rrcData is null or undefined, using empty array');
      rrcData = [];
    }
    if (!Array.isArray(rrcData)) {
      logger.warn('RRCTable: rrcData is not an array, converting to array');
      rrcData = [];
    }
    if (!establishmentData) {
      logger.warn('RRCTable: establishmentData is null or undefined, using empty array');
      establishmentData = [];
    }
    if (!Array.isArray(establishmentData)) {
      logger.warn('RRCTable: establishmentData is not an array, converting to array');
      establishmentData = [];
    }
    if (loading === undefined) loading = false;
    if (error === undefined) error = '';
    if (username === undefined) username = '';
  } catch (err) {
    logger.error('RRCTable: Error validating props:', err);
    // Set safe defaults
    rrcData = [];
    establishmentData = [];
    loading = false;
    error = '';
    username = '';
  }
  const [selectedRow, setSelectedRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCP1Popup, setShowCP1Popup] = useState(false);
  const [cp1NoticeDate, setCP1NoticeDate] = useState('');
  const [cp1Loading, setCP1Loading] = useState(false);
  const [cp1Error, setCP1Error] = useState('');
  const [cp1Remark, setCP1Remark] = useState('');
  const [showCP25Popup, setShowCP25Popup] = useState(false);
  const [cp25NoticeDate, setCP25NoticeDate] = useState('');
  const [cp25Loading, setCP25Loading] = useState(false);
  const [cp25Error, setCP25Error] = useState('');
  const [cp25EmployerName, setCP25EmployerName] = useState('');
  const [cp25UseExistingAddress, setCP25UseExistingAddress] = useState(true);
  const [cp25NewAddress, setCP25NewAddress] = useState('');
  const [cp25NewPinCode, setCP25NewPinCode] = useState(''); // Separate PIN CODE for new address
  const [cp25EnforcementOfficer, setCP25EnforcementOfficer] = useState(''); // Enforcement Officer Name
  const [cp25SavedAddresses, setCP25SavedAddresses] = useState([]);
  const [cp25SavedAddressEnforcementOfficers, setCP25SavedAddressEnforcementOfficers] = useState({}); // Map of saved address ID to Enforcement Officer name
  const [cp25SavedEmployerNames, setCP25SavedEmployerNames] = useState([]); // List of saved employer names
  const [cp25SelectedEmployerNames, setCP25SelectedEmployerNames] = useState([]); // Array of selected employer name IDs/names
  const [cp25SelectedSavedAddress, setCP25SelectedSavedAddress] = useState('');
  const [cp25AddressMode, setCP25AddressMode] = useState('existing'); // 'existing', 'saved', 'new'
  const [cp25LoadingAddresses, setCP25LoadingAddresses] = useState(false);
  const [cp25HearingDate, setCP25HearingDate] = useState('');
  const [cp25HearingTime, setCP25HearingTime] = useState('');
  const [cp25CP1Date, setCP25CP1Date] = useState(''); // CP-1 DATE for CP-25 popup
  const [cp25Remark, setCP25Remark] = useState('');
  // CP-26 states
  const [showCP26Popup, setShowCP26Popup] = useState(false);
  const [cp26NoticeDate, setCP26NoticeDate] = useState('');
  const [cp26PoliceStationAddress, setCP26PoliceStationAddress] = useState('');
  const [cp26PoliceStationDistrict, setCP26PoliceStationDistrict] = useState('');
  const [cp26PoliceStationPinCode, setCP26PoliceStationPinCode] = useState('');
  const [cp26EnforcementOfficer, setCP26EnforcementOfficer] = useState('');
  const [cp26ScheduledDate, setCP26ScheduledDate] = useState('');
  const [cp26ShowCauseRef, setCP26ShowCauseRef] = useState('');
  const [cp26PreviousHearingDates, setCP26PreviousHearingDates] = useState('');
  const [cp26DeputyPoliceCommissionerAddress, setCP26DeputyPoliceCommissionerAddress] = useState('');
  const [cp26SavedPoliceStationAddresses, setCP26SavedPoliceStationAddresses] = useState([]);
  const [cp26SavedDeputyPoliceCommissionerAddresses, setCP26SavedDeputyPoliceCommissionerAddresses] = useState([]);
  const [cp26SelectedPoliceStationAddress, setCP26SelectedPoliceStationAddress] = useState('');
  const [cp26SelectedDeputyPoliceCommissionerAddress, setCP26SelectedDeputyPoliceCommissionerAddress] = useState('');
  const [cp26Loading, setCP26Loading] = useState(false);
  const [cp26Error, setCP26Error] = useState('');
  const [cp26Remark, setCP26Remark] = useState('');
  // Edit states
  const [cp25EditingNameId, setCP25EditingNameId] = useState(null); // ID of employer name being edited
  const [cp25EditingNameValue, setCP25EditingNameValue] = useState(''); // Value being edited
  const [cp25EditingAddressId, setCP25EditingAddressId] = useState(null); // ID of address being edited
  const [cp25EditingAddressValue, setCP25EditingAddressValue] = useState(''); // Address value being edited
  const [cp25EditingAddressPinCode, setCP25EditingAddressPinCode] = useState(''); // PIN CODE being edited
  const [cp25EditingExistingAddress, setCP25EditingExistingAddress] = useState(false); // Whether existing address is being edited
  const [cp25EditingExistingAddressValue, setCP25EditingExistingAddressValue] = useState(''); // Existing address value being edited
  const [cp25EditingExistingDistrict, setCP25EditingExistingDistrict] = useState(''); // District being edited for existing address
  const [cp25EditingExistingPinCode, setCP25EditingExistingPinCode] = useState(''); // PIN CODE being edited for existing address
  // ESTA LETTER states
  const [showEstaLetterPopup, setShowEstaLetterPopup] = useState(false);
  // SUMMON states
  const [showSummonPopup, setShowSummonPopup] = useState(false);
  // CP-3 Bank states
  const [showCP3BankPopup, setShowCP3BankPopup] = useState(false);
  // Income Tax Letter states
  const [showIncomeTaxLetterPopup, setShowIncomeTaxLetterPopup] = useState(false);
  const [estaLetterDate, setEstaLetterDate] = useState('');
  const [estaLetterEmployerName, setEstaLetterEmployerName] = useState('');
  const [estaLetterSubject, setEstaLetterSubject] = useState('');
  const [estaLetterBody, setEstaLetterBody] = useState('');
  const [estaLetterAddress, setEstaLetterAddress] = useState('');
  const [estaLetterLoading, setEstaLetterLoading] = useState(false);
  const [estaLetterError, setEstaLetterError] = useState('');
  const [estaLetterSavedEmployerNames, setEstaLetterSavedEmployerNames] = useState([]);
  const [estaLetterPrompt, setEstaLetterPrompt] = useState('');
  const [estaLetterGenerating, setEstaLetterGenerating] = useState(false);
  const [estaLetterRemark, setEstaLetterRemark] = useState('');

  // Create a map of ESTA_CODE to establishment data for quick lookup
  const establishmentMap = useMemo(() => {
    const map = {};
    if (establishmentData && Array.isArray(establishmentData)) {
      establishmentData.forEach(esta => {
        if (esta.ESTA_CODE) {
          map[esta.ESTA_CODE] = esta;
        }
      });
    }
    return map;
  }, [establishmentData]);

  // Merge RRC data with establishment data based on ESTA_CODE
  // Also map Regional Office Name from office details to RO field
  const mergedRrcData = useMemo(() => {
    if (!rrcData || !Array.isArray(rrcData)) return [];
    
    // Get Regional Office Name from office data
    const regionalOfficeName = officeData?.regional_office_name || '';
    
    return rrcData.map(rrc => {
      const estaCode = rrc.ESTA_CODE;
      const establishment = establishmentMap[estaCode];
      
      if (establishment) {
        // Map establishment fields to RRC fields
        // Note: PIN_CODE in establishment maps to PIN_CD in RRC
        // Note: ESTABLISHMENT_PAN in establishment maps to ESTA_PAN in RRC
        // Priority: Establishment data takes precedence (ESTA-level fields should come from establishment)
        return {
          ...rrc,
          // Map Regional Office Name from office details to RO field
          RO: regionalOfficeName || rrc.RO || '',
          // Use establishment data first, fallback to RRC data if establishment doesn't have it
          ADD1: establishment.ADD1 || rrc.ADD1 || '',
          ADD2: establishment.ADD2 || rrc.ADD2 || '',
          CITY: establishment.CITY || rrc.CITY || '',
          DIST: establishment.DIST || rrc.DIST || '',
          PIN_CD: establishment.PIN_CODE || rrc.PIN_CD || '',
          CIRCLE: establishment.CIRCLE || rrc.CIRCLE || '',
          MOBILE_NO: establishment.MOBILE_NO || rrc.MOBILE_NO || '',
          EMAIL: establishment.EMAIL || rrc.EMAIL || '',
          STATUS: establishment.STATUS || rrc.STATUS || '',
          ESTA_PAN: establishment.ESTABLISHMENT_PAN || rrc.ESTA_PAN || '',
        };
      }
      
      // Even if no establishment data, map RO from office details
      return {
        ...rrc,
        RO: regionalOfficeName || rrc.RO || '',
      };
    });
  }, [rrcData, establishmentMap, officeData]);

  // Calculate all financial fields live
  const computedValues = useMemo(() => {
    if (!editRow) return {};
    return calculateAllFinancials(editRow);
  }, [editRow]);

  // Get RRC totals for ESTA_CODE (from all RRCs with same ESTA_CODE)
  // This should match backend calculation: sum of OUTSTAND_TOT_WITH_REC for all RRCs with same ESTA_CODE
  const rrcTotals = useMemo(() => {
    if (!editRow || !mergedRrcData) return {};
    const estaCode = editRow.ESTA_CODE;
    if (!estaCode) return {};

    const estaRrcs = mergedRrcData.filter(r => r.ESTA_CODE === estaCode);
    const totals = {
      DEMAND_TOTAL_RRC: 0,
      RECOVERY_TOTAL_RRC: 0,
      OUTSTAND_TOTAL_RRC: 0,
      OUTSTAND_REC_COST: 0, // ESTA-level (same for all RRCs with same ESTA_CODE)
      OUTSTAND_TOT_WITH_REC_RRC: 0,
    };

    estaRrcs.forEach(rrc => {
      // Use stored values from database (these are already calculated by backend)
      totals.DEMAND_TOTAL_RRC += toNumber(rrc.DEMAND_TOTAL || 0);
      totals.RECOVERY_TOTAL_RRC += toNumber(rrc.RECOVERY_TOTAL || 0);
      totals.OUTSTAND_TOTAL_RRC += toNumber(rrc.OUTSTAND_TOTAL || 0);
      // OUTSTAND_TOT_WITH_REC_RRC = Sum of OUTSTAND_TOT_WITH_REC for all RRCs with same ESTA_CODE
      totals.OUTSTAND_TOT_WITH_REC_RRC += toNumber(rrc.OUTSTAND_TOT_WITH_REC || 0);
    });
    
    // OUTSTAND_REC_COST is ESTA-level (same for all RRCs with same ESTA_CODE)
    totals.OUTSTAND_REC_COST = estaRrcs.length > 0 ? toNumber(estaRrcs[0].OUTSTAND_REC_COST || 0) : 0;

    return totals;
  }, [editRow, mergedRrcData]);

  // Normalize PIN code values for comparisons
  const normalizePinCode = (value) => {
    if (value === undefined || value === null) return '';
    return value.toString().trim();
  };

  // Fetch Enforcement Officer by PIN CODE - defined early so useEffect can use it
  const fetchEnforcementOfficerByPinCode = async (pinCode) => {
    const normalizedPin = normalizePinCode(pinCode);
    if (!normalizedPin || !username) {
      setCP25EnforcementOfficer('');
      return;
    }

    try {
      const response = await api.get('/rrc', {
        params: { username }
      });
      
      if (response.data.success) {
        const rrcs = response.data.data || [];
        const rrcWithPin = rrcs.find(r => normalizePinCode(r.PIN_CD) === normalizedPin);
        if (rrcWithPin && rrcWithPin.ENFORCEMENT_OFFICER) {
          setCP25EnforcementOfficer(rrcWithPin.ENFORCEMENT_OFFICER);
        } else {
          setCP25EnforcementOfficer('');
        }
      }
    } catch (err) {
      logger.error('Error fetching enforcement officer:', err);
      setCP25EnforcementOfficer('');
    }
  };

  // Fetch Enforcement Officer for CP-26 by PIN CODE
  const fetchCP26EnforcementOfficerByPinCode = async (pinCode) => {
    const normalizedPin = normalizePinCode(pinCode);
    if (!normalizedPin || !username) {
      setCP26EnforcementOfficer('');
      return;
    }

    try {
      const response = await api.get('/rrc', {
        params: { username }
      });
      
      if (response.data.success) {
        const rrcs = response.data.data || [];
        const rrcWithPin = rrcs.find(r => normalizePinCode(r.PIN_CD) === normalizedPin);
        if (rrcWithPin && rrcWithPin.ENFORCEMENT_OFFICER) {
          setCP26EnforcementOfficer(rrcWithPin.ENFORCEMENT_OFFICER);
        } else {
          setCP26EnforcementOfficer('');
        }
      }
    } catch (err) {
      logger.error('Error fetching CP-26 enforcement officer:', err);
      setCP26EnforcementOfficer('');
    }
  };

  // Watch for PIN CODE changes in new address and update Enforcement Officer in real-time
  // MUST be before any early returns to maintain hooks order
  useEffect(() => {
    if (cp25AddressMode === 'new' && cp25NewPinCode) {
      // Debounce the API call
      const timeoutId = setTimeout(() => {
        fetchEnforcementOfficerByPinCode(cp25NewPinCode);
      }, 500); // Wait 500ms after user stops typing

      return () => clearTimeout(timeoutId);
    } else if (cp25AddressMode === 'existing' && editRow?.PIN_CD) {
      // When using existing address, fetch Enforcement Officer from existing PIN CODE
      fetchEnforcementOfficerByPinCode(editRow.PIN_CD);
    } else if (cp25AddressMode === 'saved' && cp25SelectedSavedAddress) {
      // For saved addresses, fetch Enforcement Officer from saved address PIN CODE
      const saved = cp25SavedAddresses.find(addr => addr._id === cp25SelectedSavedAddress);
      if (saved && saved.pinCode) {
        fetchEnforcementOfficerByPinCode(saved.pinCode);
      } else {
        setCP25EnforcementOfficer('');
      }
    } else if (cp25AddressMode === 'saved' && !cp25SelectedSavedAddress) {
      // No saved address selected, clear Enforcement Officer
      setCP25EnforcementOfficer('');
    }
  }, [cp25NewPinCode, cp25AddressMode, editRow?.PIN_CD, cp25SelectedSavedAddress, cp25SavedAddresses]);

  // Watch for CP-26 Police Station PIN CODE changes and update Enforcement Officer
  useEffect(() => {
    if (cp26PoliceStationPinCode && cp26PoliceStationPinCode.trim()) {
      const timeoutId = setTimeout(() => {
        fetchCP26EnforcementOfficerByPinCode(cp26PoliceStationPinCode);
      }, 500); // Wait 500ms after user stops typing

      return () => clearTimeout(timeoutId);
    } else {
      setCP26EnforcementOfficer('');
    }
  }, [cp26PoliceStationPinCode]);

  // Debug logging - MUST be before any early returns
  useEffect(() => {
    logger.debug('RRCTable render state:', {
      loading,
      error,
      rrcDataLength: rrcData?.length,
      mergedRrcDataLength: mergedRrcData?.length,
      username
    });
  }, [loading, error, rrcData, mergedRrcData, username]);

  // Early returns - MUST be after all hooks
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading RRC data...</div>
        <div style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>Please wait...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red', border: '1px solid #f5c6cb', borderRadius: '4px', background: '#f8d7da' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Error loading RRC data:</div>
        <div>{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            marginTop: '10px', 
            padding: '8px 16px', 
            background: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    );
  }

  if (!mergedRrcData || mergedRrcData.length === 0) {
    return (
      <div style={{ padding: '20px', color: '#666', border: '1px solid #ddd', borderRadius: '4px', background: '#f9f9f9' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>No RRC data found</div>
        <div style={{ fontSize: '14px', marginBottom: '10px' }}>
          {!rrcData || rrcData.length === 0 
            ? 'Upload an Excel/CSV file using the "RRC Upload" tab to get started.'
            : 'RRC data exists but could not be merged with establishment data.'}
        </div>
        <div style={{ fontSize: '12px', color: '#999' }}>
          Debug info: rrcData.length = {rrcData?.length || 0}, mergedRrcData.length = {mergedRrcData?.length || 0}
        </div>
      </div>
    );
  }

  // Format date for remarks (DD-MM-YYYY) - specific to this component
  const formatDateForRemark = (dateValue) => {
    if (!dateValue) {
      return '';
    }
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return '';
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (e) {
      return '';
    }
  };

  // ESTA-level fields (unique per ESTA_CODE - same for all RRCs with same ESTA_CODE)
  const ESTA_LEVEL_FIELDS = [
    'RO', 'ADD1', 'ADD2', 'CITY', 'DIST', 'PIN_CD', 'CIRCLE',
    'MOBILE_NO', 'EMAIL', 'STATUS', 'ESTA_PAN',
    'CP_1_DATE',
    'REMARKS', 'ENFORCEMENT_OFFICER',
    'RECOVERY_COST', 'RECEVIED_REC_COST',
  ];

  // Open popup when row is clicked
  const openPopup = (row) => {
    const rowCopy = JSON.parse(JSON.stringify(row));
    
    // For ESTA-level fields, get values from the first RRC with same ESTA_CODE
    const estaCode = row.ESTA_CODE;
    if (estaCode && mergedRrcData) {
      const estaRrcs = mergedRrcData.filter(r => r.ESTA_CODE === estaCode);
      const firstEstaRrc = estaRrcs[0] || row;
      
      // Use ESTA-level field values from first RRC (which already has merged establishment data)
      ESTA_LEVEL_FIELDS.forEach(field => {
        if (firstEstaRrc[field] !== undefined && firstEstaRrc[field] !== null) {
          rowCopy[field] = firstEstaRrc[field];
        }
      });
    }
    
    // Initialize all 148 fields in editRow (even if they don't exist in data)
    // This ensures all fields are displayed in the popup
    const allFields = getAllRRCFields();
    allFields.nonFinancial.forEach(field => {
      if (rowCopy[field.key] === undefined || rowCopy[field.key] === null) {
        rowCopy[field.key] = '';
      }
    });
    allFields.financial.forEach(field => {
      if (rowCopy[field.key] === undefined || rowCopy[field.key] === null) {
        rowCopy[field.key] = field.type === 'number' ? 0 : '';
      }
    });
    
    // Format all date fields for proper display in date inputs (like backup)
    const dateFields = ['RRC_DATE', 'RRC DATE', 'CP_1_DATE', 'CP-1_DATE', 'CP-1 DATE', 'CP1 DATE'];
    
    dateFields.forEach(field => {
      const originalValue = rowCopy[field];
      if (originalValue !== null && originalValue !== undefined && originalValue !== '') {
        const formatted = formatDateForInput(originalValue);
        if (formatted) {
          rowCopy[field] = formatted;
        }
      }
    });
    
    setSelectedRow(row);
    setEditRow(rowCopy);
  };

  // Close popup
  const closePopup = () => {
    setSelectedRow(null);
    setEditRow(null);
    setIsSaving(false);
    setIsDeleting(false);
  };

  // Handle field change in edit form - Optimized with useCallback
  const handleFieldChange = useCallback((field, value) => {
    if (!editRow) return;
    
    // Don't allow editing computed fields
    const computedFields = [
      'DEMAND_TOTAL', 'RECOVERY_TOTAL', 'OUTSTAND_7A', 'OUTSTAND_14B', 'OUTSTAND_7Q',
      'OUTSTAND_TOTAL', 'OUTSTAND_REC_COST', 'OUTSTAND_TOT_WITH_REC',
      'DEMAND_TOTAL_RRC', 'RECOVERY_TOTAL_RRC', 'OUTSTAND_TOTAL_RRC',
      'OUTSTAND_TOT_WITH_REC_RRC',
      '_id', '__v', 'username', 'regional_office_code',
      // Account-wise outstanding fields are computed
      'OUTSTAND_7A_ACCOUNT_1_EE', 'OUTSTAND_7A_ACCOUNT_1_ER', 'OUTSTAND_7A_ACCOUNT_2',
      'OUTSTAND_7A_ACCOUNT_10', 'OUTSTAND_7A_ACCOUNT_21', 'OUTSTAND_7A_ACCOUNT_22',
      'OUTSTAND_14B_ACCOUNT_1', 'OUTSTAND_14B_ACCOUNT_2', 'OUTSTAND_14B_ACCOUNT_10',
      'OUTSTAND_14B_ACCOUNT_21', 'OUTSTAND_14B_ACCOUNT_22',
      'OUTSTAND_7Q_ACCOUNT_1', 'OUTSTAND_7Q_ACCOUNT_2', 'OUTSTAND_7Q_ACCOUNT_10',
      'OUTSTAND_7Q_ACCOUNT_21', 'OUTSTAND_7Q_ACCOUNT_22',
      // Section totals are computed
      'DEMAND_7A', 'DEMAND_14B', 'DEMAND_7Q',
      'RECOVERY_7A', 'RECOVERY_14B', 'RECOVERY_7Q',
    ];
    
    if (computedFields.includes(field)) {
      return;
    }
    
    setEditRow(prev => ({ ...prev, [field]: value }));
  }, [editRow]);

  // Handle save
  const handleSave = async () => {
    if (!editRow || !editRow._id || !username) return;
    
    const confirmed = window.confirm('Are you sure you want to save these changes?');
    if (!confirmed) return;
    
    try {
      setIsSaving(true);
      
      // Prepare payload - exclude computed fields and internal fields
      const payload = {};
      Object.keys(editRow).forEach(key => {
        if (key === '_id' || key === '__v' || key === 'username' || key === 'regional_office_code') {
          return;
        }
        
        // Skip computed fields - backend will recalculate
        const computedFields = [
          'DEMAND_TOTAL', 'RECOVERY_TOTAL', 'OUTSTAND_7A', 'OUTSTAND_14B', 'OUTSTAND_7Q',
          'OUTSTAND_TOTAL', 'OUTSTAND_REC_COST', 'OUTSTAND_TOT_WITH_REC',
          'DEMAND_TOTAL_RRC', 'RECOVERY_TOTAL_RRC', 'OUTSTAND_TOTAL_RRC',
          'OUTSTAND_TOT_WITH_REC_RRC',
          'OUTSTAND_7A_ACCOUNT_1_EE', 'OUTSTAND_7A_ACCOUNT_1_ER', 'OUTSTAND_7A_ACCOUNT_2',
          'OUTSTAND_7A_ACCOUNT_10', 'OUTSTAND_7A_ACCOUNT_21', 'OUTSTAND_7A_ACCOUNT_22',
          'OUTSTAND_14B_ACCOUNT_1', 'OUTSTAND_14B_ACCOUNT_2', 'OUTSTAND_14B_ACCOUNT_10',
          'OUTSTAND_14B_ACCOUNT_21', 'OUTSTAND_14B_ACCOUNT_22',
          'OUTSTAND_7Q_ACCOUNT_1', 'OUTSTAND_7Q_ACCOUNT_2', 'OUTSTAND_7Q_ACCOUNT_10',
          'OUTSTAND_7Q_ACCOUNT_21', 'OUTSTAND_7Q_ACCOUNT_22',
          'DEMAND_7A', 'DEMAND_14B', 'DEMAND_7Q',
          'RECOVERY_7A', 'RECOVERY_14B', 'RECOVERY_7Q',
        ];
        if (computedFields.includes(key)) {
          return;
        }
        
        let value = editRow[key];
        
        // Handle date field
        if (key === 'RRC_DATE' && value) {
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            value = new Date(value + 'T00:00:00').toISOString();
          }
        }
        
        // Handle numeric fields
        if (typeof value === 'string' && value.trim() === '') {
          const numericFields = [
            'DEMAND_7A_ACCOUNT_1_EE', 'DEMAND_7A_ACCOUNT_1_ER', 'DEMAND_7A_ACCOUNT_2',
            'DEMAND_7A_ACCOUNT_10', 'DEMAND_7A_ACCOUNT_21', 'DEMAND_7A_ACCOUNT_22',
            'DEMAND_14B_ACCOUNT_1', 'DEMAND_14B_ACCOUNT_2', 'DEMAND_14B_ACCOUNT_10',
            'DEMAND_14B_ACCOUNT_21', 'DEMAND_14B_ACCOUNT_22',
            'DEMAND_7Q_ACCOUNT_1', 'DEMAND_7Q_ACCOUNT_2', 'DEMAND_7Q_ACCOUNT_10',
            'DEMAND_7Q_ACCOUNT_21', 'DEMAND_7Q_ACCOUNT_22',
            'RECOVERY_7A_ACCOUNT_1_EE', 'RECOVERY_7A_ACCOUNT_1_ER', 'RECOVERY_7A_ACCOUNT_2',
            'RECOVERY_7A_ACCOUNT_10', 'RECOVERY_7A_ACCOUNT_21', 'RECOVERY_7A_ACCOUNT_22',
            'RECOVERY_14B_ACCOUNT_1', 'RECOVERY_14B_ACCOUNT_2', 'RECOVERY_14B_ACCOUNT_10',
            'RECOVERY_14B_ACCOUNT_21', 'RECOVERY_14B_ACCOUNT_22',
            'RECOVERY_7Q_ACCOUNT_1', 'RECOVERY_7Q_ACCOUNT_2', 'RECOVERY_7Q_ACCOUNT_10',
            'RECOVERY_7Q_ACCOUNT_21', 'RECOVERY_7Q_ACCOUNT_22',
            'RECOVERY_COST', 'RECEVIED_REC_COST'
          ];
          if (numericFields.includes(key)) {
            value = 0;
          } else {
            value = null;
          }
        }
        
        payload[key] = value;
      });
      
      // Add username to payload
      payload.username = username;
      
      // Send update request
      const response = await api.put(`/rrc/${editRow._id}`, payload);
      
      if (response.data && response.data.success) {
        alert('RRC updated successfully!');
        closePopup();
        if (onRefresh) {
          onRefresh();
        }
      } else {
        throw new Error(response.data?.message || 'Update failed');
      }
    } catch (err) {
      logger.error('Save failed', err);
      alert(`Failed to save changes: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete (soft delete - move to trash)
  const handleDelete = async () => {
    if (!editRow || !editRow._id || !username) return;
    
    const confirmed = window.confirm('Are you sure you want to move this RRC record to trash? You can restore it later from the Trash tab.');
    if (!confirmed) return;
    
    try {
      setIsDeleting(true);
      
      const response = await api.delete(`/rrc/${editRow._id}?username=${username}`);
      
      if (response.data && response.data.success) {
        alert('RRC moved to trash successfully!');
        closePopup();
        if (onRefresh) {
          onRefresh();
        }
      } else {
        throw new Error(response.data?.message || 'Delete failed');
      }
    } catch (err) {
      logger.error('Delete failed', err);
      alert(`Failed to move RRC to trash: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle CP-1 button click
  const handleCP1Click = () => {
    if (!editRow) return;
    setCP1NoticeDate(getTodayDate());
    setCP1Error('');
    setCP1Remark(''); // Reset remark
    setShowCP1Popup(true);
  };

  // Load saved employer addresses for CP-25
  const loadSavedEmployerAddresses = async () => {
    if (!editRow || !username) return;
    
    try {
      setCP25LoadingAddresses(true);
      const response = await api.get(`/employer-address/${editRow.ESTA_CODE}`, {
        params: { username }
      });
      
      if (response.data.success) {
        const addresses = response.data.data || [];
        setCP25SavedAddresses(addresses);
        
        // Extract unique employer names from addresses
        const uniqueNames = [...new Set(addresses
          .filter(addr => addr.employerName && addr.employerName.trim())
          .map(addr => addr.employerName.trim())
        )];
        setCP25SavedEmployerNames(uniqueNames);
        
        // Fetch Enforcement Officer for each saved address
        // Fetch all RRCs once and map enforcement officers by PIN CODE
        const enforcementOfficerMap = {};
        try {
          const rrcResponse = await api.get('/rrc', {
            params: { username }
          });
          
          if (rrcResponse.data.success) {
            const rrcs = rrcResponse.data.data || [];
            // Create a map of PIN CODE to Enforcement Officer
            const pinToOfficerMap = {};
            rrcs.forEach(rrc => {
              if (rrc.PIN_CD && rrc.ENFORCEMENT_OFFICER) {
                pinToOfficerMap[rrc.PIN_CD.trim()] = rrc.ENFORCEMENT_OFFICER;
              }
            });
            
            // Map enforcement officers to saved addresses
            addresses.forEach(addr => {
              if (addr.pinCode && addr.pinCode.trim() && pinToOfficerMap[addr.pinCode.trim()]) {
                enforcementOfficerMap[addr._id] = pinToOfficerMap[addr.pinCode.trim()];
              }
            });
          }
        } catch (err) {
          logger.error('Error fetching enforcement officers for saved addresses:', err);
        }
        
        setCP25SavedAddressEnforcementOfficers(enforcementOfficerMap);
        
        // Return addresses for use in promise chain
        return addresses;
      }
      return [];
    } catch (err) {
      logger.error('Error loading saved employer addresses:', err);
      setCP25SavedAddresses([]);
      setCP25SavedEmployerNames([]);
    } finally {
      setCP25LoadingAddresses(false);
    }
  };

  // Load saved employer names separately
  const loadSavedEmployerNames = async () => {
    if (!editRow || !username) return;
    
    try {
      const response = await api.get(`/employer-address/${editRow.ESTA_CODE}/names`, {
        params: { username }
      });
      
      if (response.data.success) {
        const names = response.data.data || [];
        // Merge with existing names from addresses
        setCP25SavedEmployerNames(prev => {
          const combined = [...new Set([...prev, ...names])];
          return combined;
        });
      }
    } catch (err) {
      logger.error('Error loading saved employer names:', err);
      // Don't clear if we already have names from addresses
    }
  };

  // Handle saving employer name only (without address)
  const handleSaveEmployerNameOnly = async () => {
    if (!editRow || !username || !cp25EmployerName.trim()) {
      setCP25Error('Please enter employer name to save');
      return;
    }

    try {
      setCP25Loading(true);
      const response = await api.post('/employer-address', {
        username,
        estaCode: editRow.ESTA_CODE,
        employerName: cp25EmployerName.trim(),
        address: '', // Save name only
      });

      if (response.data.success) {
        // Reload addresses to immediately show the new name in the list
        await loadSavedEmployerAddresses();
        await loadSavedEmployerNames();
        setCP25EmployerName(''); // Clear input after saving
        if (onSuccess) {
          onSuccess('Employer name saved successfully!');
        }
      }
    } catch (err) {
      logger.error('Error saving employer name:', err);
      setCP25Error(err.response?.data?.message || 'Failed to save employer name');
    } finally {
      setCP25Loading(false);
    }
  };

  // Handle saving address only (without employer name)
  const handleSaveAddressOnly = async () => {
    if (!editRow || !username) {
      setCP25Error('Invalid request');
      return;
    }

    // Get current address and PIN CODE based on mode
    // If editing existing address, use edited values; otherwise use original values
    let currentAddress = '';
    let currentPinCode = '';
    let currentDistrict = '';
    
    if (cp25AddressMode === 'existing') {
      if (cp25EditingExistingAddress) {
        // Use edited values
        currentAddress = cp25EditingExistingAddressValue;
        currentPinCode = cp25EditingExistingPinCode;
        currentDistrict = cp25EditingExistingDistrict;
        
        // First, update the RRC record with edited values
        const addressLines = currentAddress.split('\n').map(line => line.trim()).filter(line => line);
        const add1 = addressLines[0] || '';
        const add2 = addressLines[1] || '';
        const city = addressLines[2] || '';

        try {
          await api.put(`/rrc/${editRow._id}`, {
            username,
            ADD1: add1,
            ADD2: add2,
            CITY: city,
            DIST: currentDistrict.trim(),
            PIN_CD: currentPinCode.trim(),
          });
          
          // Exit edit mode after saving
          setCP25EditingExistingAddress(false);
          setCP25EditingExistingAddressValue('');
          setCP25EditingExistingDistrict('');
          setCP25EditingExistingPinCode('');
        } catch (err) {
          logger.error('Error updating RRC address:', err);
          setCP25Error(err.response?.data?.message || 'Failed to update RRC address');
          return;
        }
      } else {
        // Use original values
        currentAddress = getExistingAddress();
        currentPinCode = getExistingPinCode();
      }
    } else if (cp25AddressMode === 'saved') {
      const saved = cp25SavedAddresses.find(addr => addr._id === cp25SelectedSavedAddress);
      if (saved) {
        currentAddress = saved.address;
        currentPinCode = saved.pinCode || '';
      }
    } else if (cp25AddressMode === 'new') {
      currentAddress = cp25NewAddress.trim();
      currentPinCode = cp25NewPinCode.trim();
      if (!currentPinCode) {
        setCP25Error('Please enter PIN CODE for new address');
        return;
      }
    }

    if (!currentAddress || currentAddress.trim() === '') {
      setCP25Error('Please select or enter an address to save');
      return;
    }

    // Append PIN CODE to address if not already included
    if (currentPinCode && !currentAddress.includes(currentPinCode)) {
      currentAddress = `${currentAddress}\n${currentPinCode}`;
    }

    try {
      setCP25Loading(true);
      // Extract PIN CODE from address if included
      let addressWithoutPin = currentAddress.trim();
      let extractedPinCode = currentPinCode || '';
      
      // Try to extract PIN CODE from address if not already separated
      if (!extractedPinCode && addressWithoutPin) {
        const pinMatch = addressWithoutPin.match(/\b\d{6}\b/);
        if (pinMatch) {
          extractedPinCode = pinMatch[0];
          // Remove PIN CODE from address
          addressWithoutPin = addressWithoutPin.replace(/\b\d{6}\b/, '').trim();
        }
      }

      const response = await api.post('/employer-address', {
        username,
        estaCode: editRow.ESTA_CODE,
        employerName: '', // Save address only
        address: addressWithoutPin,
        pinCode: extractedPinCode,
      });

      if (response.data.success) {
        await loadSavedEmployerAddresses();
        if (onSuccess) {
          onSuccess('Address saved successfully!');
        }
      }
    } catch (err) {
      logger.error('Error saving address:', err);
      setCP25Error(err.response?.data?.message || 'Failed to save address');
    } finally {
      setCP25Loading(false);
    }
  };

  // Handle toggling employer name selection
  const handleToggleEmployerName = (name) => {
    setCP25SelectedEmployerNames(prev => {
      if (prev.includes(name)) {
        return prev.filter(n => n !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  // Handle editing employer name
  const handleEditEmployerName = (addressId, currentName) => {
    setCP25EditingNameId(addressId);
    setCP25EditingNameValue(currentName);
  };

  // Handle saving edited employer name
  const handleSaveEditedEmployerName = async () => {
    if (!editRow || !username || !cp25EditingNameId || !cp25EditingNameValue.trim()) {
      setCP25Error('Please enter employer name to save');
      return;
    }

    try {
      setCP25Loading(true);
      const response = await api.put(`/employer-address/${cp25EditingNameId}`, {
        username,
        employerName: cp25EditingNameValue.trim(),
        address: '', // Name only
        pinCode: '',
      });

      if (response.data.success) {
        await loadSavedEmployerAddresses();
        await loadSavedEmployerNames();
        setCP25EditingNameId(null);
        setCP25EditingNameValue('');
        if (onSuccess) {
          onSuccess('Employer name updated successfully!');
        }
      }
    } catch (err) {
      logger.error('Error updating employer name:', err);
      setCP25Error(err.response?.data?.message || 'Failed to update employer name');
    } finally {
      setCP25Loading(false);
    }
  };

  // Handle deleting employer name
  const handleDeleteEmployerName = async (addressId) => {
    if (!editRow || !username || !addressId) {
      setCP25Error('Invalid request');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this employer name?')) {
      return;
    }

    try {
      setCP25Loading(true);
      const response = await api.delete(`/employer-address/${addressId}`, {
        params: { username }
      });

      if (response.data.success) {
        await loadSavedEmployerAddresses();
        await loadSavedEmployerNames();
        // Remove from selected names if it was selected
        const deletedName = cp25SavedAddresses.find(addr => addr._id === addressId)?.employerName;
        if (deletedName) {
          setCP25SelectedEmployerNames(prev => prev.filter(n => n !== deletedName));
        }
        if (onSuccess) {
          onSuccess('Employer name deleted successfully!');
        }
      }
    } catch (err) {
      logger.error('Error deleting employer name:', err);
      setCP25Error(err.response?.data?.message || 'Failed to delete employer name');
    } finally {
      setCP25Loading(false);
    }
  };

  // Handle editing address
  const handleEditAddress = (addressId, currentAddress, currentPinCode, currentEmployerName) => {
    setCP25EditingAddressId(addressId);
    setCP25EditingAddressValue(currentAddress);
    setCP25EditingAddressPinCode(currentPinCode || '');
    // Store original employerName to preserve it during update
    setCP25EditingAddressOriginalEmployerName(currentEmployerName || '');
  };

  // Handle saving edited address
  const handleSaveEditedAddress = async () => {
    if (!editRow || !username || !cp25EditingAddressId || !cp25EditingAddressValue.trim()) {
      setCP25Error('Please enter address to save');
      return;
    }

    try {
      setCP25Loading(true);
      setCP25Error('');
      // Extract PIN CODE from address if included
      let addressWithoutPin = cp25EditingAddressValue.trim();
      let extractedPinCode = cp25EditingAddressPinCode.trim();
      
      // Try to extract PIN CODE from address if not already separated
      if (!extractedPinCode && addressWithoutPin) {
        const pinMatch = addressWithoutPin.match(/\b\d{6}\b/);
        if (pinMatch) {
          extractedPinCode = pinMatch[0];
          // Remove PIN CODE from address
          addressWithoutPin = addressWithoutPin.replace(/\b\d{6}\b/, '').trim();
        }
      }

      // Preserve original employerName if it exists (don't clear it when updating address)
      // If original had employerName, we need to pass it, but backend requires only one field
      // So we'll pass empty string for employerName and the address
      const response = await api.put(`/employer-address/${cp25EditingAddressId}`, {
        username,
        employerName: '', // Address only - clear employerName if it was there
        address: addressWithoutPin,
        pinCode: extractedPinCode,
      });

      if (response.data.success) {
        // Reload addresses to get updated data
        await loadSavedEmployerAddresses();
        setCP25EditingAddressId(null);
        setCP25EditingAddressValue('');
        setCP25EditingAddressPinCode('');
        setCP25EditingAddressOriginalEmployerName('');
        if (onSuccess) {
          onSuccess('Address updated successfully!');
        }
      } else {
        setCP25Error('Failed to update address');
      }
    } catch (err) {
      logger.error('Error updating address:', err);
      setCP25Error(err.response?.data?.message || err.message || 'Failed to update address');
    } finally {
      setCP25Loading(false);
    }
  };

  // Handle deleting address
  const handleDeleteAddress = async (addressId) => {
    if (!editRow || !username || !addressId) {
      setCP25Error('Invalid request');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      setCP25Loading(true);
      const response = await api.delete(`/employer-address/${addressId}`, {
        params: { username }
      });

      if (response.data.success) {
        await loadSavedEmployerAddresses();
        // Clear selection if deleted address was selected
        if (cp25SelectedSavedAddress === addressId) {
          setCP25SelectedSavedAddress('');
          setCP25AddressMode('existing');
        }
        if (onSuccess) {
          onSuccess('Address deleted successfully!');
        }
      }
    } catch (err) {
      logger.error('Error deleting address:', err);
      setCP25Error(err.response?.data?.message || 'Failed to delete address');
    } finally {
      setCP25Loading(false);
    }
  };

  // Handle CP-26 notice generation
  const handleGenerateCP26 = async (isAEO = false) => {
    if (!editRow || !username || !cp26NoticeDate) {
      setCP26Error('Please enter notice date');
      return;
    }

    if (!cp26PoliceStationAddress || !cp26PoliceStationAddress.trim()) {
      setCP26Error('Please enter police station address');
      return;
    }

    if (!cp26ScheduledDate) {
      setCP26Error('Please enter scheduled date');
      return;
    }

    if (!cp26ShowCauseRef || !cp26ShowCauseRef.trim()) {
      setCP26Error('Please enter show cause notice reference & date');
      return;
    }

    if (!cp26PreviousHearingDates || !cp26PreviousHearingDates.trim()) {
      setCP26Error('Please enter previous hearing dates');
      return;
    }

    if (!cp26DeputyPoliceCommissionerAddress || !cp26DeputyPoliceCommissionerAddress.trim()) {
      setCP26Error('Please enter deputy police commissioner address');
      return;
    }

    // Get Enforcement Officer (prefer fetched by PIN, fallback to RRC record)
    const enforcementOfficerName = cp26EnforcementOfficer || editRow.ENFORCEMENT_OFFICER || '';

    // Save addresses to localStorage
    if (cp26PoliceStationAddress.trim()) {
      saveCP26Address('policeStation', cp26PoliceStationAddress);
    }
    if (cp26DeputyPoliceCommissionerAddress.trim()) {
      saveCP26Address('deputyPoliceCommissioner', cp26DeputyPoliceCommissionerAddress);
    }

    // Ask if user wants to add a remark
    let finalRemark = '';
    const addRemark = window.confirm('Do you want to add a remark to RRC data?');
    
    if (addRemark) {
      // If remark field already has value, use it; otherwise prompt
      if (cp26Remark && cp26Remark.trim()) {
        finalRemark = cp26Remark.trim();
      } else {
        const remarkInput = window.prompt('Enter remark to be added to REMARKS field:', '');
        if (remarkInput === null) {
          // User cancelled, don't proceed
          return;
        }
        finalRemark = remarkInput.trim();
      }
    }

    try {
      setCP26Loading(true);
      setCP26Error('');

      const response = await api.post(
        '/notices/cp26/generate',
        {
          username,
          estaCode: editRow.ESTA_CODE,
          rrcNo: editRow.RRC_NO,
          noticeDate: cp26NoticeDate,
          policeStationAddress: cp26PoliceStationAddress.trim(),
          scheduledDate: cp26ScheduledDate,
          showCauseRef: cp26ShowCauseRef.trim(),
          previousHearingDates: cp26PreviousHearingDates.trim(),
          deputyPoliceCommissionerAddress: cp26DeputyPoliceCommissionerAddress.trim(),
          regionalOfficeName: officeData?.regional_office_name || '',
          enforcementOfficer: enforcementOfficerName,
          isAEO: isAEO,
          remark: finalRemark,
        },
        {
          responseType: 'blob',
        }
      );

      // Create blob and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'CP-26_Notice.docx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Close popup and show success
      setShowCP26Popup(false);
      setCP26Remark(''); // Reset remark
      // Refresh RRC data to show updated remarks
      if (onRefresh) {
        onRefresh();
      }
      if (onSuccess) {
        onSuccess(`CP-26 ${isAEO ? 'AEO ' : ''}notice generated and downloaded successfully!`);
      }
    } catch (err) {
      logger.error('CP-26 generation failed', err);
      let errorMessage = 'Failed to generate CP-26 notice';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setCP26Error(errorMessage);
    } finally {
      setCP26Loading(false);
    }
  };

  // Load saved CP-26 addresses from localStorage
  const loadSavedCP26Addresses = () => {
    if (!editRow || !editRow.ESTA_CODE) return;
    
    const policeStationKey = `cp26_police_station_${editRow.ESTA_CODE}`;
    const deputyPoliceKey = `cp26_deputy_police_${editRow.ESTA_CODE}`;
    
    const savedPoliceStation = JSON.parse(localStorage.getItem(policeStationKey) || '[]');
    const savedDeputyPolice = JSON.parse(localStorage.getItem(deputyPoliceKey) || '[]');
    
    setCP26SavedPoliceStationAddresses(savedPoliceStation);
    setCP26SavedDeputyPoliceCommissionerAddresses(savedDeputyPolice);
    
    // Restore last selected addresses
    const lastPoliceStationKey = `cp26_last_police_station_${editRow.ESTA_CODE}`;
    const lastDeputyPoliceKey = `cp26_last_deputy_police_${editRow.ESTA_CODE}`;
    
    const lastPoliceStation = localStorage.getItem(lastPoliceStationKey);
    const lastDeputyPolice = localStorage.getItem(lastDeputyPoliceKey);
    
    if (lastPoliceStation && savedPoliceStation.includes(lastPoliceStation)) {
      setCP26PoliceStationAddress(lastPoliceStation);
      setCP26SelectedPoliceStationAddress(lastPoliceStation);
    } else if (savedPoliceStation.length > 0) {
      setCP26PoliceStationAddress(savedPoliceStation[0]);
      setCP26SelectedPoliceStationAddress(savedPoliceStation[0]);
    }
    
    if (lastDeputyPolice && savedDeputyPolice.includes(lastDeputyPolice)) {
      setCP26DeputyPoliceCommissionerAddress(lastDeputyPolice);
      setCP26SelectedDeputyPoliceCommissionerAddress(lastDeputyPolice);
    } else if (savedDeputyPolice.length > 0) {
      setCP26DeputyPoliceCommissionerAddress(savedDeputyPolice[0]);
      setCP26SelectedDeputyPoliceCommissionerAddress(savedDeputyPolice[0]);
    }
  };

  // Save CP-26 address to localStorage
  const saveCP26Address = (addressType, address) => {
    if (!editRow || !editRow.ESTA_CODE || !address || !address.trim()) return;
    
    const key = addressType === 'policeStation' 
      ? `cp26_police_station_${editRow.ESTA_CODE}`
      : `cp26_deputy_police_${editRow.ESTA_CODE}`;
    
    const savedAddresses = JSON.parse(localStorage.getItem(key) || '[]');
    const trimmedAddress = address.trim();
    
    if (!savedAddresses.includes(trimmedAddress)) {
      savedAddresses.unshift(trimmedAddress); // Add to beginning
      // Keep only last 10 addresses
      if (savedAddresses.length > 10) {
        savedAddresses.pop();
      }
      localStorage.setItem(key, JSON.stringify(savedAddresses));
      
      if (addressType === 'policeStation') {
        setCP26SavedPoliceStationAddresses(savedAddresses);
        setCP26SelectedPoliceStationAddress(trimmedAddress);
        const lastKey = `cp26_last_police_station_${editRow.ESTA_CODE}`;
        localStorage.setItem(lastKey, trimmedAddress);
      } else {
        setCP26SavedDeputyPoliceCommissionerAddresses(savedAddresses);
        setCP26SelectedDeputyPoliceCommissionerAddress(trimmedAddress);
        const lastKey = `cp26_last_deputy_police_${editRow.ESTA_CODE}`;
        localStorage.setItem(lastKey, trimmedAddress);
      }
    }
  };

  // Handle CP-26 button click
  const handleCP26Click = () => {
    if (!editRow) return;
    const todayDate = getTodayDate();
    setCP26NoticeDate(todayDate);
    setCP26Error('');
    setCP26PoliceStationAddress('');
    setCP26PoliceStationDistrict('');
    setCP26PoliceStationPinCode('');
    setCP26EnforcementOfficer('');
    setCP26ScheduledDate('');
    setCP26ShowCauseRef('');
    setCP26PreviousHearingDates('');
    setCP26DeputyPoliceCommissionerAddress('');
    setCP26SelectedPoliceStationAddress('');
    setCP26SelectedDeputyPoliceCommissionerAddress('');
    setCP26Remark(''); // Reset remark
    setShowCP26Popup(true);
    loadSavedCP26Addresses();
  };

  // Format ESTA address from RRC/Establishment data (frontend version)
  const formatEstaAddressForLetter = (rrcData, establishmentData) => {
    const add1 = (establishmentData?.ADD1 || rrcData?.ADD1 || '').trim();
    const add2 = (establishmentData?.ADD2 || rrcData?.ADD2 || '').trim();
    const city = (establishmentData?.CITY || rrcData?.CITY || '').trim();
    const dist = (establishmentData?.DIST || rrcData?.DIST || '').trim();
    const pinCd = (establishmentData?.PIN_CODE || rrcData?.PIN_CD || '').trim();

    const addressParts = [];
    if (add1) addressParts.push(add1);
    if (add2 && add2 !== add1) addressParts.push(add2);
    if (city) addressParts.push(city);
    
    const locationPart = [];
    if (dist) locationPart.push(dist);
    if (pinCd) {
      if (locationPart.length > 0) {
        addressParts.push(`${locationPart.join(' & ')} - ${pinCd}`);
      } else {
        addressParts.push(pinCd);
      }
    } else if (locationPart.length > 0) {
      addressParts.push(locationPart.join(' & '));
    }

    return addressParts.join('\n');
  };

  // Load saved employer names for ESTA LETTER
  const loadEstaLetterSavedEmployerNames = async () => {
    if (!editRow || !username) return;
    
    try {
      const response = await api.get(`/employer-address/${editRow.ESTA_CODE}/names`, {
        params: { username }
      });
      
      if (response.data.success) {
        const names = response.data.data || [];
        setEstaLetterSavedEmployerNames(names);
      }
    } catch (err) {
      logger.error('Error loading saved employer names:', err);
      setEstaLetterSavedEmployerNames([]);
    }
  };

  // Handle ESTA LETTER button click
  const handleEstaLetterClick = () => {
    if (!editRow) return;
    const todayDate = getTodayDate();
    setEstaLetterDate(todayDate);
    setEstaLetterError('');
    setEstaLetterEmployerName('');
    setEstaLetterSubject('');
    setEstaLetterBody('');
    setEstaLetterPrompt('');
    setEstaLetterGenerating(false);
    setEstaLetterRemark(''); // Reset remark
    
    // Get establishment data
    const establishment = establishmentMap[editRow.ESTA_CODE];
    
    // Format address
    const formattedAddress = formatEstaAddressForLetter(editRow, establishment);
    setEstaLetterAddress(formattedAddress);
    
    setShowEstaLetterPopup(true);
    loadEstaLetterSavedEmployerNames();
  };

  // Handle Summon button click
  const handleSummonClick = () => {
    if (!editRow) return;
    setShowSummonPopup(true);
  };

  // Handle CP-3 Bank button click
  const handleCP3BankClick = () => {
    if (!editRow) return;
    setShowCP3BankPopup(true);
  };

  // Handle Income Tax Letter button click
  const handleIncomeTaxLetterClick = () => {
    if (!editRow) return;
    setShowIncomeTaxLetterPopup(true);
  };

  // Handle generating letter body from prompt
  const handleGenerateLetterBody = async () => {
    if (!estaLetterPrompt.trim()) {
      setEstaLetterError('Please enter a prompt');
      return;
    }

    if (!editRow || !username) {
      setEstaLetterError('Invalid request');
      return;
    }

    try {
      setEstaLetterGenerating(true);
      setEstaLetterError('');

      const response = await api.post('/notices/esta-letter/generate-body', {
        prompt: estaLetterPrompt.trim(),
        employerName: estaLetterEmployerName,
        estaName: editRow?.ESTA_NAME || '',
        subject: estaLetterSubject,
        estaCode: editRow?.ESTA_CODE || '',
        regionalOffice: officeData?.regional_office_name || '',
      });

      if (response.data.success) {
        setEstaLetterBody(response.data.data.letterBody);
        if (onSuccess) {
          onSuccess('Letter body generated successfully!');
        }
      }
    } catch (err) {
      logger.error('Letter body generation failed', err);
      const errorMessage = err.response?.data?.message || 'Failed to generate letter body. Please try again or write manually.';
      setEstaLetterError(errorMessage);
    } finally {
      setEstaLetterGenerating(false);
    }
  };

  // Handle ESTA LETTER generation
  const handleGenerateEstaLetter = async () => {
    if (!editRow || !username) {
      setEstaLetterError('Invalid request');
      return;
    }

    if (!estaLetterDate) {
      setEstaLetterError('Please enter date');
      return;
    }

    if (!estaLetterEmployerName || !estaLetterEmployerName.trim()) {
      setEstaLetterError('Please enter employer name');
      return;
    }

    if (!estaLetterSubject || !estaLetterSubject.trim()) {
      setEstaLetterError('Please enter subject');
      return;
    }

    if (!estaLetterBody || !estaLetterBody.trim()) {
      setEstaLetterError('Please enter letter body');
      return;
    }

    if (!estaLetterAddress || !estaLetterAddress.trim()) {
      setEstaLetterError('Please enter ESTA address');
      return;
    }

    // Ask if user wants to add a remark
    let finalRemark = '';
    const addRemark = window.confirm('Do you want to add a remark to RRC data?');
    
    if (addRemark) {
      // If remark field already has value, use it; otherwise prompt
      if (estaLetterRemark && estaLetterRemark.trim()) {
        finalRemark = estaLetterRemark.trim();
      } else {
        const remarkInput = window.prompt('Enter remark to be added to REMARKS field:', '');
        if (remarkInput === null) {
          // User cancelled, don't proceed
          return;
        }
        finalRemark = remarkInput.trim();
      }
    }

    try {
      setEstaLetterLoading(true);
      setEstaLetterError('');

      // Get establishment data
      const establishment = establishmentMap[editRow.ESTA_CODE];
      const estaName = editRow.ESTA_NAME || establishment?.ESTA_NAME || '';
      const regionalOffice = officeData?.regional_office_name || '';

      const response = await api.post('/notices/esta-letter/generate', {
        username,
        estaCode: editRow.ESTA_CODE,
        rrcNo: editRow.RRC_NO,
        date: estaLetterDate,
        employerName: estaLetterEmployerName.trim(),
        estaName: estaName,
        estaAddress: estaLetterAddress.trim(),
        subject: estaLetterSubject.trim(),
        letterBody: estaLetterBody.trim(),
        regionalOffice: regionalOffice,
        remark: finalRemark,
      }, {
        responseType: 'blob',
      });

      // Download the generated document
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'ESTA_LETTER.docx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Close popup and show success
      setShowEstaLetterPopup(false);
      setEstaLetterDate('');
      setEstaLetterEmployerName('');
      setEstaLetterSubject('');
      setEstaLetterBody('');
      setEstaLetterAddress('');
      setEstaLetterRemark(''); // Reset remark
      // Refresh RRC data to show updated remarks
      if (onRefresh) {
        onRefresh();
      }
      if (onSuccess) {
        onSuccess('ESTA Letter generated and downloaded successfully!');
      } else {
        alert('ESTA Letter generated and downloaded successfully!');
      }
    } catch (err) {
      logger.error('ESTA Letter generation failed', err);
      
      let errorMessage = 'Failed to generate ESTA Letter';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setEstaLetterError(errorMessage);
    } finally {
      setEstaLetterLoading(false);
    }
  };

  // Handle CP-25 button click
  const handleCP25Click = () => {
    if (!editRow) return;
    const todayDate = getTodayDate();
    setCP25NoticeDate(todayDate);
    setCP25Error('');
    setCP25EmployerName(''); // Leave blank - it's person's name, not establishment name
    setCP25SelectedEmployerNames([]); // Reset selected employer names for new establishment
    setCP25EditingNameId(null); // Reset editing states
    setCP25EditingNameValue('');
    setCP25EditingAddressId(null);
    setCP25EditingAddressValue('');
    setCP25EditingAddressPinCode('');
    setCP25AddressMode('existing');
    setCP25UseExistingAddress(true);
    setCP25NewAddress('');
    setCP25NewPinCode('');
    setCP25SelectedSavedAddress('');
    setCP25Remark(''); // Reset remark
    // Set Enforcement Officer from existing RRC PIN CODE
    if (editRow.PIN_CD) {
      fetchEnforcementOfficerByPinCode(editRow.PIN_CD);
    } else {
      setCP25EnforcementOfficer('');
    }
    // Calculate hearing date (22 days later, skipping weekends) and set default time to 3:00 PM
    setCP25HearingDate(calculateHearingDate(todayDate));
    setCP25HearingTime('15:00'); // 3:00 PM in 24-hour format
    // Set CP-1 DATE from RRC data (format for date input)
    if (editRow && editRow.CP_1_DATE) {
      const cp1DateValue = formatDateForInput(editRow.CP_1_DATE);
      setCP25CP1Date(cp1DateValue || '');
    } else {
      setCP25CP1Date('');
    }
    setShowCP25Popup(true);
    loadSavedEmployerAddresses().then((addresses) => {
      // Restore last selected address for this ESTA_CODE after addresses are loaded
      if (editRow && editRow.ESTA_CODE) {
        const lastAddressKey = `cp25_last_address_${editRow.ESTA_CODE}`;
        const lastAddress = localStorage.getItem(lastAddressKey);
        if (lastAddress === 'existing') {
          setCP25AddressMode('existing');
        } else if (lastAddress && lastAddress.startsWith('saved_')) {
          const savedId = lastAddress.replace('saved_', '');
          // Check if the saved address still exists in the loaded addresses
          const savedExists = addresses && addresses.some(addr => addr._id === savedId);
          if (savedExists) {
            setCP25AddressMode('saved');
            setCP25SelectedSavedAddress(savedId);
          }
        } else if (lastAddress === 'new') {
          setCP25AddressMode('new');
        }
      }
    });
    loadSavedEmployerNames();
  };


  // Get existing address WITHOUT DISTRICT and PIN CODE (these are displayed separately)
  const getExistingAddress = () => {
    if (!editRow) return '';
    const add1 = editRow.ADD1 || '';
    const add2 = editRow.ADD2 || '';
    const city = editRow.CITY || '';
    
    const addressParts = [];
    if (add1) addressParts.push(add1);
    if (add2 && add2 !== add1) addressParts.push(add2);
    if (city) addressParts.push(city);
    
    return addressParts.join('\n');
  };

  // Get existing PIN CODE separately
  const getExistingPinCode = () => {
    if (!editRow) return '';
    return editRow.PIN_CD || '';
  };

  // Get existing District separately
  const getExistingDistrict = () => {
    if (!editRow) return '';
    return editRow.DIST || '';
  };

  // Handle editing existing address
  const handleEditExistingAddress = () => {
    setCP25EditingExistingAddress(true);
    setCP25EditingExistingAddressValue(getExistingAddress());
    setCP25EditingExistingDistrict(getExistingDistrict());
    setCP25EditingExistingPinCode(getExistingPinCode());
  };

  // Handle saving edited existing address
  const handleSaveEditedExistingAddress = async () => {
    if (!editRow || !username || !cp25EditingExistingAddressValue.trim()) {
      setCP25Error('Please enter address to save');
      return;
    }

    try {
      setCP25Loading(true);
      // Update RRC record with new address fields
      const addressLines = cp25EditingExistingAddressValue.split('\n').map(line => line.trim()).filter(line => line);
      const add1 = addressLines[0] || '';
      const add2 = addressLines[1] || '';
      const city = addressLines[2] || '';

      const updateData = {
        ADD1: add1,
        ADD2: add2,
        CITY: city,
        DIST: cp25EditingExistingDistrict.trim(),
        PIN_CD: cp25EditingExistingPinCode.trim(), // Use edited PIN CODE
      };

      const response = await api.put(`/rrc/${editRow._id}`, {
        username,
        ...updateData
      });

      if (response.data.success) {
        // Reload RRC data - trigger parent refresh
        if (onSuccess) {
          onSuccess('Existing address updated successfully! Please refresh the page to see changes.');
        }
        setCP25EditingExistingAddress(false);
        setCP25EditingExistingAddressValue('');
        setCP25EditingExistingDistrict('');
        setCP25EditingExistingPinCode('');
      }
    } catch (err) {
      logger.error('Error updating existing address:', err);
      setCP25Error(err.response?.data?.message || 'Failed to update existing address');
    } finally {
      setCP25Loading(false);
    }
  };

  // Calculate hearing date: 22 days after notice date, skipping weekends
  const calculateHearingDate = (noticeDate) => {
    if (!noticeDate) return '';
    
    try {
      const date = new Date(noticeDate);
      if (isNaN(date.getTime())) return '';
      
      // Add 22 days
      date.setDate(date.getDate() + 22);
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (err) {
      logger.error('Error calculating hearing date:', err);
      return '';
    }
  };

  // Auto-generate CP-1 remark: Date - text CP-1 issued
  useEffect(() => {
    if (cp1NoticeDate && showCP1Popup) {
      const formattedDate = formatDateForRemark(cp1NoticeDate);
      const defaultRemark = `${formattedDate} - CP-1 issued`;
      setCP1Remark(defaultRemark);
    }
  }, [cp1NoticeDate, showCP1Popup]);

  // Auto-generate CP-25 remark: Date - text CP-25 issued to Employer Name
  useEffect(() => {
    if (cp25NoticeDate && showCP25Popup) {
      // Collect all employer names
      const allEmployerNames = [];
      if (cp25EmployerName && cp25EmployerName.trim()) {
        allEmployerNames.push(cp25EmployerName.trim());
      }
      if (cp25SelectedEmployerNames && cp25SelectedEmployerNames.length > 0) {
        cp25SelectedEmployerNames.forEach(name => {
          if (name && name.trim() && !allEmployerNames.includes(name.trim())) {
            allEmployerNames.push(name.trim());
          }
        });
      }
      
      const formattedDate = formatDateForRemark(cp25NoticeDate);
      if (allEmployerNames.length > 0) {
        const employerNamesStr = allEmployerNames.join(', ');
        const defaultRemark = `${formattedDate} - CP-25 issued to ${employerNamesStr}`;
        setCP25Remark(defaultRemark);
      } else {
        const defaultRemark = `${formattedDate} - CP-25 issued to`;
        setCP25Remark(defaultRemark);
      }
    }
  }, [cp25NoticeDate, cp25EmployerName, cp25SelectedEmployerNames, showCP25Popup]);

  // Auto-generate CP-26 remark: Date - text CP-26 issued to Police station
  useEffect(() => {
    if (cp26NoticeDate && cp26PoliceStationAddress && showCP26Popup) {
      const formattedDate = formatDateForRemark(cp26NoticeDate);
      // Extract police station name from address (first line)
      let policeStationName = '';
      if (cp26PoliceStationAddress) {
        const addressLines = cp26PoliceStationAddress.split('\n').filter(line => line.trim());
        if (addressLines.length > 0) {
          policeStationName = addressLines[0].trim();
        } else {
          policeStationName = cp26PoliceStationAddress.trim();
        }
      }
      const defaultRemark = policeStationName
        ? `${formattedDate} - CP-26 issued to ${policeStationName}`
        : `${formattedDate} - CP-26 issued to`;
      setCP26Remark(defaultRemark);
    }
  }, [cp26NoticeDate, cp26PoliceStationAddress, showCP26Popup]);

  // Auto-generate ESTA Letter remark: Date - Reg Subject
  useEffect(() => {
    if (estaLetterDate && estaLetterSubject && showEstaLetterPopup) {
      const formattedDate = formatDateForRemark(estaLetterDate);
      const defaultRemark = `${formattedDate} - Reg ${estaLetterSubject}`;
      setEstaLetterRemark(defaultRemark);
    }
  }, [estaLetterDate, estaLetterSubject, showEstaLetterPopup]);

  // Handle CP-1 notice generation
  const handleGenerateCP1 = async () => {
    if (!editRow || !username || !cp1NoticeDate) {
      setCP1Error('Please enter notice date');
      return;
    }

    // Ask if user wants to add a remark
    let finalRemark = '';
    const addRemark = window.confirm('Do you want to add a remark to RRC data?');
    
    if (addRemark) {
      // If remark field already has value, use it; otherwise prompt
      if (cp1Remark && cp1Remark.trim()) {
        finalRemark = cp1Remark.trim();
      } else {
        const remarkInput = window.prompt('Enter remark to be added to REMARKS field:', '');
        if (remarkInput === null) {
          // User cancelled, don't proceed
          return;
        }
        finalRemark = remarkInput.trim();
      }
    }

    try {
      setCP1Loading(true);
      setCP1Error('');

      const response = await api.post(
        '/notices/cp1/generate',
        {
          username,
          estaCode: editRow.ESTA_CODE,
          rrcNo: editRow.RRC_NO,
          noticeDate: cp1NoticeDate,
          remark: finalRemark,
        },
        {
          responseType: 'blob', // Important for file download
        }
      );

      // Create blob and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'CP-1_Notice.docx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Close popup and show success
      setShowCP1Popup(false);
      setCP1NoticeDate('');
      setCP1Remark(''); // Reset remark
      // Refresh RRC data to show updated remarks
      if (onRefresh) {
        onRefresh();
      }
      if (onSuccess) {
        onSuccess('CP-1 notice generated and downloaded successfully!');
      } else {
        // Fallback to alert if onSuccess callback not provided
        alert('CP-1 notice generated and downloaded successfully!');
      }
    } catch (err) {
      logger.error('CP-1 generation failed', err);
      
      // Extract detailed error message
      let errorMessage = 'Failed to generate CP-1 notice';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // If error is very long, truncate it but show important parts
      if (errorMessage.length > 500) {
        const lines = errorMessage.split('\n');
        const importantLines = lines.filter(line => 
          line.includes('Template') || 
          line.includes('tag') || 
          line.includes('error') ||
          line.includes('split') ||
          line.includes('duplicate')
        );
        if (importantLines.length > 0) {
          errorMessage = importantLines.join('\n').substring(0, 1000);
        } else {
          errorMessage = errorMessage.substring(0, 500) + '... (see console for full error)';
        }
      }
      
      setCP1Error(errorMessage);
    } finally {
      setCP1Loading(false);
    }
  };

  // Handle CP-25 notice generation
  const handleGenerateCP25 = async (isAEO = false) => {
    if (!editRow || !username || !cp25NoticeDate) {
      setCP25Error('Please enter notice date');
      return;
    }

    // Collect all employer names: from input field + selected saved names
    const allEmployerNames = [];
    
    // Add name from input field if provided
    if (cp25EmployerName && cp25EmployerName.trim()) {
      allEmployerNames.push(cp25EmployerName.trim());
    }
    
    // Add selected saved names
    if (cp25SelectedEmployerNames && cp25SelectedEmployerNames.length > 0) {
      cp25SelectedEmployerNames.forEach(name => {
        if (name && name.trim() && !allEmployerNames.includes(name.trim())) {
          allEmployerNames.push(name.trim());
        }
      });
    }

    if (allEmployerNames.length === 0) {
      setCP25Error('Please enter or select at least one employer name');
      return;
    }

    if (!cp25HearingDate) {
      setCP25Error('Please enter hearing date');
      return;
    }

    if (!cp25HearingTime) {
      setCP25Error('Please enter hearing time');
      return;
    }

    // Validate CP-1 DATE is mandatory
    if (!cp25CP1Date || !cp25CP1Date.trim()) {
      setCP25Error('CP-1 DATE is mandatory. Please enter CP-1 DATE before generating CP-25 notice.');
      return;
    }

    // Determine selected address based on mode
    // Format: "ADDRESS\nDISTRICT & STATE - PIN CODE"
    let selectedAddress = '';
    let selectedPinCode = '';
    let selectedDistrict = '';
    
    if (cp25AddressMode === 'existing') {
      selectedAddress = getExistingAddress();
      selectedPinCode = getExistingPinCode();
      selectedDistrict = getExistingDistrict();
      
      // Format as "ADDRESS\nDISTRICT & STATE - PIN CODE" (for existing, use DISTRICT only)
      if (selectedAddress && selectedDistrict && selectedPinCode) {
        selectedAddress = `${selectedAddress}\n${selectedDistrict} - ${selectedPinCode}`;
      } else if (selectedAddress && selectedPinCode) {
        selectedAddress = `${selectedAddress}\n${selectedPinCode}`;
      } else if (selectedAddress && selectedDistrict) {
        selectedAddress = `${selectedAddress}\n${selectedDistrict}`;
      }
    } else if (cp25AddressMode === 'saved') {
      const saved = cp25SavedAddresses.find(addr => addr._id === cp25SelectedSavedAddress);
      if (saved) {
        selectedAddress = saved.address;
        selectedPinCode = saved.pinCode || '';
        // Format saved address: if it has PIN CODE, format as "ADDRESS\nDISTRICT - PIN CODE"
        // Extract district from address if available
        if (selectedPinCode && selectedAddress) {
          // Check if address already has PIN CODE at the end
          if (!selectedAddress.includes(selectedPinCode)) {
            selectedAddress = `${selectedAddress}\n${selectedPinCode}`;
          }
        }
      }
    } else if (cp25AddressMode === 'new') {
      selectedAddress = cp25NewAddress.trim();
      selectedPinCode = cp25NewPinCode.trim();
      if (!selectedPinCode) {
        setCP25Error('Please enter PIN CODE for new address');
        return;
      }
      // Format new address: "ADDRESS\nPIN CODE" (district not available for new address)
      if (selectedAddress && selectedPinCode) {
        selectedAddress = `${selectedAddress}\n${selectedPinCode}`;
      }
    }

    if (!selectedAddress || selectedAddress === '') {
      setCP25Error('Please select or enter address');
      return;
    }

    // Get Enforcement Officer based on selected PIN CODE
    // The cp25EnforcementOfficer state is already updated by useEffect based on the selected address mode:
    // - For new address: updated when cp25NewPinCode changes
    // - For existing address: updated from editRow.PIN_CD
    // - For saved address: updated by extracting PIN CODE from saved address
    const enforcementOfficerName = cp25EnforcementOfficer || '';

    // Save last selected address before generating notice
    if (editRow && editRow.ESTA_CODE) {
      const lastAddressKey = `cp25_last_address_${editRow.ESTA_CODE}`;
      let lastAddressValue = '';
      if (cp25AddressMode === 'existing') {
        lastAddressValue = 'existing';
      } else if (cp25AddressMode === 'saved' && cp25SelectedSavedAddress) {
        lastAddressValue = `saved_${cp25SelectedSavedAddress}`;
      } else if (cp25AddressMode === 'new') {
        lastAddressValue = 'new';
      }
      if (lastAddressValue) {
        localStorage.setItem(lastAddressKey, lastAddressValue);
      }
    }

    // Ask if user wants to add a remark
    let finalRemark = '';
    const addRemark = window.confirm('Do you want to add a remark to RRC data?');
    
    if (addRemark) {
      // If remark field already has value, use it; otherwise prompt
      if (cp25Remark && cp25Remark.trim()) {
        finalRemark = cp25Remark.trim();
      } else {
        const remarkInput = window.prompt('Enter remark to be added to REMARKS field:', '');
        if (remarkInput === null) {
          // User cancelled, don't proceed
          return;
        }
        finalRemark = remarkInput.trim();
      }
    }

    try {
      setCP25Loading(true);
      setCP25Error('');

      const response = await api.post(
        '/notices/cp25/generate',
        {
          username,
          estaCode: editRow.ESTA_CODE,
          rrcNo: editRow.RRC_NO,
          noticeDate: cp25NoticeDate,
          employerNames: allEmployerNames, // Pass array of all selected employer names
          address: selectedAddress,
          hearingDate: cp25HearingDate,
          hearingTime: cp25HearingTime,
          regionalOfficeName: officeData?.regional_office_name || '',
          enforcementOfficer: enforcementOfficerName, // Pass Enforcement Officer based on PIN CODE of selected address
          isAEO: isAEO, // Pass isAEO flag to determine which template to use
          cp1Date: cp25CP1Date, // Pass CP-1 DATE from popup (may be updated by user)
          remark: finalRemark,
        },
        {
          responseType: 'blob', // Important for file download
        }
      );

      // Create blob and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'CP-25_Notice.docx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Auto-save CP-1 DATE to RRC table after successful generation
      if (editRow && editRow._id && cp25CP1Date) {
        try {
          await api.put(`/rrc/${editRow._id}`, {
            username,
            CP_1_DATE: cp25CP1Date,
          });
          // Update editRow to reflect the saved CP-1 DATE
          if (editRow) {
            editRow.CP_1_DATE = cp25CP1Date;
          }
        } catch (err) {
          logger.error('Error saving CP-1 DATE to RRC:', err);
          // Don't block success message, just log the error
        }
      }

      // Close popup and show success
      setShowCP25Popup(false);
      setCP25EmployerName('');
      setCP25UseExistingAddress(true);
      setCP25NewAddress('');
      setCP25Remark(''); // Reset remark
      // Refresh RRC data to show updated remarks
      if (onRefresh) {
        onRefresh();
      }
      if (onSuccess) {
        onSuccess('CP-25 notice generated and downloaded successfully!');
      } else {
        // Fallback to alert if onSuccess callback not provided
        alert('CP-25 notice generated and downloaded successfully!');
      }
    } catch (err) {
      logger.error('CP-25 generation failed', err);
      
      // Extract detailed error message
      let errorMessage = 'Failed to generate CP-25 notice';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // If error is very long, truncate it but show important parts
      if (errorMessage.length > 500) {
        const lines = errorMessage.split('\n');
        const importantLines = lines.filter(line => 
          line.includes('Template') || 
          line.includes('tag') || 
          line.includes('error') ||
          line.includes('split') ||
          line.includes('duplicate')
        );
        if (importantLines.length > 0) {
          errorMessage = importantLines.join('\n').substring(0, 1000);
        } else {
          errorMessage = errorMessage.substring(0, 500) + '... (see console for full error)';
        }
      }
      
      setCP25Error(errorMessage);
    } finally {
      setCP25Loading(false);
    }
  };

  // Check if field is a date field
  const isDateField = (key) => {
    const upper = String(key || '').toUpperCase();
    return upper === 'RRC_DATE' || upper === 'RRC DATE' || 
           upper === 'CP_1_DATE' || upper === 'CP-1_DATE' || upper === 'CP-1 DATE' || upper === 'CP1 DATE';
  };

  // Check if field is financial
  const isFinancialField = (key) => {
    const upper = String(key || '').toUpperCase();
    return ['DEMAND', 'RECOVERY', 'OUTSTAND', 'COST', 'AMOUNT', 'TOTAL', 'RRC']
      .some(term => upper.includes(term));
  };

  // Check if field is computed (read-only)
  const isComputedField = (key) => {
    const upper = String(key || '').toUpperCase();
    const computedFields = [
      'DEMAND_TOTAL', 'RECOVERY_TOTAL', 'OUTSTAND_7A', 'OUTSTAND_14B', 'OUTSTAND_7Q',
      'OUTSTAND_TOTAL', 'OUTSTAND_REC_COST', 'OUTSTAND_TOT_WITH_REC',
      'DEMAND_TOTAL_RRC', 'RECOVERY_TOTAL_RRC', 'OUTSTAND_TOTAL_RRC',
      'OUTSTAND_TOT_WITH_REC_RRC',
      'OUTSTAND_7A_ACCOUNT_1_EE', 'OUTSTAND_7A_ACCOUNT_1_ER', 'OUTSTAND_7A_ACCOUNT_2',
      'OUTSTAND_7A_ACCOUNT_10', 'OUTSTAND_7A_ACCOUNT_21', 'OUTSTAND_7A_ACCOUNT_22',
      'OUTSTAND_14B_ACCOUNT_1', 'OUTSTAND_14B_ACCOUNT_2', 'OUTSTAND_14B_ACCOUNT_10',
      'OUTSTAND_14B_ACCOUNT_21', 'OUTSTAND_14B_ACCOUNT_22',
      'OUTSTAND_7Q_ACCOUNT_1', 'OUTSTAND_7Q_ACCOUNT_2', 'OUTSTAND_7Q_ACCOUNT_10',
      'OUTSTAND_7Q_ACCOUNT_21', 'OUTSTAND_7Q_ACCOUNT_22',
      'DEMAND_7A', 'DEMAND_14B', 'DEMAND_7Q',
      'RECOVERY_7A', 'RECOVERY_14B', 'RECOVERY_7Q',
    ];
    return computedFields.some(field => upper === field || upper === field.replace(/_/g, ' '));
  };

  // Check if field is editable financial field
  // Note: Recovery account fields are NOT editable - they are calculated from recovery transactions
  const isEditableFinancialField = (key) => {
    const upper = String(key || '').toUpperCase();
    const editableFields = [
      // Demand fields (input data from Excel)
      'DEMAND_7A_ACCOUNT_1_EE', 'DEMAND_7A_ACCOUNT_1_ER', 'DEMAND_7A_ACCOUNT_2',
      'DEMAND_7A_ACCOUNT_10', 'DEMAND_7A_ACCOUNT_21', 'DEMAND_7A_ACCOUNT_22',
      'DEMAND_14B_ACCOUNT_1', 'DEMAND_14B_ACCOUNT_2', 'DEMAND_14B_ACCOUNT_10',
      'DEMAND_14B_ACCOUNT_21', 'DEMAND_14B_ACCOUNT_22',
      'DEMAND_7Q_ACCOUNT_1', 'DEMAND_7Q_ACCOUNT_2', 'DEMAND_7Q_ACCOUNT_10',
      'DEMAND_7Q_ACCOUNT_21', 'DEMAND_7Q_ACCOUNT_22',
      // ESTA-level fields (input fields)
      'RECOVERY_COST', 'RECEVIED_REC_COST'
      // Recovery account fields are NOT in this list - they are read-only
    ];
    return editableFields.some(field => upper === field || upper === field.replace(/_/g, ' '));
  };

  // Check if field is MongoDB internal field
  const isMongoField = (key) => {
    return ['_id', '__v', 'createdAt', 'updatedAt'].includes(key);
  };

  // Helper function to determine which sections to show based on U/S
  const getSectionsToShow = (usValue) => {
    if (!usValue) return { show7A: true, show14B: true, show7Q: true };
    
    const usUpper = String(usValue).toUpperCase();
    
    if (usUpper.includes('7A') && usUpper.includes('14B') && usUpper.includes('7Q')) {
      return { show7A: true, show14B: true, show7Q: true };
    } else if (usUpper.includes('14B') && usUpper.includes('7Q')) {
      return { show7A: false, show14B: true, show7Q: true };
    } else if (usUpper.includes('7A') && usUpper.includes('14B')) {
      return { show7A: true, show14B: true, show7Q: false };
    } else if (usUpper.includes('7A') && usUpper.includes('7Q')) {
      return { show7A: true, show14B: false, show7Q: true };
    } else if (usUpper.includes('7A')) {
      return { show7A: true, show14B: false, show7Q: false };
    } else if (usUpper.includes('14B')) {
      return { show7A: false, show14B: true, show7Q: false };
    } else if (usUpper.includes('7Q')) {
      return { show7A: false, show14B: false, show7Q: true };
    }
    
    return { show7A: true, show14B: true, show7Q: true };
  };

  // Check if a financial field should be shown based on U/S
  const shouldShowField = (fieldKey, sectionsToShow) => {
    const upper = String(fieldKey || '').toUpperCase();
    
    // Always show totals and ESTA-level fields (these are not section-specific)
    if (upper.includes('TOTAL') || upper.includes('RRC') || 
        upper === 'RECOVERY_COST' || upper === 'RECEVIED_REC_COST' || 
        upper === 'OUTSTAND_REC_COST' || upper === 'OUTSTAND_TOT_WITH_REC') {
      return true;
    }
    
    // Check section-specific fields (7A, 14B, 7Q)
    // Match patterns like: DEMAND_7A, RECOVERY_7A_ACCOUNT_1_EE, OUTSTAND_14B_ACCOUNT_1, etc.
    // Use word boundaries to avoid false matches (e.g., 7A in 7A_ACCOUNT should match, but not 7A in 14B)
    const has7A = /[_\s]7A[_\s]|^7A[_\s]|[_\s]7A$|^7A$/.test(upper);
    const has14B = /[_\s]14B[_\s]|^14B[_\s]|[_\s]14B$|^14B$/.test(upper);
    const has7Q = /[_\s]7Q[_\s]|^7Q[_\s]|[_\s]7Q$|^7Q$/.test(upper);
    
    // If field contains only 7A (not 14B or 7Q)
    if (has7A && !has14B && !has7Q) {
      return sectionsToShow.show7A;
    }
    
    // If field contains only 14B (not 7A or 7Q)
    if (has14B && !has7A && !has7Q) {
      return sectionsToShow.show14B;
    }
    
    // If field contains only 7Q (not 7A or 14B)
    if (has7Q && !has7A && !has14B) {
      return sectionsToShow.show7Q;
    }
    
    // If field contains multiple sections, show if any of them should be shown
    if (has7A && sectionsToShow.show7A) return true;
    if (has14B && sectionsToShow.show14B) return true;
    if (has7Q && sectionsToShow.show7Q) return true;
    
    // Default: show all if pattern doesn't match (for safety)
    return true;
  };

  // Get all 148 fields explicitly (excluding username and regional_office_code)
  const getAllRRCFields = () => {
    // All non-financial fields (excluding username and regional_office_code)
    const allNonFinancialFields = [
      // Basic identification fields
      { key: 'ESTA_CODE', label: 'ESTA CODE', type: 'text', editable: true },
      { key: 'IR_NIR', label: 'IR NIR', type: 'text', editable: true },
      { key: 'ESTA_NAME', label: 'ESTA NAME', type: 'text', editable: true },
      { key: 'RRC_NO', label: 'RRC NO', type: 'text', editable: true },
      { key: 'RRC_DATE', label: 'RRC DATE', type: 'date', editable: true },
      { key: 'RRC_PERIOD', label: 'PERIOD', type: 'text', editable: true },
      { key: 'U_S', label: 'U/S', type: 'text', editable: true },
      { key: 'RACK_LOCATION', label: 'RACK LOCATION', type: 'text', editable: true },
      
      // Address & Contact Fields (ESTA-level)
      { key: 'RO', label: 'RO', type: 'text', editable: true },
      { key: 'ADD1', label: 'ADD1', type: 'text', editable: true },
      { key: 'ADD2', label: 'ADD2', type: 'text', editable: true },
      { key: 'CITY', label: 'CITY', type: 'text', editable: true },
      { key: 'DIST', label: 'DIST', type: 'text', editable: true },
      { key: 'PIN_CD', label: 'PIN CD', type: 'text', editable: true },
      { key: 'CIRCLE', label: 'CIRCLE', type: 'text', editable: true },
      { key: 'MOBILE_NO', label: 'MOBILE NO', type: 'text', editable: true },
      { key: 'EMAIL', label: 'EMAIL', type: 'text', editable: true },
      { key: 'STATUS', label: 'STATUS', type: 'text', editable: true },
      { key: 'ESTA_PAN', label: 'ESTA PAN', type: 'text', editable: true },
      
      // Date Fields (ESTA-level)
      { key: 'CP_1_DATE', label: 'CP-1 DATE', type: 'date', editable: true },
      
      // Other Fields (ESTA-level)
      { key: 'REMARKS', label: 'REMARKS', type: 'text', editable: true },
      { key: 'ENFORCEMENT_OFFICER', label: 'ENFORCEMENT OFFICER', type: 'text', editable: true },
    ];
    
    // All financial fields
    const allFinancialFields = [
      // Section-level Demand (computed)
      { key: 'DEMAND_7A', label: 'DEMAND 7A', type: 'number', editable: false },
      { key: 'DEMAND_14B', label: 'DEMAND 14B', type: 'number', editable: false },
      { key: 'DEMAND_7Q', label: 'DEMAND 7Q', type: 'number', editable: false },
      { key: 'DEMAND_TOTAL', label: 'DEMAND TOTAL', type: 'number', editable: false },
      
      // Account-wise Demand 7A
      { key: 'DEMAND_7A_ACCOUNT_1_EE', label: 'DEMAND 7A A/C 1_EE', type: 'number', editable: true },
      { key: 'DEMAND_7A_ACCOUNT_1_ER', label: 'DEMAND 7A A/C 1_ER', type: 'number', editable: true },
      { key: 'DEMAND_7A_ACCOUNT_2', label: 'DEMAND 7A A/C 2', type: 'number', editable: true },
      { key: 'DEMAND_7A_ACCOUNT_10', label: 'DEMAND 7A A/C 10', type: 'number', editable: true },
      { key: 'DEMAND_7A_ACCOUNT_21', label: 'DEMAND 7A A/C 21', type: 'number', editable: true },
      { key: 'DEMAND_7A_ACCOUNT_22', label: 'DEMAND 7A A/C 22', type: 'number', editable: true },
      
      // Account-wise Demand 14B
      { key: 'DEMAND_14B_ACCOUNT_1', label: 'DEMAND 14B A/C 1', type: 'number', editable: true },
      { key: 'DEMAND_14B_ACCOUNT_2', label: 'DEMAND 14B A/C 2', type: 'number', editable: true },
      { key: 'DEMAND_14B_ACCOUNT_10', label: 'DEMAND 14B A/C 10', type: 'number', editable: true },
      { key: 'DEMAND_14B_ACCOUNT_21', label: 'DEMAND 14B A/C 21', type: 'number', editable: true },
      { key: 'DEMAND_14B_ACCOUNT_22', label: 'DEMAND 14B A/C 22', type: 'number', editable: true },
      
      // Account-wise Demand 7Q
      { key: 'DEMAND_7Q_ACCOUNT_1', label: 'DEMAND 7Q A/C 1', type: 'number', editable: true },
      { key: 'DEMAND_7Q_ACCOUNT_2', label: 'DEMAND 7Q A/C 2', type: 'number', editable: true },
      { key: 'DEMAND_7Q_ACCOUNT_10', label: 'DEMAND 7Q A/C 10', type: 'number', editable: true },
      { key: 'DEMAND_7Q_ACCOUNT_21', label: 'DEMAND 7Q A/C 21', type: 'number', editable: true },
      { key: 'DEMAND_7Q_ACCOUNT_22', label: 'DEMAND 7Q A/C 22', type: 'number', editable: true },
      
      // Section-level Recovery (computed)
      { key: 'RECOVERY_7A', label: 'RECOVERY 7A', type: 'number', editable: false },
      { key: 'RECOVERY_14B', label: 'RECOVERY 14B', type: 'number', editable: false },
      { key: 'RECOVERY_7Q', label: 'RECOVERY 7Q', type: 'number', editable: false },
      { key: 'RECOVERY_TOTAL', label: 'RECOVERY TOTAL', type: 'number', editable: false },
      
      // Account-wise Recovery 7A (read-only - calculated from recovery transactions)
      { key: 'RECOVERY_7A_ACCOUNT_1_EE', label: 'RECOVERY 7A A/C 1_EE', type: 'number', editable: false },
      { key: 'RECOVERY_7A_ACCOUNT_1_ER', label: 'RECOVERY 7A A/C 1_ER', type: 'number', editable: false },
      { key: 'RECOVERY_7A_ACCOUNT_2', label: 'RECOVERY 7A A/C 2', type: 'number', editable: false },
      { key: 'RECOVERY_7A_ACCOUNT_10', label: 'RECOVERY 7A A/C 10', type: 'number', editable: false },
      { key: 'RECOVERY_7A_ACCOUNT_21', label: 'RECOVERY 7A A/C 21', type: 'number', editable: false },
      { key: 'RECOVERY_7A_ACCOUNT_22', label: 'RECOVERY 7A A/C 22', type: 'number', editable: false },
      
      // Account-wise Recovery 14B (read-only - calculated from recovery transactions)
      { key: 'RECOVERY_14B_ACCOUNT_1', label: 'RECOVERY 14B A/C 1', type: 'number', editable: false },
      { key: 'RECOVERY_14B_ACCOUNT_2', label: 'RECOVERY 14B A/C 2', type: 'number', editable: false },
      { key: 'RECOVERY_14B_ACCOUNT_10', label: 'RECOVERY 14B A/C 10', type: 'number', editable: false },
      { key: 'RECOVERY_14B_ACCOUNT_21', label: 'RECOVERY 14B A/C 21', type: 'number', editable: false },
      { key: 'RECOVERY_14B_ACCOUNT_22', label: 'RECOVERY 14B A/C 22', type: 'number', editable: false },
      
      // Account-wise Recovery 7Q (read-only - calculated from recovery transactions)
      { key: 'RECOVERY_7Q_ACCOUNT_1', label: 'RECOVERY 7Q A/C 1', type: 'number', editable: false },
      { key: 'RECOVERY_7Q_ACCOUNT_2', label: 'RECOVERY 7Q A/C 2', type: 'number', editable: false },
      { key: 'RECOVERY_7Q_ACCOUNT_10', label: 'RECOVERY 7Q A/C 10', type: 'number', editable: false },
      { key: 'RECOVERY_7Q_ACCOUNT_21', label: 'RECOVERY 7Q A/C 21', type: 'number', editable: false },
      { key: 'RECOVERY_7Q_ACCOUNT_22', label: 'RECOVERY 7Q A/C 22', type: 'number', editable: false },
      
      // Section-level Outstanding (computed)
      { key: 'OUTSTAND_7A', label: 'OUTSTAND 7A', type: 'number', editable: false },
      { key: 'OUTSTAND_14B', label: 'OUTSTAND 14B', type: 'number', editable: false },
      { key: 'OUTSTAND_7Q', label: 'OUTSTAND 7Q', type: 'number', editable: false },
      { key: 'OUTSTAND_TOTAL', label: 'OUTSTAND TOTAL', type: 'number', editable: false },
      
      // Account-wise Outstanding 7A (computed)
      { key: 'OUTSTAND_7A_ACCOUNT_1_EE', label: 'OUTSTAND 7A A/C 1_EE', type: 'number', editable: false },
      { key: 'OUTSTAND_7A_ACCOUNT_1_ER', label: 'OUTSTAND 7A A/C 1_ER', type: 'number', editable: false },
      { key: 'OUTSTAND_7A_ACCOUNT_2', label: 'OUTSTAND 7A A/C 2', type: 'number', editable: false },
      { key: 'OUTSTAND_7A_ACCOUNT_10', label: 'OUTSTAND 7A A/C 10', type: 'number', editable: false },
      { key: 'OUTSTAND_7A_ACCOUNT_21', label: 'OUTSTAND 7A A/C 21', type: 'number', editable: false },
      { key: 'OUTSTAND_7A_ACCOUNT_22', label: 'OUTSTAND 7A A/C 22', type: 'number', editable: false },
      
      // Account-wise Outstanding 14B (computed)
      { key: 'OUTSTAND_14B_ACCOUNT_1', label: 'OUTSTAND 14B A/C 1', type: 'number', editable: false },
      { key: 'OUTSTAND_14B_ACCOUNT_2', label: 'OUTSTAND 14B A/C 2', type: 'number', editable: false },
      { key: 'OUTSTAND_14B_ACCOUNT_10', label: 'OUTSTAND 14B A/C 10', type: 'number', editable: false },
      { key: 'OUTSTAND_14B_ACCOUNT_21', label: 'OUTSTAND 14B A/C 21', type: 'number', editable: false },
      { key: 'OUTSTAND_14B_ACCOUNT_22', label: 'OUTSTAND 14B A/C 22', type: 'number', editable: false },
      
      // Account-wise Outstanding 7Q (computed)
      { key: 'OUTSTAND_7Q_ACCOUNT_1', label: 'OUTSTAND 7Q A/C 1', type: 'number', editable: false },
      { key: 'OUTSTAND_7Q_ACCOUNT_2', label: 'OUTSTAND 7Q A/C 2', type: 'number', editable: false },
      { key: 'OUTSTAND_7Q_ACCOUNT_10', label: 'OUTSTAND 7Q A/C 10', type: 'number', editable: false },
      { key: 'OUTSTAND_7Q_ACCOUNT_21', label: 'OUTSTAND 7Q A/C 21', type: 'number', editable: false },
      { key: 'OUTSTAND_7Q_ACCOUNT_22', label: 'OUTSTAND 7Q A/C 22', type: 'number', editable: false },
      
      // ESTA-level fields
      { key: 'RECOVERY_COST', label: 'RECOVERY_COST', type: 'number', editable: true },
      { key: 'RECEVIED_REC_COST', label: 'RECEVIED_REC_COST', type: 'number', editable: true },
      { key: 'OUTSTAND_REC_COST', label: 'OUTSTAND_REC_COST', type: 'number', editable: false },
      { key: 'OUTSTAND_TOT_WITH_REC', label: 'OUTSTAND_TOT_WITH_REC', type: 'number', editable: false },
      
      // RRC-level totals (computed from all RRCs with same ESTA_CODE)
      { key: 'DEMAND_TOTAL_RRC', label: 'DEMAND TOTAL RRC', type: 'number', editable: false },
      { key: 'RECOVERY_TOTAL_RRC', label: 'RECOVERY TOTAL RRC', type: 'number', editable: false },
      { key: 'OUTSTAND_TOTAL_RRC', label: 'OUTSTAND TOTAL RRC', type: 'number', editable: false },
      { key: 'OUTSTAND_TOT_WITH_REC_RRC', label: 'OUTSTAND TOT WITH REC RRC', type: 'number', editable: false },
    ];
    
    return {
      nonFinancial: allNonFinancialFields,
      financial: allFinancialFields,
    };
  };

  // Get all fields (ensures all 148 fields are shown)
  // Memoize field lists to prevent unnecessary re-renders
  const getAllFields = useMemo(() => getAllRRCFields(), []);
  const nonFinancialFields = useMemo(() => getAllFields.nonFinancial, [getAllFields]);
  const financialFields = useMemo(() => getAllFields.financial, [getAllFields]);

  // All fields are now explicitly defined above (148 fields total)

  // Group RRCs by ESTA_CODE for table display (use merged data)
  const estaGroups = {};
  mergedRrcData.forEach(rrc => {
    const estaCode = rrc.ESTA_CODE;
    if (!estaGroups[estaCode]) {
      estaGroups[estaCode] = [];
    }
    estaGroups[estaCode].push(rrc);
  });

  return (
    <>
      <div style={{ 
        overflowX: 'auto', 
        overflowY: 'auto', 
        padding: '10px',
        maxHeight: 'calc(100vh - 200px)',
        maxWidth: '100%',
        border: '1px solid #ddd',
        borderRadius: '4px'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', minWidth: '8000px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', position: 'sticky', top: 0, zIndex: 10 }}>
              {/* Basic Fields */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', whiteSpace: 'nowrap' }}>SN</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap' }}>ESTA CODE</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap' }}>IR NIR</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap' }}>ESTA NAME</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'normal', wordWrap: 'break-word', width: '80px', maxWidth: '80px' }}>RRC NO</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap' }}>RRC DATE</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap' }}>PERIOD</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap' }}>U/S</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap' }}>RACK LOCATION</th>
              
              {/* Address & Contact Fields (ESTA-level) */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap', background: '#e3f2fd' }}>RO</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'normal', wordWrap: 'break-word', width: '80px', maxWidth: '80px', background: '#e3f2fd' }}>ADD1</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'normal', wordWrap: 'break-word', width: '80px', maxWidth: '80px', background: '#e3f2fd' }}>ADD2</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'normal', wordWrap: 'break-word', width: '80px', maxWidth: '80px', background: '#e3f2fd' }}>CITY</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap', background: '#e3f2fd' }}>DIST</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap', background: '#e3f2fd' }}>PIN CD</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap', background: '#e3f2fd' }}>CIRCLE</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap', background: '#e3f2fd' }}>MOBILE NO</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'normal', wordWrap: 'break-word', width: '120px', maxWidth: '120px', background: '#e3f2fd' }}>EMAIL</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap', background: '#e3f2fd' }}>STATUS</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap', background: '#e3f2fd' }}>ESTA PAN</th>
              
              {/* Date Fields (ESTA-level) */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap', background: '#fff9c4' }}>CP-1 DATE</th>
              
              {/* Other Fields (ESTA-level) */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'normal', wordWrap: 'break-word', width: '400px', minWidth: '400px', background: '#fce4ec' }}>REMARKS</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap', background: '#fce4ec' }}>ENFORCEMENT OFFICER</th>
              
              {/* Section-level Demand */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 7A</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 14B</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 7Q</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND TOTAL</th>
              
              {/* Section-level Recovery */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 7A</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 14B</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 7Q</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY TOTAL</th>
              
              {/* Section-level Outstanding */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 7A</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 14B</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 7Q</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND TOTAL</th>
              
              {/* Demand 7A Account-wise */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 7A A/C 1_EE</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 7A A/C 1_ER</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 7A A/C 2</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 7A A/C 10</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 7A A/C 21</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 7A A/C 22</th>
              
              {/* Demand 14B Account-wise */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 14B A/C 1</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 14B A/C 2</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 14B A/C 10</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 14B A/C 21</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 14B A/C 22</th>
              
              {/* Demand 7Q Account-wise */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 7Q A/C 1</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 7Q A/C 2</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 7Q A/C 10</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 7Q A/C 21</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#e8f4f8' }}>DEMAND 7Q A/C 22</th>
              
              {/* Recovery 7A Account-wise */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 7A A/C 1_EE</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 7A A/C 1_ER</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 7A A/C 2</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 7A A/C 10</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 7A A/C 21</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 7A A/C 22</th>
              
              {/* Recovery 14B Account-wise */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 14B A/C 1</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 14B A/C 2</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 14B A/C 10</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 14B A/C 21</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 14B A/C 22</th>
              
              {/* Recovery 7Q Account-wise */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 7Q A/C 1</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 7Q A/C 2</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 7Q A/C 10</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 7Q A/C 21</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#fff3cd' }}>RECOVERY 7Q A/C 22</th>
              
              {/* Outstanding 7A Account-wise */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 7A A/C 1_EE</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 7A A/C 1_ER</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 7A A/C 2</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 7A A/C 10</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 7A A/C 21</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 7A A/C 22</th>
              
              {/* Outstanding 14B Account-wise */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 14B A/C 1</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 14B A/C 2</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 14B A/C 10</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 14B A/C 21</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 14B A/C 22</th>
              
              {/* Outstanding 7Q Account-wise */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 7Q A/C 1</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 7Q A/C 2</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 7Q A/C 10</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 7Q A/C 21</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#f8d7da' }}>OUTSTAND 7Q A/C 22</th>
              
              {/* ESTA-level fields (same for all RRCs with same ESTA_CODE) */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#d1ecf1' }}>RECOVERY_COST</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#d1ecf1' }}>RECEVIED_REC_COST</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#d1ecf1' }}>OUTSTAND_REC_COST</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#d1ecf1' }}>OUTSTAND_TOT_WITH_REC</th>
              
              {/* RRC-level totals (grouped by ESTA_CODE) */}
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#d4edda' }}>DEMAND TOTAL RRC</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#d4edda' }}>RECOVERY TOTAL RRC</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#d4edda' }}>OUTSTAND TOTAL RRC</th>
              <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', whiteSpace: 'nowrap', background: '#d4edda' }}>OUTSTAND TOT WITH REC RRC</th>
            </tr>
          </thead>
          <tbody>
            {mergedRrcData.map((rrc, index) => {
              const estaRrcs = estaGroups[rrc.ESTA_CODE] || [];
              const firstEstaRrc = estaRrcs[0] || rrc;
              
              // For ESTA-level fields, use values from first RRC with same ESTA_CODE
              // Note: mergedRrcData already has establishment data merged, so displayRrc will have the correct values
              const displayRrc = { ...rrc };
              ESTA_LEVEL_FIELDS.forEach(field => {
                if (firstEstaRrc[field] !== undefined && firstEstaRrc[field] !== null) {
                  displayRrc[field] = firstEstaRrc[field];
                }
              });
              
              return (
                <tr 
                  key={rrc._id || index} 
                  onClick={() => openPopup(rrc)}
                  style={{ 
                    background: index % 2 === 0 ? 'white' : '#f9f9f9',
                    cursor: 'pointer'
                  }}
                >
                  {/* Basic Fields */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{rrc.ESTA_CODE || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{rrc.IR_NIR || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{rrc.ESTA_NAME || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', whiteSpace: 'normal', wordWrap: 'break-word', width: '80px', maxWidth: '80px' }}>{rrc.RRC_NO || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{formatDate(rrc.RRC_DATE)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{rrc.RRC_PERIOD || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{rrc.U_S || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{rrc.RACK_LOCATION || '-'}</td>
                  
                  {/* Address & Contact Fields (ESTA-level) */}
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{displayRrc.RO || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', whiteSpace: 'normal', wordWrap: 'break-word', width: '80px', maxWidth: '80px' }}>{displayRrc.ADD1 || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', whiteSpace: 'normal', wordWrap: 'break-word', width: '80px', maxWidth: '80px' }}>{displayRrc.ADD2 || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', whiteSpace: 'normal', wordWrap: 'break-word', width: '80px', maxWidth: '80px' }}>{displayRrc.CITY || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{displayRrc.DIST || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{displayRrc.PIN_CD || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{displayRrc.CIRCLE || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{displayRrc.MOBILE_NO || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', whiteSpace: 'normal', wordWrap: 'break-word', width: '120px', maxWidth: '120px' }}>{displayRrc.EMAIL || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{displayRrc.STATUS || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{displayRrc.ESTA_PAN || '-'}</td>
                  
                  {/* Date Fields (ESTA-level) */}
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{formatDate(displayRrc.CP_1_DATE)}</td>
                  
                  {/* Other Fields (ESTA-level) */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', whiteSpace: 'pre-line', wordWrap: 'break-word', width: '400px', minWidth: '400px' }}>{displayRrc.REMARKS || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{displayRrc.ENFORCEMENT_OFFICER || '-'}</td>
                  
                  {/* Section-level Demand */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_7A)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_14B)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_7Q)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_TOTAL)}</td>
                  
                  {/* Section-level Recovery */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_7A)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_14B)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_7Q)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_TOTAL)}</td>
                  
                  {/* Section-level Outstanding */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_7A)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_14B)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_7Q)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_TOTAL)}</td>
                  
                  {/* Demand 7A Account-wise */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_7A_ACCOUNT_1_EE)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_7A_ACCOUNT_1_ER)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_7A_ACCOUNT_2)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_7A_ACCOUNT_10)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_7A_ACCOUNT_21)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_7A_ACCOUNT_22)}</td>
                  
                  {/* Demand 14B Account-wise */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_14B_ACCOUNT_1)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_14B_ACCOUNT_2)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_14B_ACCOUNT_10)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_14B_ACCOUNT_21)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_14B_ACCOUNT_22)}</td>
                  
                  {/* Demand 7Q Account-wise */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_7Q_ACCOUNT_1)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_7Q_ACCOUNT_2)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_7Q_ACCOUNT_10)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_7Q_ACCOUNT_21)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_7Q_ACCOUNT_22)}</td>
                  
                  {/* Recovery 7A Account-wise */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_7A_ACCOUNT_1_EE)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_7A_ACCOUNT_1_ER)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_7A_ACCOUNT_2)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_7A_ACCOUNT_10)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_7A_ACCOUNT_21)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_7A_ACCOUNT_22)}</td>
                  
                  {/* Recovery 14B Account-wise */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_14B_ACCOUNT_1)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_14B_ACCOUNT_2)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_14B_ACCOUNT_10)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_14B_ACCOUNT_21)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_14B_ACCOUNT_22)}</td>
                  
                  {/* Recovery 7Q Account-wise */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_7Q_ACCOUNT_1)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_7Q_ACCOUNT_2)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_7Q_ACCOUNT_10)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_7Q_ACCOUNT_21)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_7Q_ACCOUNT_22)}</td>
                  
                  {/* Outstanding 7A Account-wise */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_7A_ACCOUNT_1_EE)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_7A_ACCOUNT_1_ER)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_7A_ACCOUNT_2)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_7A_ACCOUNT_10)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_7A_ACCOUNT_21)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_7A_ACCOUNT_22)}</td>
                  
                  {/* Outstanding 14B Account-wise */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_14B_ACCOUNT_1)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_14B_ACCOUNT_2)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_14B_ACCOUNT_10)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_14B_ACCOUNT_21)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_14B_ACCOUNT_22)}</td>
                  
                  {/* Outstanding 7Q Account-wise */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_7Q_ACCOUNT_1)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_7Q_ACCOUNT_2)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_7Q_ACCOUNT_10)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_7Q_ACCOUNT_21)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_7Q_ACCOUNT_22)}</td>
                  
                  {/* ESTA-level fields (same for all RRCs with same ESTA_CODE) */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(displayRrc.RECOVERY_COST)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(displayRrc.RECEVIED_REC_COST)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(displayRrc.OUTSTAND_REC_COST)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(displayRrc.OUTSTAND_TOT_WITH_REC)}</td>
                  
                  {/* RRC-level totals (grouped by ESTA_CODE) */}
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.DEMAND_TOTAL_RRC)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.RECOVERY_TOTAL_RRC)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_TOTAL_RRC)}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(rrc.OUTSTAND_TOT_WITH_REC_RRC)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Popup Modal - Similar to backup design */}
      {editRow && (
        <div className="popup-backdrop" onClick={(e) => {
          if (e.target === e.currentTarget) {
            closePopup();
          }
        }}>
          <div className="popup-container" onClick={e => e.stopPropagation()}>
            <div className="popup-header">
              <div className="popup-title-left">
                📋 RRC Details
              </div>
              <div className="popup-title-right">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                  <div style={{ fontWeight: 600 }}>{editRow.ESTA_CODE || ''} | {editRow.ESTA_NAME || ''}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                    OUTSTAND TOT RRC: <strong>{formatNumber(rrcTotals.OUTSTAND_TOT_WITH_REC_RRC || 0)}</strong>
                  </div>
                </div>
              </div>
            </div>
            <div className="popup-content">
              {/* Column 1: RRC Details (Non-Financial) - Modern Design */}
              <div className="popup-column" style={{ minWidth: '350px' }}>
                <h5>📝 RRC Details</h5>
                <div className="popup-scroll">
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {nonFinancialFields.map(field => {
                      const isDate = isDateField(field.key);
                      // Get value from editRow, then selectedRow, then empty string
                      const fieldValue = editRow && editRow[field.key] !== undefined 
                        ? editRow[field.key] 
                        : (selectedRow && selectedRow[field.key] !== undefined ? selectedRow[field.key] : '');
                      
                      return (
                        <div 
                          key={field.key} 
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '6px',
                            padding: '12px',
                            background: field.editable ? '#ffffff' : '#f8f9fa',
                            borderRadius: '8px',
                            border: field.editable ? '2px solid #e2e8f0' : '1px solid #e2e8f0',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (field.editable) {
                              e.currentTarget.style.borderColor = '#667eea';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (field.editable) {
                              e.currentTarget.style.borderColor = '#e2e8f0';
                              e.currentTarget.style.boxShadow = 'none';
                            }
                          }}
                        >
                          <PopupField
                            field={field}
                            value={fieldValue}
                            onChange={handleFieldChange}
                            isDate={isDate}
                            editable={field.editable}
                            formatDateForInput={formatDateForInput}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Column 2: Financial Details - Table Format (Similar to Recovery Entry) */}
              <div className="popup-column" style={{ minWidth: '650px', flex: '2' }}>
                <h5>💰 Financial Details</h5>
                <div className="popup-scroll" style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                  {(() => {
                    // Get sections to show based on U/S
                    const sectionsToShow = editRow ? getSectionsToShow(editRow.U_S) : { show7A: true, show14B: true, show7Q: true };
                    
                    // Get current RRC data for display
                    const currentRRC = editRow || selectedRow || {};
                    
                    // Helper to get field value (editable or computed)
                    const getFieldValue = (fieldKey) => {
                      const isComputed = isComputedField(fieldKey);
                      if (isComputed) {
                        if (fieldKey.includes('TOTAL_RRC') || fieldKey.includes('TOT_WITH_REC_RRC')) {
                          return rrcTotals[fieldKey] !== undefined ? rrcTotals[fieldKey] : (currentRRC[fieldKey] || 0);
                        }
                        return computedValues[fieldKey] !== undefined ? computedValues[fieldKey] : (currentRRC[fieldKey] || 0);
                      }
                      return currentRRC[fieldKey] !== undefined ? (currentRRC[fieldKey] || 0) : 0;
                    };
                    
                    // Helper to check if field is editable
                    const isFieldEditable = (fieldKey) => {
                      const field = financialFields.find(f => f.key === fieldKey);
                      return field ? field.editable : false;
                    };
                    
                    return (
                      <div style={{ width: '100%' }}>
                        {/* Section 7A Table */}
                        {sectionsToShow.show7A && (
                          <div style={{ marginBottom: '20px', width: '100%' }}>
                            <h4 style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>Section 7A</h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #ddd', tableLayout: 'fixed' }}>
                              <thead>
                                <tr style={{ background: '#e9ecef' }}>
                                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold', width: '15%' }}>Type</th>
                                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '14%' }}>A/C 1_EE</th>
                                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '14%' }}>A/C 1_ER</th>
                                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '14%' }}>A/C 2</th>
                                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '14%' }}>A/C 10</th>
                                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '14%' }}>A/C 21</th>
                                  <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '15%' }}>A/C 22</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>DEMAND 7A</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_7A_ACCOUNT_1_EE') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_7A_ACCOUNT_1_EE || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_7A_ACCOUNT_1_EE', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '6px 8px', textAlign: 'right', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', transition: 'all 0.2s ease' }}
                                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                      />
                                    ) : (
                                      <span style={{ fontWeight: 500 }}>{formatNumber(getFieldValue('DEMAND_7A_ACCOUNT_1_EE'))}</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_7A_ACCOUNT_1_ER') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_7A_ACCOUNT_1_ER || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_7A_ACCOUNT_1_ER', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '6px 8px', textAlign: 'right', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', transition: 'all 0.2s ease' }}
                                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                      />
                                    ) : (
                                      <span style={{ fontWeight: 500 }}>{formatNumber(getFieldValue('DEMAND_7A_ACCOUNT_1_ER'))}</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_7A_ACCOUNT_2') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_7A_ACCOUNT_2 || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_7A_ACCOUNT_2', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '6px 8px', textAlign: 'right', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', transition: 'all 0.2s ease' }}
                                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                      />
                                    ) : (
                                      <span style={{ fontWeight: 500 }}>{formatNumber(getFieldValue('DEMAND_7A_ACCOUNT_2'))}</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_7A_ACCOUNT_10') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_7A_ACCOUNT_10 || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_7A_ACCOUNT_10', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '6px 8px', textAlign: 'right', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', transition: 'all 0.2s ease' }}
                                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                      />
                                    ) : (
                                      <span style={{ fontWeight: 500 }}>{formatNumber(getFieldValue('DEMAND_7A_ACCOUNT_10'))}</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_7A_ACCOUNT_21') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_7A_ACCOUNT_21 || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_7A_ACCOUNT_21', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '6px 8px', textAlign: 'right', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', transition: 'all 0.2s ease' }}
                                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                      />
                                    ) : (
                                      <span style={{ fontWeight: 500 }}>{formatNumber(getFieldValue('DEMAND_7A_ACCOUNT_21'))}</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_7A_ACCOUNT_22') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_7A_ACCOUNT_22 || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_7A_ACCOUNT_22', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '6px 8px', textAlign: 'right', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', transition: 'all 0.2s ease' }}
                                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                      />
                                    ) : (
                                      <span style={{ fontWeight: 500 }}>{formatNumber(getFieldValue('DEMAND_7A_ACCOUNT_22'))}</span>
                                    )}
                                  </td>
                                </tr>
                                <tr style={{ background: '#f8f9fa' }}>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: '700', background: '#f8f9fa' }}>RECOVERY 7A</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('RECOVERY_7A_ACCOUNT_1_EE'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('RECOVERY_7A_ACCOUNT_1_ER'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('RECOVERY_7A_ACCOUNT_2'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('RECOVERY_7A_ACCOUNT_10'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('RECOVERY_7A_ACCOUNT_21'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('RECOVERY_7A_ACCOUNT_22'))}</td>
                                </tr>
                                <tr style={{ background: '#ffffff' }}>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: '700', background: '#f8f9fa' }}>OUTSTAND 7A</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('OUTSTAND_7A_ACCOUNT_1_EE'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('OUTSTAND_7A_ACCOUNT_1_ER'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('OUTSTAND_7A_ACCOUNT_2'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('OUTSTAND_7A_ACCOUNT_10'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('OUTSTAND_7A_ACCOUNT_21'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('OUTSTAND_7A_ACCOUNT_22'))}</td>
                                </tr>
                                <tr style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', fontWeight: '700' }}>
                                  <td style={{ padding: '12px', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>TOTAL 7A</td>
                                  <td style={{ padding: '12px', border: '1px solid #e2e8f0', textAlign: 'right', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', color: '#2d3748' }} colSpan="6">
                                    DEMAND: <strong>{formatNumber(getFieldValue('DEMAND_7A'))}</strong> | 
                                    RECOVERY: <strong>{formatNumber(getFieldValue('RECOVERY_7A'))}</strong> | 
                                    OUTSTAND: <strong>{formatNumber(getFieldValue('OUTSTAND_7A'))}</strong>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Section 7Q Table */}
                        {sectionsToShow.show7Q && (
                          <div style={{ marginBottom: '24px', width: '100%', background: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' }}>
                            <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 'bold', color: '#2d3748', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                              📊 Section 7Q
                            </h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', tableLayout: 'fixed', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                              <thead>
                                <tr style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
                                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left', fontWeight: '700', width: '15%', color: '#2d3748' }}>Type</th>
                                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '700', width: '17%', color: '#2d3748' }}>A/C 1</th>
                                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '700', width: '17%', color: '#2d3748' }}>A/C 2</th>
                                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '700', width: '17%', color: '#2d3748' }}>A/C 10</th>
                                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '700', width: '17%', color: '#2d3748' }}>A/C 21</th>
                                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '700', width: '17%', color: '#2d3748' }}>A/C 22</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr style={{ background: '#ffffff' }}>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: '700', background: '#f8f9fa' }}>DEMAND 7Q</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_7Q_ACCOUNT_1') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_7Q_ACCOUNT_1 || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_7Q_ACCOUNT_1', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '6px 8px', textAlign: 'right', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', transition: 'all 0.2s ease' }}
                                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                      />
                                    ) : (
                                      <span style={{ fontWeight: 500 }}>{formatNumber(getFieldValue('DEMAND_7Q_ACCOUNT_1'))}</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_7Q_ACCOUNT_2') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_7Q_ACCOUNT_2 || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_7Q_ACCOUNT_2', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '6px 8px', textAlign: 'right', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', transition: 'all 0.2s ease' }}
                                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                      />
                                    ) : (
                                      <span style={{ fontWeight: 500 }}>{formatNumber(getFieldValue('DEMAND_7Q_ACCOUNT_2'))}</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_7Q_ACCOUNT_10') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_7Q_ACCOUNT_10 || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_7Q_ACCOUNT_10', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '6px 8px', textAlign: 'right', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', transition: 'all 0.2s ease' }}
                                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                      />
                                    ) : (
                                      <span style={{ fontWeight: 500 }}>{formatNumber(getFieldValue('DEMAND_7Q_ACCOUNT_10'))}</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_7Q_ACCOUNT_21') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_7Q_ACCOUNT_21 || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_7Q_ACCOUNT_21', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '6px 8px', textAlign: 'right', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', transition: 'all 0.2s ease' }}
                                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                      />
                                    ) : (
                                      <span style={{ fontWeight: 500 }}>{formatNumber(getFieldValue('DEMAND_7Q_ACCOUNT_21'))}</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_7Q_ACCOUNT_22') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_7Q_ACCOUNT_22 || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_7Q_ACCOUNT_22', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '6px 8px', textAlign: 'right', border: '2px solid #e2e8f0', borderRadius: '6px', fontSize: '12px', transition: 'all 0.2s ease' }}
                                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)'; }}
                                        onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                      />
                                    ) : (
                                      <span style={{ fontWeight: 500 }}>{formatNumber(getFieldValue('DEMAND_7Q_ACCOUNT_22'))}</span>
                                    )}
                                  </td>
                                </tr>
                                <tr style={{ background: '#f8f9fa' }}>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: '700', background: '#f8f9fa' }}>RECOVERY 7Q</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('RECOVERY_7Q_ACCOUNT_1'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('RECOVERY_7Q_ACCOUNT_2'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('RECOVERY_7Q_ACCOUNT_10'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('RECOVERY_7Q_ACCOUNT_21'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('RECOVERY_7Q_ACCOUNT_22'))}</td>
                                </tr>
                                <tr style={{ background: '#ffffff' }}>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: '700', background: '#f8f9fa' }}>OUTSTAND 7Q</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('OUTSTAND_7Q_ACCOUNT_1'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('OUTSTAND_7Q_ACCOUNT_2'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('OUTSTAND_7Q_ACCOUNT_10'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('OUTSTAND_7Q_ACCOUNT_21'))}</td>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', color: '#4a5568', fontWeight: 500 }}>{formatNumber(getFieldValue('OUTSTAND_7Q_ACCOUNT_22'))}</td>
                                </tr>
                                <tr style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', fontWeight: '700' }}>
                                  <td style={{ padding: '12px', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>TOTAL 7Q</td>
                                  <td style={{ padding: '12px', border: '1px solid #e2e8f0', textAlign: 'right', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', color: '#2d3748' }} colSpan="5">
                                    DEMAND: <strong>{formatNumber(getFieldValue('DEMAND_7Q'))}</strong> | 
                                    RECOVERY: <strong>{formatNumber(getFieldValue('RECOVERY_7Q'))}</strong> | 
                                    OUTSTAND: <strong>{formatNumber(getFieldValue('OUTSTAND_7Q'))}</strong>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Section 14B Table */}
                        {sectionsToShow.show14B && (
                          <div style={{ marginBottom: '24px', width: '100%', background: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' }}>
                            <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 'bold', color: '#2d3748', paddingBottom: '8px', borderBottom: '2px solid #e2e8f0' }}>
                              📊 Section 14B
                            </h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', tableLayout: 'fixed', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
                              <thead>
                                <tr style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
                                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'left', fontWeight: '700', width: '15%', color: '#2d3748' }}>Type</th>
                                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '700', width: '17%', color: '#2d3748' }}>A/C 1</th>
                                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '700', width: '17%', color: '#2d3748' }}>A/C 2</th>
                                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '700', width: '17%', color: '#2d3748' }}>A/C 10</th>
                                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '700', width: '17%', color: '#2d3748' }}>A/C 21</th>
                                  <th style={{ padding: '10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '700', width: '17%', color: '#2d3748' }}>A/C 22</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr style={{ background: '#ffffff' }}>
                                  <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: '700', background: '#f8f9fa' }}>DEMAND 14B</td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_14B_ACCOUNT_1') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_14B_ACCOUNT_1 || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_14B_ACCOUNT_1', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '4px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', fontSize: '11px' }}
                                      />
                                    ) : (
                                      formatNumber(getFieldValue('DEMAND_14B_ACCOUNT_1'))
                                    )}
                                  </td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_14B_ACCOUNT_2') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_14B_ACCOUNT_2 || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_14B_ACCOUNT_2', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '4px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', fontSize: '11px' }}
                                      />
                                    ) : (
                                      formatNumber(getFieldValue('DEMAND_14B_ACCOUNT_2'))
                                    )}
                                  </td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_14B_ACCOUNT_10') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_14B_ACCOUNT_10 || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_14B_ACCOUNT_10', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '4px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', fontSize: '11px' }}
                                      />
                                    ) : (
                                      formatNumber(getFieldValue('DEMAND_14B_ACCOUNT_10'))
                                    )}
                                  </td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_14B_ACCOUNT_21') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_14B_ACCOUNT_21 || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_14B_ACCOUNT_21', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '4px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', fontSize: '11px' }}
                                      />
                                    ) : (
                                      formatNumber(getFieldValue('DEMAND_14B_ACCOUNT_21'))
                                    )}
                                  </td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                                    {isFieldEditable('DEMAND_14B_ACCOUNT_22') ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={currentRRC.DEMAND_14B_ACCOUNT_22 || 0}
                                        onChange={(e) => handleFieldChange('DEMAND_14B_ACCOUNT_22', parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '4px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', fontSize: '11px' }}
                                      />
                                    ) : (
                                      formatNumber(getFieldValue('DEMAND_14B_ACCOUNT_22'))
                                    )}
                                  </td>
                                </tr>
                                <tr>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>RECOVERY 14B</td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{formatNumber(getFieldValue('RECOVERY_14B_ACCOUNT_1'))}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{formatNumber(getFieldValue('RECOVERY_14B_ACCOUNT_2'))}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{formatNumber(getFieldValue('RECOVERY_14B_ACCOUNT_10'))}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{formatNumber(getFieldValue('RECOVERY_14B_ACCOUNT_21'))}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{formatNumber(getFieldValue('RECOVERY_14B_ACCOUNT_22'))}</td>
                                </tr>
                                <tr>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>OUTSTAND 14B</td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{formatNumber(getFieldValue('OUTSTAND_14B_ACCOUNT_1'))}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{formatNumber(getFieldValue('OUTSTAND_14B_ACCOUNT_2'))}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{formatNumber(getFieldValue('OUTSTAND_14B_ACCOUNT_10'))}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{formatNumber(getFieldValue('OUTSTAND_14B_ACCOUNT_21'))}</td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', color: '#666' }}>{formatNumber(getFieldValue('OUTSTAND_14B_ACCOUNT_22'))}</td>
                                </tr>
                                <tr style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
                                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>TOTAL 14B</td>
                                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }} colSpan="5">
                                    DEMAND: {formatNumber(getFieldValue('DEMAND_14B'))} | 
                                    RECOVERY: {formatNumber(getFieldValue('RECOVERY_14B'))} | 
                                    OUTSTAND: {formatNumber(getFieldValue('OUTSTAND_14B'))}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Totals and ESTA-level fields */}
                        <div style={{ marginTop: '24px', padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <tbody>
                              <tr>
                                <td style={{ padding: '10px', fontWeight: '600', width: '50%', color: 'white' }}>DEMAND TOTAL:</td>
                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: 'white', fontSize: '14px' }}>{formatNumber(getFieldValue('DEMAND_TOTAL'))}</td>
                              </tr>
                              <tr>
                                <td style={{ padding: '10px', fontWeight: '600', color: 'white' }}>RECOVERY TOTAL:</td>
                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: 'white', fontSize: '14px' }}>{formatNumber(getFieldValue('RECOVERY_TOTAL'))}</td>
                              </tr>
                              <tr>
                                <td style={{ padding: '10px', fontWeight: '600', color: 'white' }}>OUTSTAND TOTAL:</td>
                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: 'white', fontSize: '14px' }}>{formatNumber(getFieldValue('OUTSTAND_TOTAL'))}</td>
                              </tr>
                              <tr style={{ borderTop: '2px solid rgba(255, 255, 255, 0.3)', marginTop: '8px' }}>
                                <td style={{ padding: '10px', fontWeight: '600', color: 'white' }}>RECOVERY COST:</td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>
                                  {isFieldEditable('RECOVERY_COST') ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={currentRRC.RECOVERY_COST || 0}
                                      onChange={(e) => handleFieldChange('RECOVERY_COST', parseFloat(e.target.value) || 0)}
                                      style={{ width: '160px', padding: '6px 10px', textAlign: 'right', border: '2px solid rgba(255, 255, 255, 0.3)', borderRadius: '6px', fontSize: '12px', background: 'rgba(255, 255, 255, 0.95)', fontWeight: 600 }}
                                    />
                                  ) : (
                                    <span style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>{formatNumber(getFieldValue('RECOVERY_COST'))}</span>
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td style={{ padding: '10px', fontWeight: '600', color: 'white' }}>RECEVIED REC COST:</td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>
                                  {isFieldEditable('RECEVIED_REC_COST') ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={currentRRC.RECEVIED_REC_COST || 0}
                                      onChange={(e) => handleFieldChange('RECEVIED_REC_COST', parseFloat(e.target.value) || 0)}
                                      style={{ width: '160px', padding: '6px 10px', textAlign: 'right', border: '2px solid rgba(255, 255, 255, 0.3)', borderRadius: '6px', fontSize: '12px', background: 'rgba(255, 255, 255, 0.95)', fontWeight: 600 }}
                                    />
                                  ) : (
                                    <span style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>{formatNumber(getFieldValue('RECEVIED_REC_COST'))}</span>
                                  )}
                                </td>
                              </tr>
                              <tr>
                                <td style={{ padding: '10px', fontWeight: '600', color: 'white' }}>OUTSTAND REC COST:</td>
                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: 'white', fontSize: '14px' }}>{formatNumber(getFieldValue('OUTSTAND_REC_COST'))}</td>
                              </tr>
                              <tr>
                                <td style={{ padding: '10px', fontWeight: '600', color: 'white' }}>OUTSTAND TOT WITH REC:</td>
                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: 'white', fontSize: '14px' }}>{formatNumber(getFieldValue('OUTSTAND_TOT_WITH_REC'))}</td>
                              </tr>
                              <tr style={{ borderTop: '3px solid rgba(255, 255, 255, 0.5)', marginTop: '12px' }}>
                                <td style={{ padding: '12px', fontWeight: '700', fontSize: '13px', color: 'white', background: 'rgba(255, 255, 255, 0.1)' }}>DEMAND TOTAL RRC:</td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', fontSize: '14px', color: 'white', background: 'rgba(255, 255, 255, 0.1)' }}>{formatNumber(getFieldValue('DEMAND_TOTAL_RRC'))}</td>
                              </tr>
                              <tr style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                                <td style={{ padding: '12px', fontWeight: '700', fontSize: '13px', color: 'white' }}>RECOVERY TOTAL RRC:</td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', fontSize: '14px', color: 'white' }}>{formatNumber(getFieldValue('RECOVERY_TOTAL_RRC'))}</td>
                              </tr>
                              <tr style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                                <td style={{ padding: '12px', fontWeight: '700', fontSize: '13px', color: 'white' }}>OUTSTAND TOTAL RRC:</td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', fontSize: '14px', color: 'white' }}>{formatNumber(getFieldValue('OUTSTAND_TOTAL_RRC'))}</td>
                              </tr>
                              <tr style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                                <td style={{ padding: '12px', fontWeight: '700', fontSize: '13px', color: 'white' }}>OUTSTAND REC COST:</td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', fontSize: '14px', color: 'white' }}>{formatNumber(getFieldValue('OUTSTAND_REC_COST'))}</td>
                              </tr>
                              <tr style={{ background: 'rgba(255, 255, 255, 0.15)' }}>
                                <td style={{ padding: '12px', fontWeight: '700', fontSize: '14px', color: 'white' }}>OUTSTAND TOT WITH REC RRC:</td>
                                <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', fontSize: '15px', color: '#ffd700' }}>{formatNumber(getFieldValue('OUTSTAND_TOT_WITH_REC_RRC'))}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Column 3: Actions - Modern Design */}
              <div className="popup-column popup-buttons-column">
                <h5>⚡ Quick Actions</h5>
                <div className="popup-buttons-scroll">
                  {[
                    { label: "CP-1", icon: "📄" },
                    { label: "SUMMON", icon: "⚖️" },
                    { label: "CP-25", icon: "📋" },
                    { label: "CP-26", icon: "📑" },
                    { label: "ESTA LETTER", icon: "🏢" },
                    { label: "CP-3 Bank", icon: "🏦" },
                    { label: "CP-3 Third", icon: "📝" },
                    { label: "INCOME TAX LETTER", icon: "📊" },
                    { label: "GST LETTER", icon: "🧾" },
                    { label: "RELEASE BANK", icon: "🔓" },
                    { label: "RELEASE CP26", icon: "🔓" },
                    { label: "HEARING SHEET", icon: "⚖️" },
                    { label: "LETTER TO BANK", icon: "🏛️" }
                  ].map((action) => (
                    <button
                      key={action.label}
                      className="popup-action-button"
                      onClick={() => {
                        if (action.label === 'CP-1') {
                          handleCP1Click();
                        } else if (action.label === 'SUMMON') {
                          handleSummonClick();
                        } else if (action.label === 'CP-25') {
                          handleCP25Click();
                        } else if (action.label === 'CP-26') {
                          handleCP26Click();
                        } else if (action.label === 'ESTA LETTER') {
                          handleEstaLetterClick();
                        } else if (action.label === 'CP-3 Bank') {
                          handleCP3BankClick();
                        } else if (action.label === 'INCOME TAX LETTER') {
                          handleIncomeTaxLetterClick();
                        } else {
                          // Placeholder for other action button handlers
                          alert(`${action.label} action clicked for ESTA: ${editRow.ESTA_CODE || ''}`);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <span style={{ fontSize: '1rem' }}>{action.icon}</span>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="popup-actions">
              <button 
                onClick={closePopup} 
                disabled={isSaving || isDeleting} 
                style={{ 
                  background: 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)', 
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(108, 117, 125, 0.3)'
                }}
              >
                ✕ Cancel
              </button>
              <button 
                onClick={handleDelete} 
                disabled={isSaving || isDeleting} 
                style={{ 
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                }}
              >
                {isDeleting ? '⏳ Deleting...' : '🗑️ Delete'}
              </button>
              <button 
                onClick={handleSave} 
                disabled={isSaving || isDeleting} 
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)'
                }}
              >
                {isSaving ? '⏳ Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CP-25 Notice Date Popup (legacy, now disabled to reduce lag) */}
      {false && (
        <div 
          className="popup-backdrop" 
          onClick={(e) => {
            if (e.target === e.currentTarget && !cp25Loading) {
              setShowCP25Popup(false);
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
        >
          <div 
            className="popup-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ 
                margin: '0 0 10px 0', 
                color: '#333',
                fontSize: '24px',
                fontWeight: '600'
              }}>
                📄 Generate CP-25 Notice
              </h2>
              <p style={{ 
                margin: '0', 
                color: '#666', 
                fontSize: '14px' 
              }}>
                Enter details for CP-25 notice generation
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                CP-25 Notice Date: *
              </label>
              <input
                type="date"
                value={cp25NoticeDate}
                onChange={(e) => {
                  setCP25NoticeDate(e.target.value);
                  // Auto-calculate hearing date when notice date changes
                  if (e.target.value) {
                    const calculatedHearingDate = calculateHearingDate(e.target.value);
                    if (calculatedHearingDate) {
                      setCP25HearingDate(calculatedHearingDate);
                    }
                  }
                }}
                required
                disabled={cp25Loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {/* Employer Names Section */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '12px', 
                fontWeight: '600',
                color: '#333',
                fontSize: '15px'
              }}>
                Employer Name(s): * (Select multiple or enter new)
              </label>
              
              {/* Saved Employer Names with Checkboxes */}
              {cp25SavedEmployerNames && cp25SavedEmployerNames.length > 0 && (
                <div style={{ 
                  marginBottom: '12px', 
                  padding: '12px', 
                  background: '#f0f8ff', 
                  borderRadius: '8px',
                  border: '1px solid #b3d9ff',
                  maxHeight: '150px',
                  overflowY: 'auto'
                }}>
                  <div style={{ 
                    fontWeight: '500', 
                    marginBottom: '8px', 
                    color: '#0066cc',
                    fontSize: '13px'
                  }}>
                    Saved Employer Names:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {cp25SavedAddresses
                      .filter(addr => addr.employerName && addr.employerName.trim())
                      .map((addr) => {
                        const name = addr.employerName.trim();
                        const isEditing = cp25EditingNameId === addr._id;
                        return (
                          <div
                            key={addr._id}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              padding: '6px',
                              borderRadius: '4px',
                              transition: 'background 0.2s',
                              background: isEditing ? '#fff3cd' : 'transparent',
                            }}
                            onMouseEnter={(e) => !isEditing && (e.currentTarget.style.background = '#e6f3ff')}
                            onMouseLeave={(e) => !isEditing && (e.currentTarget.style.background = 'transparent')}
                          >
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={cp25EditingNameValue}
                                  onChange={(e) => setCP25EditingNameValue(e.target.value)}
                                  disabled={cp25Loading}
                                  style={{
                                    flex: 1,
                                    padding: '6px 8px',
                                    fontSize: '13px',
                                    border: '2px solid #667eea',
                                    borderRadius: '4px',
                                  }}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveEditedEmployerName();
                                    } else if (e.key === 'Escape') {
                                      setCP25EditingNameId(null);
                                      setCP25EditingNameValue('');
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={handleSaveEditedEmployerName}
                                  disabled={cp25Loading || !cp25EditingNameValue.trim()}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    background: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                  title="Save"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCP25EditingNameId(null);
                                    setCP25EditingNameValue('');
                                  }}
                                  disabled={cp25Loading}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    background: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <input
                                  type="checkbox"
                                  checked={cp25SelectedEmployerNames.includes(name)}
                                  onChange={() => handleToggleEmployerName(name)}
                                  disabled={cp25Loading}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span 
                                  style={{ 
                                    fontSize: '13px', 
                                    color: '#333',
                                    flex: 1,
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => handleToggleEmployerName(name)}
                                >
                                  {name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleEditEmployerName(addr._id, name)}
                                  disabled={cp25Loading}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    background: '#17a2b8',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEmployerName(addr._id)}
                                  disabled={cp25Loading}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    background: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                  title="Delete"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* New Employer Name Input */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <input
                  type="text"
                  value={cp25EmployerName}
                  onChange={(e) => setCP25EmployerName(e.target.value)}
                  placeholder="Enter new employer name"
                  disabled={cp25Loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.3s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
                <button
                  type="button"
                  onClick={handleSaveEmployerNameOnly}
                  disabled={cp25Loading || !cp25EmployerName.trim()}
                  style={{
                    padding: '12px 16px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#fff',
                    background: (cp25Loading || !cp25EmployerName.trim())
                      ? '#ccc'
                      : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: (cp25Loading || !cp25EmployerName.trim()) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: (cp25Loading || !cp25EmployerName.trim()) ? 'none' : '0 2px 4px rgba(40, 167, 69, 0.3)',
                    whiteSpace: 'nowrap'
                  }}
                  title="Save employer name only"
                >
                  💾 Save Name
                </button>
              </div>
              {cp25SelectedEmployerNames.length > 0 && (
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  background: '#e8f5e9', 
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#2e7d32'
                }}>
                  Selected: {cp25SelectedEmployerNames.join(', ')}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Address Selection: *
              </label>
              
              {/* Existing Address Display */}
              <div style={{ 
                marginBottom: '12px', 
                padding: '12px', 
                background: '#f9f9f9', 
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '8px',
                  gap: '10px'
                }}>
                  <input
                    type="radio"
                    id="cp25-use-existing"
                    checked={cp25AddressMode === 'existing'}
                    onChange={() => {
                      setCP25AddressMode('existing');
                      setCP25SelectedSavedAddress('');
                      setCP25NewAddress('');
                    }}
                    disabled={cp25Loading}
                    style={{ cursor: cp25Loading ? 'not-allowed' : 'pointer' }}
                  />
                  <label 
                    htmlFor="cp25-use-existing"
                    style={{ 
                      fontWeight: '500',
                      color: '#333',
                      cursor: cp25Loading ? 'not-allowed' : 'pointer',
                      flex: 1
                    }}
                  >
                    Use Existing Address
                  </label>
                </div>
                {cp25AddressMode === 'existing' && (
                  <>
                    {cp25EditingExistingAddress ? (
                      <div style={{ marginLeft: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <textarea
                          value={cp25EditingExistingAddressValue}
                          onChange={(e) => setCP25EditingExistingAddressValue(e.target.value)}
                          disabled={cp25Loading}
                          rows={3}
                          placeholder="Enter address (each line will be preserved)"
                          style={{
                            width: '100%',
                            padding: '8px',
                            fontSize: '13px',
                            border: '2px solid #667eea',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            resize: 'vertical',
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '500', minWidth: '80px' }}>
                            DISTRICT:
                          </label>
                          <input
                            type="text"
                            value={cp25EditingExistingDistrict}
                            onChange={(e) => setCP25EditingExistingDistrict(e.target.value)}
                            disabled={cp25Loading}
                            style={{
                              flex: 1,
                              padding: '6px 8px',
                              fontSize: '13px',
                              border: '2px solid #667eea',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '500', minWidth: '80px' }}>
                            PIN CODE:
                          </label>
                          <input
                            type="text"
                            value={cp25EditingExistingPinCode}
                            onChange={(e) => setCP25EditingExistingPinCode(e.target.value)}
                            disabled={cp25Loading}
                            style={{
                              flex: 1,
                              padding: '6px 8px',
                              fontSize: '13px',
                              border: '2px solid #667eea',
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setCP25EditingExistingAddress(false);
                              setCP25EditingExistingAddressValue('');
                              setCP25EditingExistingDistrict('');
                              setCP25EditingExistingPinCode('');
                            }}
                            disabled={cp25Loading}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              background: '#6c757d',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            ✕ Cancel Edit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ 
                          marginLeft: '28px',
                          padding: '10px',
                          background: 'white',
                          borderRadius: '6px',
                          border: '1px solid #ddd',
                          fontSize: '13px',
                          color: '#666',
                          whiteSpace: 'pre-line',
                          fontFamily: 'monospace',
                          marginBottom: '10px'
                        }}>
                          {getExistingAddress() || 'No address available'}
                        </div>
                        <div style={{ 
                          marginLeft: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '10px'
                        }}>
                          <label style={{ 
                            fontWeight: '500',
                            color: '#333',
                            fontSize: '13px',
                            minWidth: '100px'
                          }}>
                            DISTRICT:
                          </label>
                          <input
                            type="text"
                            value={getExistingDistrict()}
                            disabled
                            style={{
                              padding: '8px',
                              fontSize: '13px',
                              border: '2px solid #ddd',
                              borderRadius: '6px',
                              background: '#f5f5f5',
                              color: '#666',
                              fontFamily: 'monospace',
                              minWidth: '120px'
                            }}
                          />
                        </div>
                        <div style={{ 
                          marginLeft: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '10px'
                        }}>
                          <label style={{ 
                            fontWeight: '500',
                            color: '#333',
                            fontSize: '13px',
                            minWidth: '100px'
                          }}>
                            PIN CODE:
                          </label>
                          <input
                            type="text"
                            value={getExistingPinCode()}
                            disabled
                            style={{
                              padding: '8px',
                              fontSize: '13px',
                              border: '2px solid #ddd',
                              borderRadius: '6px',
                              background: '#f5f5f5',
                              color: '#666',
                              fontFamily: 'monospace',
                              minWidth: '120px'
                            }}
                          />
                        </div>
                        <div style={{ marginLeft: '28px', display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={handleEditExistingAddress}
                            disabled={cp25Loading}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              background: '#17a2b8',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                            title="Edit existing address"
                          >
                            ✏️ Edit Address
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveAddressOnly}
                            disabled={cp25Loading || (cp25EditingExistingAddress ? (!cp25EditingExistingAddressValue.trim() || !cp25EditingExistingPinCode.trim()) : (!getExistingAddress() || !getExistingPinCode()))}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              color: '#fff',
                              background: (cp25Loading || (cp25EditingExistingAddress ? (!cp25EditingExistingAddressValue.trim() || !cp25EditingExistingPinCode.trim()) : (!getExistingAddress() || !getExistingPinCode())))
                                ? '#ccc'
                                : 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: (cp25Loading || (cp25EditingExistingAddress ? (!cp25EditingExistingAddressValue.trim() || !cp25EditingExistingPinCode.trim()) : (!getExistingAddress() || !getExistingPinCode()))) ? 'not-allowed' : 'pointer',
                              transition: 'all 0.3s',
                              boxShadow: (cp25Loading || (cp25EditingExistingAddress ? (!cp25EditingExistingAddressValue.trim() || !cp25EditingExistingPinCode.trim()) : (!getExistingAddress() || !getExistingPinCode()))) ? 'none' : '0 2px 4px rgba(23, 162, 184, 0.3)',
                            }}
                            title={cp25EditingExistingAddress ? "Save edited address" : "Save existing address only (without employer name)"}
                          >
                            💾 Save Address
                          </button>
                        </div>
                      </>
                    )}
                    <div style={{ 
                      marginLeft: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <label style={{ 
                        fontWeight: '500',
                        color: '#333',
                        fontSize: '13px',
                        minWidth: '100px'
                      }}>
                        Enforcement Officer:
                      </label>
                      <input
                        type="text"
                        value={cp25EnforcementOfficer || 'Not assigned'}
                        disabled
                        style={{
                          padding: '8px',
                          fontSize: '13px',
                          border: '2px solid #ddd',
                          borderRadius: '6px',
                          background: cp25EnforcementOfficer ? '#e8f5e9' : '#fff3cd',
                          color: cp25EnforcementOfficer ? '#2e7d32' : '#856404',
                          fontFamily: 'monospace',
                          flex: 1,
                          fontWeight: cp25EnforcementOfficer ? '500' : 'normal'
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveAddressOnly}
                      disabled={cp25Loading || !getExistingAddress() || !getExistingPinCode()}
                      style={{
                        marginLeft: '28px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#fff',
                        background: (cp25Loading || !getExistingAddress() || !getExistingPinCode())
                          ? '#ccc'
                          : 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: (cp25Loading || !getExistingAddress() || !getExistingPinCode()) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s',
                        boxShadow: (cp25Loading || !getExistingAddress() || !getExistingPinCode()) ? 'none' : '0 2px 4px rgba(23, 162, 184, 0.3)',
                      }}
                      title="Save existing address only (without employer name)"
                    >
                      💾 Save Address
                    </button>
                  </>
                )}
              </div>

              {/* Saved Addresses Option */}
              {cp25SavedAddresses && cp25SavedAddresses.length > 0 && (
                <div style={{ 
                  marginBottom: '12px', 
                  padding: '12px', 
                  background: '#f9f9f9', 
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ 
                    fontWeight: '500', 
                    marginBottom: '8px', 
                    color: '#333',
                    fontSize: '14px'
                  }}>
                    Saved Addresses:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {cp25SavedAddresses
                      .filter(addr => addr.address && addr.address.trim())
                      .map((saved) => {
                        const isEditing = cp25EditingAddressId === saved._id;
                        return (
                          <div key={saved._id} style={{ 
                            padding: '10px', 
                            background: isEditing ? '#fff3cd' : 'white', 
                            borderRadius: '6px',
                            border: isEditing ? '2px solid #667eea' : '1px solid #ddd'
                          }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <textarea
                                  value={cp25EditingAddressValue}
                                  onChange={(e) => setCP25EditingAddressValue(e.target.value)}
                                  disabled={cp25Loading}
                                  rows={3}
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    fontSize: '13px',
                                    border: '2px solid #667eea',
                                    borderRadius: '4px',
                                    fontFamily: 'monospace',
                                    resize: 'vertical',
                                  }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <label style={{ fontSize: '12px', fontWeight: '500', minWidth: '80px' }}>
                                    PIN CODE:
                                  </label>
                                  <input
                                    type="text"
                                    value={cp25EditingAddressPinCode}
                                    onChange={(e) => setCP25EditingAddressPinCode(e.target.value)}
                                    disabled={cp25Loading}
                                    style={{
                                      flex: 1,
                                      padding: '6px 8px',
                                      fontSize: '13px',
                                      border: '2px solid #667eea',
                                      borderRadius: '4px',
                                    }}
                                  />
                                </div>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={handleSaveEditedAddress}
                                    disabled={cp25Loading || !cp25EditingAddressValue.trim()}
                                    style={{
                                      padding: '6px 12px',
                                      fontSize: '12px',
                                      background: '#28a745',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ✓ Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCP25EditingAddressId(null);
                                      setCP25EditingAddressValue('');
                                      setCP25EditingAddressPinCode('');
                                      setCP25EditingAddressOriginalEmployerName('');
                                    }}
                                    disabled={cp25Loading}
                                    style={{
                                      padding: '6px 12px',
                                      fontSize: '12px',
                                      background: '#6c757d',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ✕ Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <input
                                  type="radio"
                                  id={`cp25-saved-${saved._id}`}
                                  checked={cp25AddressMode === 'saved' && cp25SelectedSavedAddress === saved._id}
                                  onChange={() => {
                                    setCP25AddressMode('saved');
                                    setCP25SelectedSavedAddress(saved._id);
                                    // Immediately fetch Enforcement Officer for this saved address's PIN CODE
                                    if (saved && saved.pinCode) {
                                      fetchEnforcementOfficerByPinCode(saved.pinCode);
                                    } else {
                                      setCP25EnforcementOfficer('');
                                    }
                                  }}
                                  disabled={cp25Loading}
                                  style={{ cursor: cp25Loading ? 'not-allowed' : 'pointer', marginTop: '4px' }}
                                />
                                <label 
                                  htmlFor={`cp25-saved-${saved._id}`}
                                  style={{ 
                                    flex: 1,
                                    cursor: cp25Loading ? 'not-allowed' : 'pointer',
                                    fontSize: '13px'
                                  }}
                                >
                                  <div style={{ 
                                    whiteSpace: 'pre-line',
                                    fontFamily: 'monospace',
                                    color: '#666',
                                    marginBottom: '4px'
                                  }}>
                                    {saved.address || 'No address'}
                                  </div>
                                  {saved.pinCode && (
                                    <div style={{ 
                                      fontSize: '12px',
                                      color: '#999',
                                      marginBottom: '4px'
                                    }}>
                                      PIN: {saved.pinCode}
                                    </div>
                                  )}
                                  {saved.employerName && (
                                    <div style={{ 
                                      fontSize: '12px',
                                      color: '#999',
                                      fontStyle: 'italic',
                                      marginBottom: '4px'
                                    }}>
                                      Employer: {saved.employerName}
                                    </div>
                                  )}
                                  {cp25SavedAddressEnforcementOfficers[saved._id] && (
                                    <div style={{ 
                                      fontSize: '12px',
                                      color: '#2e7d32',
                                      fontWeight: '500',
                                      marginTop: '4px'
                                    }}>
                                      Enforcement Officer: {cp25SavedAddressEnforcementOfficers[saved._id]}
                                    </div>
                                  )}
                                </label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleEditAddress(saved._id, saved.address, saved.pinCode, saved.employerName)}
                                    disabled={cp25Loading}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      background: '#17a2b8',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                    }}
                                    title="Edit"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAddress(saved._id)}
                                    disabled={cp25Loading}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      background: '#dc3545',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                    }}
                                    title="Delete"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* New Address Option */}
              <div style={{ 
                padding: '12px', 
                background: '#f9f9f9', 
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '8px',
                  gap: '10px'
                }}>
                  <input
                    type="radio"
                    id="cp25-use-new"
                    checked={cp25AddressMode === 'new'}
                    onChange={() => {
                      setCP25AddressMode('new');
                      setCP25SelectedSavedAddress('');
                    }}
                    disabled={cp25Loading}
                    style={{ cursor: cp25Loading ? 'not-allowed' : 'pointer' }}
                  />
                  <label 
                    htmlFor="cp25-use-new"
                    style={{ 
                      fontWeight: '500',
                      color: '#333',
                      cursor: cp25Loading ? 'not-allowed' : 'pointer',
                      flex: 1
                    }}
                  >
                    Enter New Address
                  </label>
                </div>
                {cp25AddressMode === 'new' && (
                  <>
                    <textarea
                      value={cp25NewAddress}
                      onChange={(e) => setCP25NewAddress(e.target.value)}
                      placeholder="Enter new address (each line will be preserved)"
                      disabled={cp25Loading}
                      rows={4}
                      style={{
                        width: '100%',
                        marginLeft: '28px',
                        padding: '10px',
                        fontSize: '13px',
                        border: '2px solid #ddd',
                        borderRadius: '6px',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.3s',
                        fontFamily: 'monospace',
                        resize: 'vertical',
                        marginBottom: '10px'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#ddd'}
                    />
                    <div style={{ 
                      marginLeft: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '10px'
                    }}>
                      <label style={{ 
                        fontWeight: '500',
                        color: '#333',
                        fontSize: '13px',
                        minWidth: '100px'
                      }}>
                        PIN CODE: *
                      </label>
                      <input
                        type="text"
                        value={cp25NewPinCode}
                        onChange={(e) => setCP25NewPinCode(e.target.value)}
                        placeholder="Enter PIN CODE"
                        disabled={cp25Loading}
                        style={{
                          padding: '8px',
                          fontSize: '13px',
                          border: '2px solid #ddd',
                          borderRadius: '6px',
                          boxSizing: 'border-box',
                          transition: 'border-color 0.3s',
                          fontFamily: 'monospace',
                          minWidth: '120px',
                          flex: 1
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#667eea'}
                        onBlur={(e) => e.target.style.borderColor = '#ddd'}
                      />
                    </div>
                    <div style={{ 
                      marginLeft: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '10px'
                    }}>
                      <label style={{ 
                        fontWeight: '500',
                        color: '#333',
                        fontSize: '13px',
                        minWidth: '100px'
                      }}>
                        Enforcement Officer:
                      </label>
                      <input
                        type="text"
                        value={cp25EnforcementOfficer || 'Not assigned'}
                        disabled
                        style={{
                          padding: '8px',
                          fontSize: '13px',
                          border: '2px solid #ddd',
                          borderRadius: '6px',
                          background: cp25EnforcementOfficer ? '#e8f5e9' : '#fff3cd',
                          color: cp25EnforcementOfficer ? '#2e7d32' : '#856404',
                          fontFamily: 'monospace',
                          flex: 1,
                          fontWeight: cp25EnforcementOfficer ? '500' : 'normal',
                          transition: 'all 0.3s'
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveAddressOnly}
                      disabled={cp25Loading || !cp25NewAddress.trim() || !cp25NewPinCode.trim()}
                      style={{
                        marginLeft: '28px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#fff',
                        background: (cp25Loading || !cp25NewAddress.trim() || !cp25NewPinCode.trim())
                          ? '#ccc'
                          : 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: (cp25Loading || !cp25NewAddress.trim() || !cp25NewPinCode.trim()) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s',
                        boxShadow: (cp25Loading || !cp25NewAddress.trim() || !cp25NewPinCode.trim()) ? 'none' : '0 2px 4px rgba(23, 162, 184, 0.3)',
                      }}
                      title="Save address only (without employer name)"
                    >
                      💾 Save Address
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Hearing Date: * (Auto-calculated: 22 days after notice date, skipping weekends)
              </label>
              <input
                type="date"
                value={cp25HearingDate}
                onChange={(e) => setCP25HearingDate(e.target.value)}
                required
                disabled={cp25Loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {/* CP-1 DATE Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                CP-1 DATE: * (Mandatory)
              </label>
              <input
                type="date"
                value={cp25CP1Date}
                onChange={(e) => setCP25CP1Date(e.target.value)}
                required
                disabled={cp25Loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: cp25CP1Date ? '2px solid #28a745' : '2px solid #dc3545',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s',
                  background: cp25CP1Date ? '#f8fff9' : '#fff5f5',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = cp25CP1Date ? '#28a745' : '#dc3545'}
              />
              {!cp25CP1Date && (
                <div style={{ 
                  marginTop: '4px', 
                  fontSize: '12px', 
                  color: '#dc3545',
                  fontStyle: 'italic'
                }}>
                  ⚠️ CP-1 DATE is mandatory for CP-25 notice generation
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Hearing Time: * (Default: 3:00 PM)
              </label>
              <input
                type="time"
                value={cp25HearingTime}
                onChange={(e) => setCP25HearingTime(e.target.value)}
                required
                disabled={cp25Loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Remark (Optional):
              </label>
              <textarea
                value={cp25Remark}
                onChange={(e) => setCP25Remark(e.target.value)}
                placeholder="Enter remark to be added to REMARKS field..."
                disabled={cp25Loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  minHeight: '80px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {cp25Error && (
              <div style={{
                marginBottom: '15px',
                padding: '12px',
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: '6px',
                color: '#c33',
                fontSize: '14px'
              }}>
                ⚠️ {cp25Error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCP25Popup(false);
                  setCP25Error('');
                  setCP25NoticeDate('');
                  setCP25EmployerName('');
                  setCP25AddressMode('existing');
                  setCP25UseExistingAddress(true);
                  setCP25NewAddress('');
                  setCP25SelectedSavedAddress('');
                  setCP25HearingDate('');
                  setCP25HearingTime('');
                }}
                disabled={cp25Loading}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#666',
                  background: '#f0f0f0',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: cp25Loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleGenerateCP25(false)}
                disabled={cp25Loading || !cp25NoticeDate || !cp25HearingDate || !cp25HearingTime || !cp25CP1Date}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#fff',
                  background: cp25Loading || !cp25NoticeDate || !cp25CP1Date
                    ? '#ccc'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (cp25Loading || !cp25NoticeDate || !cp25CP1Date) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: (cp25Loading || !cp25NoticeDate || !cp25CP1Date)
                    ? 'none'
                    : '0 4px 15px rgba(102, 126, 234, 0.4)',
                }}
              >
                {cp25Loading ? '⏳ Generating...' : '📥 CP-25'}
              </button>
              <button
                onClick={() => handleGenerateCP25(true)}
                disabled={cp25Loading || !cp25NoticeDate || !cp25HearingDate || !cp25HearingTime || !cp25CP1Date}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#fff',
                  background: cp25Loading || !cp25NoticeDate || !cp25CP1Date
                    ? '#ccc'
                    : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (cp25Loading || !cp25NoticeDate || !cp25CP1Date) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: (cp25Loading || !cp25NoticeDate || !cp25CP1Date)
                    ? 'none'
                    : '0 4px 15px rgba(245, 87, 108, 0.4)',
                }}
              >
                {cp25Loading ? '⏳ Generating...' : '📥 CP-25 Through Area EO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CP-1 Notice Date Popup */}
      {showCP1Popup && (
        <div 
          className="popup-backdrop" 
          onClick={(e) => {
            if (e.target === e.currentTarget && !cp1Loading) {
              setShowCP1Popup(false);
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div 
            className="popup-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ 
                margin: '0 0 10px 0', 
                color: '#333',
                fontSize: '24px',
                fontWeight: '600'
              }}>
                📄 Generate CP-1 Notice
              </h2>
              <p style={{ 
                margin: '0', 
                color: '#666', 
                fontSize: '14px' 
              }}>
                Enter the notice date for CP-1 generation
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Notice Date: *
              </label>
              <input
                type="date"
                value={cp1NoticeDate}
                onChange={(e) => setCP1NoticeDate(e.target.value)}
                required
                disabled={cp1Loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Remark (Optional):
              </label>
              <textarea
                value={cp1Remark}
                onChange={(e) => setCP1Remark(e.target.value)}
                placeholder="Enter remark to be added to REMARKS field..."
                disabled={cp1Loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  minHeight: '80px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {cp1Error && (
              <div style={{
                marginBottom: '20px',
                padding: '12px',
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: '6px',
                color: '#c33',
                fontSize: '14px'
              }}>
                ⚠️ {cp1Error}
              </div>
            )}

            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => {
                  if (!cp1Loading) {
                    setShowCP1Popup(false);
                    setCP1Error('');
                  }
                }}
                disabled={cp1Loading}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#666',
                  cursor: cp1Loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  opacity: cp1Loading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!cp1Loading) {
                    e.target.style.background = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!cp1Loading) {
                    e.target.style.background = 'white';
                  }
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateCP1}
                disabled={cp1Loading || !cp1NoticeDate}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: 'none',
                  borderRadius: '8px',
                  background: cp1Loading || !cp1NoticeDate 
                    ? '#ccc' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  cursor: cp1Loading || !cp1NoticeDate ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: cp1Loading || !cp1NoticeDate 
                    ? 'none' 
                    : '0 4px 12px rgba(102, 126, 234, 0.4)',
                }}
                onMouseEnter={(e) => {
                  if (!cp1Loading && cp1NoticeDate) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!cp1Loading && cp1NoticeDate) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                  }
                }}
              >
                {cp1Loading ? '⏳ Generating...' : '📥 Generate & Download'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CP-25 Popup (extracted component, optimized) */}
      {showCP25Popup && (
        <CP25Popup
          isOpen={showCP25Popup}
          onClose={() => setShowCP25Popup(false)}
          editRow={editRow}
          username={username}
          officeData={officeData}
          onRefresh={onRefresh}
          onSuccess={onSuccess}
        />
      )}

      {/* CP-26 Notice Popup */}
      {showCP26Popup && (
        <CP26Popup
          isOpen={showCP26Popup}
          onClose={() => setShowCP26Popup(false)}
          editRow={editRow}
          username={username}
          officeData={officeData}
          onRefresh={onRefresh}
          onSuccess={onSuccess}
        />
      )}

      {/* OLD CP-26 Notice Popup - DISABLED */}
      {false && (
        <div 
          className="popup-backdrop" 
          onClick={(e) => {
            if (e.target === e.currentTarget && !cp26Loading) {
              setShowCP26Popup(false);
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div 
            className="popup-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ 
                margin: '0 0 10px 0', 
                color: '#333',
                fontSize: '24px',
                fontWeight: '600'
              }}>
                📄 Generate CP-26 Warrant of Arrest Notice
              </h2>
              <p style={{ 
                margin: '0', 
                color: '#666', 
                fontSize: '14px' 
              }}>
                Enter details for CP-26 notice generation
              </p>
            </div>

            {/* CP-26 Notice Date */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
                CP-26 Notice Date: *
              </label>
              <input
                type="date"
                value={cp26NoticeDate}
                onChange={(e) => setCP26NoticeDate(e.target.value)}
                required
                disabled={cp26Loading}
                style={{ width: '100%', padding: '12px', fontSize: '14px', border: '2px solid #ddd', borderRadius: '8px', boxSizing: 'border-box', transition: 'border-color 0.3s' }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {/* Police Station Address */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Police Station Address: *
              </label>
              {cp26SavedPoliceStationAddresses.length > 0 && (
                <select
                  value={cp26SelectedPoliceStationAddress}
                  onChange={(e) => {
                    setCP26SelectedPoliceStationAddress(e.target.value);
                    setCP26PoliceStationAddress(e.target.value);
                  }}
                  disabled={cp26Loading}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    background: 'white',
                  }}
                >
                  <option value="">Select saved address...</option>
                  {cp26SavedPoliceStationAddresses.map((addr, idx) => (
                    <option key={idx} value={addr}>{addr.length > 100 ? addr.substring(0, 100) + '...' : addr}</option>
                  ))}
                </select>
              )}
              <textarea
                value={cp26PoliceStationAddress}
                onChange={(e) => setCP26PoliceStationAddress(e.target.value)}
                required
                disabled={cp26Loading}
                rows={3}
                placeholder="Enter address"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  transition: 'border-color 0.3s',
                  marginBottom: '10px',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '13px'
                  }}>
                    District:
                  </label>
                  <input
                    type="text"
                    value={cp26PoliceStationDistrict}
                    onChange={(e) => setCP26PoliceStationDistrict(e.target.value)}
                    disabled={cp26Loading}
                    placeholder="Enter district"
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '14px',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.3s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '500',
                    color: '#333',
                    fontSize: '13px'
                  }}>
                    PIN Code (optional):
                  </label>
                  <input
                    type="text"
                    value={cp26PoliceStationPinCode}
                    onChange={(e) => setCP26PoliceStationPinCode(e.target.value)}
                    disabled={cp26Loading}
                    placeholder="Enter PIN code"
                    maxLength={6}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '14px',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.3s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  />
                </div>
              </div>
                <div style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                marginTop: '4px',
                marginBottom: '10px'
              }}>
                <label style={{ 
                  fontWeight: '500',
                  color: '#333',
                  fontSize: '13px',
                  minWidth: '140px'
                }}>
                  Enforcement Officer:
                </label>
                <input
                  type="text"
                  value={cp26EnforcementOfficer || 'Not assigned'}
                  disabled
                  style={{
                  padding: '10px',
                  fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    background: cp26EnforcementOfficer ? '#e8f5e9' : '#fff3cd',
                    color: cp26EnforcementOfficer ? '#2e7d32' : '#856404',
                    fontFamily: 'monospace',
                    flex: 1,
                    fontWeight: cp26EnforcementOfficer ? '500' : 'normal'
                  }}
                  title={cp26EnforcementOfficer ? 'Enforcement Officer found for PIN code' : 'No Enforcement Officer found for PIN code'}
                />
                </div>
              <button
                type="button"
                onClick={() => {
                  let addressToSave = cp26PoliceStationAddress.trim();
                  if (cp26PoliceStationDistrict && cp26PoliceStationDistrict.trim()) {
                    addressToSave += `\n${cp26PoliceStationDistrict.trim()}`;
                  }
                  if (cp26PoliceStationPinCode && cp26PoliceStationPinCode.trim()) {
                    if (cp26PoliceStationDistrict && cp26PoliceStationDistrict.trim()) {
                      addressToSave += ` - ${cp26PoliceStationPinCode.trim()}`;
                    } else {
                      addressToSave += `\n${cp26PoliceStationPinCode.trim()}`;
                    }
                  }
                  if (addressToSave.trim()) {
                    saveCP26Address('policeStation', addressToSave);
                    if (onSuccess) {
                      onSuccess('Police Station Address saved!');
                    }
                  }
                }}
                disabled={cp26Loading || !cp26PoliceStationAddress || !cp26PoliceStationAddress.trim()}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  background: cp26Loading || !cp26PoliceStationAddress || !cp26PoliceStationAddress.trim()
                    ? '#ccc'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: cp26Loading || !cp26PoliceStationAddress || !cp26PoliceStationAddress.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                💾 Save Police Station Address
              </button>
            </div>

            {/* Scheduled Date */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Scheduled Date: *
              </label>
              <input
                type="date"
                value={cp26ScheduledDate}
                onChange={(e) => setCP26ScheduledDate(e.target.value)}
                required
                disabled={cp26Loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {/* Show Cause Notice Reference & date */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Show Cause Notice Reference & date: *
              </label>
              <input
                type="text"
                value={cp26ShowCauseRef}
                onChange={(e) => setCP26ShowCauseRef(e.target.value)}
                required
                disabled={cp26Loading}
                placeholder="e.g., CP-25/123/2024 dated 01-01-2024"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {/* Previous Hearing Dates */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Previous Hearing Dates: *
              </label>
              <textarea
                value={cp26PreviousHearingDates}
                onChange={(e) => setCP26PreviousHearingDates(e.target.value)}
                required
                disabled={cp26Loading}
                rows={2}
                placeholder="Enter dates separated by commas, e.g., 01-01-2024, 15-01-2024"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {/* Deputy Police Commissioner Address */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Deputy Police Commissioner Address: *
              </label>
              {cp26SavedDeputyPoliceCommissionerAddresses.length > 0 && (
                <select
                  value={cp26SelectedDeputyPoliceCommissionerAddress}
                  onChange={(e) => {
                    setCP26SelectedDeputyPoliceCommissionerAddress(e.target.value);
                    setCP26DeputyPoliceCommissionerAddress(e.target.value);
                  }}
                  disabled={cp26Loading}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    background: 'white',
                  }}
                >
                  <option value="">Select saved address...</option>
                  {cp26SavedDeputyPoliceCommissionerAddresses.map((addr, idx) => (
                    <option key={idx} value={addr}>{addr.length > 100 ? addr.substring(0, 100) + '...' : addr}</option>
                  ))}
                </select>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <textarea
                  value={cp26DeputyPoliceCommissionerAddress}
                  onChange={(e) => setCP26DeputyPoliceCommissionerAddress(e.target.value)}
                  required
                  disabled={cp26Loading}
                  rows={3}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    transition: 'border-color 0.3s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (cp26DeputyPoliceCommissionerAddress && cp26DeputyPoliceCommissionerAddress.trim()) {
                      saveCP26Address('deputyPoliceCommissioner', cp26DeputyPoliceCommissionerAddress);
                      if (onSuccess) {
                        onSuccess('Deputy Police Commissioner Address saved!');
                      }
                    }
                  }}
                  disabled={cp26Loading || !cp26DeputyPoliceCommissionerAddress || !cp26DeputyPoliceCommissionerAddress.trim()}
                  style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    background: cp26Loading || !cp26DeputyPoliceCommissionerAddress || !cp26DeputyPoliceCommissionerAddress.trim()
                      ? '#ccc'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: cp26Loading || !cp26DeputyPoliceCommissionerAddress || !cp26DeputyPoliceCommissionerAddress.trim() ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    alignSelf: 'flex-start',
                  }}
                >
                  💾 Save
                </button>
              </div>
            </div>

            {/* Error Message */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Remark (Optional):
              </label>
              <textarea
                value={cp26Remark}
                onChange={(e) => setCP26Remark(e.target.value)}
                placeholder="Enter remark to be added to REMARKS field..."
                disabled={cp26Loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  minHeight: '80px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {cp26Error && (
              <div style={{ marginBottom: '20px', padding: '12px', background: '#fee', border: '1px solid #fcc', borderRadius: '6px', color: '#c33', fontSize: '14px' }}>
                ⚠️ {cp26Error}
              </div>
            )}

            {/* Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => {
                  if (!cp26Loading) {
                    setShowCP26Popup(false);
                    setCP26Error('');
                    setCP26NoticeDate('');
                    setCP26PoliceStationAddress('');
                    setCP26ScheduledDate('');
                    setCP26ShowCauseRef('');
                    setCP26PreviousHearingDates('');
                    setCP26DeputyPoliceCommissionerAddress('');
                  }
                }}
                disabled={cp26Loading}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#666',
                  cursor: cp26Loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  opacity: cp26Loading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!cp26Loading) {
                    e.target.style.background = '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!cp26Loading) {
                    e.target.style.background = 'white';
                  }
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleGenerateCP26(false)}
                disabled={cp26Loading || !cp26NoticeDate || !cp26PoliceStationAddress || !cp26ScheduledDate || !cp26ShowCauseRef || !cp26PreviousHearingDates || !cp26DeputyPoliceCommissionerAddress}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: 'none',
                  borderRadius: '8px',
                  background: cp26Loading || !cp26NoticeDate || !cp26PoliceStationAddress || !cp26ScheduledDate || !cp26ShowCauseRef || !cp26PreviousHearingDates || !cp26DeputyPoliceCommissionerAddress
                    ? '#ccc' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  cursor: cp26Loading || !cp26NoticeDate || !cp26PoliceStationAddress || !cp26ScheduledDate || !cp26ShowCauseRef || !cp26PreviousHearingDates || !cp26DeputyPoliceCommissionerAddress ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: cp26Loading || !cp26NoticeDate || !cp26PoliceStationAddress || !cp26ScheduledDate || !cp26ShowCauseRef || !cp26PreviousHearingDates || !cp26DeputyPoliceCommissionerAddress
                    ? 'none' 
                    : '0 4px 12px rgba(102, 126, 234, 0.4)',
                }}
                onMouseEnter={(e) => {
                  if (!cp26Loading && cp26NoticeDate && cp26PoliceStationAddress && cp26ScheduledDate && cp26ShowCauseRef && cp26PreviousHearingDates && cp26DeputyPoliceCommissionerAddress) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!cp26Loading && cp26NoticeDate && cp26PoliceStationAddress && cp26ScheduledDate && cp26ShowCauseRef && cp26PreviousHearingDates && cp26DeputyPoliceCommissionerAddress) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                  }
                }}
              >
                {cp26Loading ? '⏳ Generating...' : '📥 CP-26'}
              </button>
              <button
                onClick={() => handleGenerateCP26(true)}
                disabled={cp26Loading || !cp26NoticeDate || !cp26PoliceStationAddress || !cp26ScheduledDate || !cp26ShowCauseRef || !cp26PreviousHearingDates || !cp26DeputyPoliceCommissionerAddress}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: 'none',
                  borderRadius: '8px',
                  background: cp26Loading || !cp26NoticeDate || !cp26PoliceStationAddress || !cp26ScheduledDate || !cp26ShowCauseRef || !cp26PreviousHearingDates || !cp26DeputyPoliceCommissionerAddress
                    ? '#ccc'
                    : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  cursor: cp26Loading || !cp26NoticeDate || !cp26PoliceStationAddress || !cp26ScheduledDate || !cp26ShowCauseRef || !cp26PreviousHearingDates || !cp26DeputyPoliceCommissionerAddress ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: cp26Loading || !cp26NoticeDate || !cp26PoliceStationAddress || !cp26ScheduledDate || !cp26ShowCauseRef || !cp26PreviousHearingDates || !cp26DeputyPoliceCommissionerAddress
                    ? 'none'
                    : '0 4px 12px rgba(245, 87, 108, 0.4)',
                }}
                onMouseEnter={(e) => {
                  if (!cp26Loading && cp26NoticeDate && cp26PoliceStationAddress && cp26ScheduledDate && cp26ShowCauseRef && cp26PreviousHearingDates && cp26DeputyPoliceCommissionerAddress) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(245, 87, 108, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!cp26Loading && cp26NoticeDate && cp26PoliceStationAddress && cp26ScheduledDate && cp26ShowCauseRef && cp26PreviousHearingDates && cp26DeputyPoliceCommissionerAddress) {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(245, 87, 108, 0.4)';
                  }
                }}
              >
                {cp26Loading ? '⏳ Generating...' : '📥 CP-26 Through Area EO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESTA LETTER Popup */}
      {showEstaLetterPopup && (
        <EstaLetterPopup
          isOpen={showEstaLetterPopup}
          onClose={() => setShowEstaLetterPopup(false)}
          editRow={editRow}
          username={username}
          officeData={officeData}
          establishmentMap={establishmentMap}
          onRefresh={onRefresh}
          onSuccess={onSuccess}
        />
      )}

      {/* Summon Popup */}
      {showSummonPopup && (
        <SummonPopup
          isOpen={showSummonPopup}
          onClose={() => setShowSummonPopup(false)}
          editRow={editRow}
          username={username}
          officeData={officeData}
          onRefresh={onRefresh}
          onSuccess={onSuccess}
        />
      )}

      {/* CP-3 Bank Popup */}
      {showCP3BankPopup && (
        <CP3BankPopup
          isOpen={showCP3BankPopup}
          onClose={() => setShowCP3BankPopup(false)}
          editRow={editRow}
          username={username}
          officeData={officeData}
          establishmentMap={establishmentMap}
          onRefresh={onRefresh}
          onSuccess={onSuccess}
        />
      )}

      {/* Income Tax Letter Popup */}
      {showIncomeTaxLetterPopup && (
        <IncomeTaxLetterPopup
          isOpen={showIncomeTaxLetterPopup}
          onClose={() => setShowIncomeTaxLetterPopup(false)}
          editRow={editRow}
          username={username}
          officeData={officeData}
          establishmentMap={establishmentMap}
          onRefresh={onRefresh}
          onSuccess={onSuccess}
        />
      )}

      {/* OLD ESTA LETTER Popup - DISABLED */}
      {false && showEstaLetterPopup && (
        <div 
          className="popup-backdrop" 
          onClick={(e) => {
            if (e.target === e.currentTarget && !estaLetterLoading) {
              setShowEstaLetterPopup(false);
            }
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div 
            className="popup-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ 
                margin: '0 0 10px 0', 
                color: '#333',
                fontSize: '24px',
                fontWeight: '600'
              }}>
                🏢 Generate ESTA LETTER
              </h2>
              <p style={{ 
                margin: '0', 
                color: '#666', 
                fontSize: '14px' 
              }}>
                Enter details for ESTA letter generation
              </p>
            </div>

            {/* Date */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Date: *
              </label>
              <input
                type="date"
                value={estaLetterDate}
                onChange={(e) => setEstaLetterDate(e.target.value)}
                required
                disabled={estaLetterLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {/* ESTA CODE (read-only) */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                ESTA CODE:
              </label>
              <input
                type="text"
                value={editRow?.ESTA_CODE || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  background: '#f5f5f5',
                  color: '#666',
                }}
              />
            </div>

            {/* ESTA NAME (read-only) */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                ESTA NAME:
              </label>
              <input
                type="text"
                value={editRow?.ESTA_NAME || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  background: '#f5f5f5',
                  color: '#666',
                }}
              />
            </div>

            {/* ESTA ADDRESS (editable) */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                ESTA ADDRESS: *
              </label>
              <textarea
                value={estaLetterAddress}
                onChange={(e) => setEstaLetterAddress(e.target.value)}
                required
                disabled={estaLetterLoading}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {/* Employer Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Employer Name: *
              </label>
              {estaLetterSavedEmployerNames.length > 0 && (
                <select
                  value={estaLetterEmployerName}
                  onChange={(e) => setEstaLetterEmployerName(e.target.value)}
                  disabled={estaLetterLoading}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    background: 'white',
                  }}
                >
                  <option value="">Select saved employer name...</option>
                  {estaLetterSavedEmployerNames.map((name, idx) => (
                    <option key={idx} value={name}>{name}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                value={estaLetterEmployerName}
                onChange={(e) => setEstaLetterEmployerName(e.target.value)}
                required
                disabled={estaLetterLoading}
                placeholder="Enter employer name"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {/* Subject */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Subject: *
              </label>
              <input
                type="text"
                value={estaLetterSubject}
                onChange={(e) => setEstaLetterSubject(e.target.value)}
                required
                disabled={estaLetterLoading}
                placeholder="e.g., Recovery of Outstanding Dues"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {/* Letter Body Prompt */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Letter Body Prompt (Optional - AI Generated):
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <textarea
                  value={estaLetterPrompt}
                  onChange={(e) => setEstaLetterPrompt(e.target.value)}
                  disabled={estaLetterLoading || estaLetterGenerating}
                  rows={3}
                  placeholder="e.g., Write a formal letter requesting payment of outstanding EPFO dues of ₹50,000..."
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    transition: 'border-color 0.3s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#ddd'}
                />
                <button
                  onClick={handleGenerateLetterBody}
                  disabled={estaLetterLoading || estaLetterGenerating || !estaLetterPrompt.trim()}
                  style={{
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: 'none',
                    borderRadius: '8px',
                    background: (estaLetterLoading || estaLetterGenerating || !estaLetterPrompt.trim()) 
                      ? '#ccc' 
                      : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    color: 'white',
                    cursor: (estaLetterLoading || estaLetterGenerating || !estaLetterPrompt.trim()) 
                      ? 'not-allowed' 
                      : 'pointer',
                    whiteSpace: 'nowrap',
                    alignSelf: 'flex-start',
                    transition: 'all 0.3s',
                    boxShadow: (estaLetterLoading || estaLetterGenerating || !estaLetterPrompt.trim()) 
                      ? 'none' 
                      : '0 2px 8px rgba(79, 172, 254, 0.3)',
                  }}
                  title="Generate letter body using AI"
                >
                  {estaLetterGenerating ? '⏳ Generating...' : '✨ Generate'}
                </button>
              </div>
              <p style={{ 
                marginTop: '6px', 
                fontSize: '12px', 
                color: '#666',
                fontStyle: 'italic'
              }}>
                Enter a prompt describing what you want in the letter. The AI will generate the letter body automatically.
              </p>
            </div>

            {/* Letter Body */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Letter Body: *
              </label>
              <textarea
                value={estaLetterBody}
                onChange={(e) => setEstaLetterBody(e.target.value)}
                required
                disabled={estaLetterLoading}
                rows={10}
                placeholder="Enter the full letter content or generate it using the prompt above..."
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {/* Remark Field */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Remark (Optional):
              </label>
              <textarea
                value={estaLetterRemark}
                onChange={(e) => setEstaLetterRemark(e.target.value)}
                placeholder="Enter remark to be added to REMARKS field..."
                disabled={estaLetterLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  minHeight: '80px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.3s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {/* Regional Office (read-only) */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500',
                color: '#333',
                fontSize: '14px'
              }}>
                Regional Office:
              </label>
              <input
                type="text"
                value={officeData?.regional_office_name || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  background: '#f5f5f5',
                  color: '#666',
                }}
              />
            </div>

            {/* Error Message */}
            {estaLetterError && (
              <div style={{ marginBottom: '20px', padding: '12px', background: '#fee', border: '1px solid #fcc', borderRadius: '6px', color: '#c33', fontSize: '14px' }}>
                ⚠️ {estaLetterError}
              </div>
            )}

            {/* Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => {
                  if (!estaLetterLoading) {
                    setShowEstaLetterPopup(false);
                    setEstaLetterError('');
                  }
                }}
                disabled={estaLetterLoading}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#666',
                  cursor: estaLetterLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  opacity: estaLetterLoading ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateEstaLetter}
                disabled={estaLetterLoading || !estaLetterDate || !estaLetterEmployerName || !estaLetterSubject || !estaLetterBody || !estaLetterAddress}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  border: 'none',
                  borderRadius: '8px',
                  background: estaLetterLoading || !estaLetterDate || !estaLetterEmployerName || !estaLetterSubject || !estaLetterBody || !estaLetterAddress
                    ? '#ccc' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  cursor: estaLetterLoading || !estaLetterDate || !estaLetterEmployerName || !estaLetterSubject || !estaLetterBody || !estaLetterAddress ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: estaLetterLoading || !estaLetterDate || !estaLetterEmployerName || !estaLetterSubject || !estaLetterBody || !estaLetterAddress
                    ? 'none' 
                    : '0 4px 12px rgba(102, 126, 234, 0.4)',
                }}
              >
                {estaLetterLoading ? '⏳ Generating...' : '📄 Generate Letter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RRCTable;
