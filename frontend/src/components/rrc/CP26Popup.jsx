import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/api.js';
import logger from '../../utils/logger.js';
import { formatDateForInput } from '../../utils/date.util.js';

// Local helper: format date for remarks (DD-MM-YYYY)
const formatDateForRemarkLocal = (dateValue) => {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return '';
  }
};

// Local helper: calculate scheduled date (25 days after notice date, skipping weekends)
const calculateScheduledDateLocal = (noticeDate) => {
  if (!noticeDate) return '';

  try {
    const date = new Date(noticeDate);
    if (isNaN(date.getTime())) return '';

    // Add 25 days
    date.setDate(date.getDate() + 25);

    // Skip weekends (Saturday = 6, Sunday = 0)
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (err) {
    logger.error('CP26Popup: Error calculating scheduled date:', err);
    return '';
  }
};

// Backdrop and container styles (no backdropFilter for performance)
const POPUP_BACKDROP_STYLE = {
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
};

const POPUP_CONTAINER_STYLE = {
  background: 'white',
  borderRadius: '12px',
  padding: '30px',
  maxWidth: '600px',
  width: '90%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
  animation: 'slideUp 0.3s ease-out',
};

/**
 * CP26Popup
 * Isolates all CP-26 popup state and logic from RRCTable to reduce re-renders.
 */
function CP26Popup({
  isOpen,
  onClose,
  editRow,
  username,
  officeData,
  onRefresh,
  onSuccess,
}) {
  if (!isOpen || !editRow || !username) {
    return null;
  }

  const [state, setState] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      noticeDate: today,
      policeStationAddress: '',
      policeStationDistrict: '',
      policeStationPinCode: '',
      scheduledDate: '',
      showCauseRef: '',
      previousHearingDates: '',
      deputyPoliceCommissionerAddress: '',
      enforcementOfficer: '',
      remark: '',
      savedPoliceStationAddresses: [],
      savedDeputyPoliceCommissionerAddresses: [],
      selectedPoliceStationAddress: '',
      selectedDeputyPoliceCommissionerAddress: '',
      loading: false,
      error: '',
    };
  });

  // Refs for inputs that change often
  const policeStationAddressRef = useRef('');
  const policeStationDistrictRef = useRef('');
  const policeStationPinCodeRef = useRef('');
  const deputyPoliceCommissionerAddressRef = useRef('');

  const updateState = (patch) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  // Fetch Enforcement Officer by PIN CODE
  const fetchEnforcementOfficerByPinCode = async (pinCode) => {
    if (!pinCode || !pinCode.trim() || !username) {
      updateState({ enforcementOfficer: '' });
      return;
    }

    try {
      const response = await api.get('/rrc', { params: { username } });
      if (response.data.success) {
        const rrcs = response.data.data || [];
        const rrcWithPin = rrcs.find(
          (rrc) => rrc.PIN_CD && rrc.PIN_CD.trim() === pinCode.trim() && rrc.ENFORCEMENT_OFFICER
        );
        if (rrcWithPin) {
          updateState({ enforcementOfficer: rrcWithPin.ENFORCEMENT_OFFICER });
        } else {
          updateState({ enforcementOfficer: '' });
        }
      }
    } catch (err) {
      logger.error('CP26Popup: Error fetching enforcement officer:', err);
      updateState({ enforcementOfficer: '' });
    }
  };

  // Load saved addresses from localStorage
  const loadSavedAddresses = () => {
    if (!editRow || !editRow.ESTA_CODE) return;

    const policeStationKey = `cp26_police_station_${editRow.ESTA_CODE}`;
    const deputyPoliceKey = `cp26_deputy_police_${editRow.ESTA_CODE}`;

    const savedPoliceStation = JSON.parse(localStorage.getItem(policeStationKey) || '[]');
    const savedDeputyPolice = JSON.parse(localStorage.getItem(deputyPoliceKey) || '[]');

    updateState({
      savedPoliceStationAddresses: savedPoliceStation,
      savedDeputyPoliceCommissionerAddresses: savedDeputyPolice,
    });

    // Restore last selected addresses
    const lastPoliceStationKey = `cp26_last_police_station_${editRow.ESTA_CODE}`;
    const lastDeputyPoliceKey = `cp26_last_deputy_police_${editRow.ESTA_CODE}`;

    const lastPoliceStation = localStorage.getItem(lastPoliceStationKey);
    const lastDeputyPolice = localStorage.getItem(lastDeputyPoliceKey);

    if (lastPoliceStation && savedPoliceStation.includes(lastPoliceStation)) {
      updateState({
        policeStationAddress: lastPoliceStation,
        selectedPoliceStationAddress: lastPoliceStation,
      });
    } else if (savedPoliceStation.length > 0) {
      updateState({
        policeStationAddress: savedPoliceStation[0],
        selectedPoliceStationAddress: savedPoliceStation[0],
      });
    }

    if (lastDeputyPolice && savedDeputyPolice.includes(lastDeputyPolice)) {
      updateState({
        deputyPoliceCommissionerAddress: lastDeputyPolice,
        selectedDeputyPoliceCommissionerAddress: lastDeputyPolice,
      });
    } else if (savedDeputyPolice.length > 0) {
      updateState({
        deputyPoliceCommissionerAddress: savedDeputyPolice[0],
        selectedDeputyPoliceCommissionerAddress: savedDeputyPolice[0],
      });
    }
  };

  // Save address to localStorage
  const saveAddress = (addressType, address) => {
    if (!editRow || !editRow.ESTA_CODE || !address || !address.trim()) return;

    const key = addressType === 'policeStation'
      ? `cp26_police_station_${editRow.ESTA_CODE}`
      : `cp26_deputy_police_${editRow.ESTA_CODE}`;

    const savedAddresses = JSON.parse(localStorage.getItem(key) || '[]');
    const trimmedAddress = address.trim();

    if (!savedAddresses.includes(trimmedAddress)) {
      savedAddresses.unshift(trimmedAddress);
      if (savedAddresses.length > 10) {
        savedAddresses.pop();
      }
      localStorage.setItem(key, JSON.stringify(savedAddresses));

      if (addressType === 'policeStation') {
        updateState({
          savedPoliceStationAddresses: savedAddresses,
          selectedPoliceStationAddress: trimmedAddress,
          policeStationAddress: trimmedAddress,
        });
        const lastKey = `cp26_last_police_station_${editRow.ESTA_CODE}`;
        localStorage.setItem(lastKey, trimmedAddress);
      } else {
        updateState({
          savedDeputyPoliceCommissionerAddresses: savedAddresses,
          selectedDeputyPoliceCommissionerAddress: trimmedAddress,
          deputyPoliceCommissionerAddress: trimmedAddress,
        });
        const lastKey = `cp26_last_deputy_police_${editRow.ESTA_CODE}`;
        localStorage.setItem(lastKey, trimmedAddress);
      }
    }
  };

  // Initialize on open
  useEffect(() => {
    if (!isOpen) return;

    const today = new Date().toISOString().split('T')[0];
    updateState({
      noticeDate: today,
      policeStationAddress: '',
      policeStationDistrict: '',
      policeStationPinCode: '',
      scheduledDate: '',
      showCauseRef: '',
      previousHearingDates: '',
      deputyPoliceCommissionerAddress: '',
      enforcementOfficer: '',
      remark: '',
      error: '',
    });

    loadSavedAddresses();

    // Set enforcement officer from RRC if available
    if (editRow.PIN_CD) {
      fetchEnforcementOfficerByPinCode(editRow.PIN_CD);
    }
  }, [isOpen, editRow._id]);

  // Auto-calculate scheduled date when notice date changes
  useEffect(() => {
    if (!isOpen || !state.noticeDate) return;

    const calculatedScheduledDate = calculateScheduledDateLocal(state.noticeDate);
    if (calculatedScheduledDate) {
      updateState({ scheduledDate: calculatedScheduledDate });
    }
  }, [isOpen, state.noticeDate]);

  // Auto-generate remark (debounced) when notice date changes
  useEffect(() => {
    if (!isOpen || !state.noticeDate) return;

    const timeoutId = setTimeout(() => {
      const formattedDate = formatDateForRemarkLocal(state.noticeDate);
      updateState({
        remark: `${formattedDate} - CP-26 issued`,
      });
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [isOpen, state.noticeDate]);

  // Watch PIN code changes for enforcement officer
  useEffect(() => {
    if (!isOpen) return;
    if (state.policeStationPinCode && state.policeStationPinCode.trim()) {
      fetchEnforcementOfficerByPinCode(state.policeStationPinCode);
    } else {
      updateState({ enforcementOfficer: '' });
    }
  }, [isOpen, state.policeStationPinCode]);

  // Generate CP-26 notice
  const handleGenerate = async (isAEO = false) => {
    if (!editRow || !username || !state.noticeDate) {
      updateState({ error: 'Please enter notice date' });
      return;
    }

    if (!state.policeStationAddress || !state.policeStationAddress.trim()) {
      updateState({ error: 'Please enter police station address' });
      return;
    }

    if (!state.scheduledDate) {
      updateState({ error: 'Please enter scheduled date' });
      return;
    }

    if (!state.showCauseRef || !state.showCauseRef.trim()) {
      updateState({ error: 'Please enter show cause notice reference & date' });
      return;
    }

    if (!state.previousHearingDates || !state.previousHearingDates.trim()) {
      updateState({ error: 'Please enter previous hearing dates' });
      return;
    }

    if (!state.deputyPoliceCommissionerAddress || !state.deputyPoliceCommissionerAddress.trim()) {
      updateState({ error: 'Please enter deputy police commissioner address' });
      return;
    }

    const enforcementOfficerName = state.enforcementOfficer || editRow.ENFORCEMENT_OFFICER || '';

    // Save addresses
    if (state.policeStationAddress.trim()) {
      saveAddress('policeStation', state.policeStationAddress);
    }
    if (state.deputyPoliceCommissionerAddress.trim()) {
      saveAddress('deputyPoliceCommissioner', state.deputyPoliceCommissionerAddress);
    }

    // Ask about remark
    let finalRemark = '';
    const addRemark = window.confirm('Do you want to add a remark to RRC data?');
    if (addRemark) {
      if (state.remark && state.remark.trim()) {
        finalRemark = state.remark.trim();
      } else {
        const remarkInput = window.prompt('Enter remark to be added to REMARKS field:', '');
        if (remarkInput === null) return;
        finalRemark = remarkInput.trim();
      }
    }

    try {
      updateState({ loading: true, error: '' });

      const response = await api.post(
        '/notices/cp26/generate',
        {
          username,
          estaCode: editRow.ESTA_CODE,
          rrcNo: editRow.RRC_NO,
          noticeDate: state.noticeDate,
          policeStationAddress: state.policeStationAddress.trim(),
          scheduledDate: state.scheduledDate,
          showCauseRef: state.showCauseRef.trim(),
          previousHearingDates: state.previousHearingDates.trim(),
          deputyPoliceCommissionerAddress: state.deputyPoliceCommissionerAddress.trim(),
          regionalOfficeName: officeData?.regional_office_name || '',
          enforcementOfficer: enforcementOfficerName,
          isAEO: isAEO,
          remark: finalRemark,
        },
        { responseType: 'blob' }
      );

      // Download file
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

      // Close and notify
      if (onRefresh) onRefresh();
      if (onSuccess) {
        onSuccess(`CP-26 ${isAEO ? 'AEO ' : ''}notice generated and downloaded successfully!`);
      }
      handleCancel();
    } catch (err) {
      logger.error('CP26Popup: CP-26 generation failed', err);
      updateState({
        error: err.response?.data?.message || err.message || 'Failed to generate CP-26 notice',
      });
    } finally {
      updateState({ loading: false });
    }
  };

  const handleCancel = () => {
    if (state.loading) return;
    updateState({
      noticeDate: '',
      policeStationAddress: '',
      scheduledDate: '',
      showCauseRef: '',
      previousHearingDates: '',
      deputyPoliceCommissionerAddress: '',
      error: '',
    });
    onClose();
  };

  const portalRoot = document.getElementById('popup-root');
  if (!portalRoot) return null;

  return createPortal(
    <div
      style={POPUP_BACKDROP_STYLE}
      onClick={(e) => {
        if (e.target === e.currentTarget && !state.loading) {
          handleCancel();
        }
      }}
    >
      <div style={POPUP_CONTAINER_STYLE} onClick={(e) => e.stopPropagation()}>
        <div style={{ marginBottom: '20px' }}>
          <h2
            style={{
              margin: '0 0 10px 0',
              color: '#333',
              fontSize: '24px',
              fontWeight: '600',
            }}
          >
            📄 Generate CP-26 Warrant of Arrest Notice
          </h2>
          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
            Enter details for CP-26 notice generation
          </p>
        </div>

        {/* Notice Date */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333',
              fontSize: '14px',
            }}
          >
            CP-26 Notice Date: *
          </label>
          <input
            type="date"
            value={state.noticeDate}
            onChange={(e) => updateState({ noticeDate: e.target.value })}
            required
            disabled={state.loading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Police Station Address */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333',
              fontSize: '14px',
            }}
          >
            Police Station Address: *
          </label>
          {state.savedPoliceStationAddresses.length > 0 && (
            <select
              value={state.selectedPoliceStationAddress}
              onChange={(e) => {
                updateState({
                  selectedPoliceStationAddress: e.target.value,
                  policeStationAddress: e.target.value,
                });
              }}
              disabled={state.loading}
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
              {state.savedPoliceStationAddresses.map((addr, idx) => (
                <option key={idx} value={addr}>
                  {addr.length > 100 ? addr.substring(0, 100) + '...' : addr}
                </option>
              ))}
            </select>
          )}
          <textarea
            value={state.policeStationAddress}
            onChange={(e) => {
              const value = e.target.value;
              policeStationAddressRef.current = value;
              updateState({ policeStationAddress: value });
            }}
            required
            disabled={state.loading}
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
              marginBottom: '10px',
            }}
          />
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  color: '#333',
                  fontSize: '13px',
                }}
              >
                District:
              </label>
              <input
                type="text"
                value={state.policeStationDistrict}
                onChange={(e) => {
                  const value = e.target.value;
                  policeStationDistrictRef.current = value;
                  updateState({ policeStationDistrict: value });
                }}
                disabled={state.loading}
                placeholder="Enter district"
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  color: '#333',
                  fontSize: '13px',
                }}
              >
                PIN Code (optional):
              </label>
              <input
                type="text"
                value={state.policeStationPinCode}
                onChange={(e) => {
                  const value = e.target.value;
                  policeStationPinCodeRef.current = value;
                  updateState({ policeStationPinCode: value });
                }}
                disabled={state.loading}
                placeholder="Enter PIN code"
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '4px',
              marginBottom: '10px',
            }}
          >
            <label
              style={{
                fontWeight: '500',
                color: '#333',
                fontSize: '13px',
                minWidth: '140px',
              }}
            >
              Enforcement Officer:
            </label>
            <input
              type="text"
              value={state.enforcementOfficer || 'Not assigned'}
              disabled
              style={{
                padding: '10px',
                fontSize: '14px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                background: state.enforcementOfficer ? '#e8f5e9' : '#fff3cd',
                color: state.enforcementOfficer ? '#2e7d32' : '#856404',
                fontFamily: 'monospace',
                flex: 1,
                fontWeight: state.enforcementOfficer ? '500' : 'normal',
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              let addressToSave = state.policeStationAddress.trim();
              if (state.policeStationDistrict && state.policeStationDistrict.trim()) {
                addressToSave += `\n${state.policeStationDistrict.trim()}`;
              }
              if (state.policeStationPinCode && state.policeStationPinCode.trim()) {
                if (state.policeStationDistrict && state.policeStationDistrict.trim()) {
                  addressToSave += ` - ${state.policeStationPinCode.trim()}`;
                } else {
                  addressToSave += `\n${state.policeStationPinCode.trim()}`;
                }
              }
              if (addressToSave.trim()) {
                saveAddress('policeStation', addressToSave);
                if (onSuccess) {
                  onSuccess('Police Station Address saved!');
                }
              }
            }}
            disabled={state.loading || !state.policeStationAddress || !state.policeStationAddress.trim()}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              fontWeight: '500',
              background:
                state.loading || !state.policeStationAddress || !state.policeStationAddress.trim()
                  ? '#ccc'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor:
                state.loading || !state.policeStationAddress || !state.policeStationAddress.trim()
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            💾 Save Police Station Address
          </button>
        </div>

        {/* Scheduled Date */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333',
              fontSize: '14px',
            }}
          >
            Scheduled Date: * (Auto-calculated: 25 days after notice date, skipping weekends)
          </label>
          <input
            type="date"
            value={state.scheduledDate}
            onChange={(e) => updateState({ scheduledDate: e.target.value })}
            required
            disabled={state.loading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Show Cause Notice Reference */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333',
              fontSize: '14px',
            }}
          >
            Show Cause Notice Reference & date: *
          </label>
          <input
            type="text"
            value={state.showCauseRef}
            onChange={(e) => updateState({ showCauseRef: e.target.value })}
            required
            disabled={state.loading}
            placeholder="e.g., CP-25/123/2024 dated 01-01-2024"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Previous Hearing Dates */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333',
              fontSize: '14px',
            }}
          >
            Previous Hearing Dates: *
          </label>
          <textarea
            value={state.previousHearingDates}
            onChange={(e) => updateState({ previousHearingDates: e.target.value })}
            required
            disabled={state.loading}
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
            }}
          />
        </div>

        {/* Deputy Police Commissioner Address */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333',
              fontSize: '14px',
            }}
          >
            Deputy Police Commissioner Address: *
          </label>
          {state.savedDeputyPoliceCommissionerAddresses.length > 0 && (
            <select
              value={state.selectedDeputyPoliceCommissionerAddress}
              onChange={(e) => {
                updateState({
                  selectedDeputyPoliceCommissionerAddress: e.target.value,
                  deputyPoliceCommissionerAddress: e.target.value,
                });
              }}
              disabled={state.loading}
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
              {state.savedDeputyPoliceCommissionerAddresses.map((addr, idx) => (
                <option key={idx} value={addr}>
                  {addr.length > 100 ? addr.substring(0, 100) + '...' : addr}
                </option>
              ))}
            </select>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <textarea
              value={state.deputyPoliceCommissionerAddress}
              onChange={(e) => {
                const value = e.target.value;
                deputyPoliceCommissionerAddressRef.current = value;
                updateState({ deputyPoliceCommissionerAddress: value });
              }}
              required
              disabled={state.loading}
              rows={3}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '14px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (state.deputyPoliceCommissionerAddress && state.deputyPoliceCommissionerAddress.trim()) {
                  saveAddress('deputyPoliceCommissioner', state.deputyPoliceCommissionerAddress);
                  if (onSuccess) {
                    onSuccess('Deputy Police Commissioner Address saved!');
                  }
                }
              }}
              disabled={state.loading || !state.deputyPoliceCommissionerAddress || !state.deputyPoliceCommissionerAddress.trim()}
              style={{
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: '500',
                background:
                  state.loading || !state.deputyPoliceCommissionerAddress || !state.deputyPoliceCommissionerAddress.trim()
                    ? '#ccc'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor:
                  state.loading || !state.deputyPoliceCommissionerAddress || !state.deputyPoliceCommissionerAddress.trim()
                    ? 'not-allowed'
                    : 'pointer',
                whiteSpace: 'nowrap',
                alignSelf: 'flex-start',
              }}
            >
              💾 Save
            </button>
          </div>
        </div>

        {/* Remark */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333',
              fontSize: '14px',
            }}
          >
            Remark (Optional):
          </label>
          <textarea
            value={state.remark}
            onChange={(e) => updateState({ remark: e.target.value })}
            placeholder="Enter remark to be added to REMARKS field..."
            disabled={state.loading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              boxSizing: 'border-box',
              minHeight: '80px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Error */}
        {state.error && (
          <div
            style={{
              marginBottom: '15px',
              padding: '12px',
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '6px',
              color: '#c33',
              fontSize: '14px',
            }}
          >
            ⚠️ {state.error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            disabled={state.loading}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              border: '2px solid #ddd',
              borderRadius: '8px',
              background: 'white',
              color: '#666',
              cursor: state.loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => handleGenerate(false)}
            disabled={
              state.loading ||
              !state.noticeDate ||
              !state.policeStationAddress ||
              !state.scheduledDate ||
              !state.showCauseRef ||
              !state.previousHearingDates ||
              !state.deputyPoliceCommissionerAddress
            }
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              border: 'none',
              borderRadius: '8px',
              background:
                state.loading ||
                !state.noticeDate ||
                !state.policeStationAddress ||
                !state.scheduledDate ||
                !state.showCauseRef ||
                !state.previousHearingDates ||
                !state.deputyPoliceCommissionerAddress
                  ? '#ccc'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              cursor:
                state.loading ||
                !state.noticeDate ||
                !state.policeStationAddress ||
                !state.scheduledDate ||
                !state.showCauseRef ||
                !state.previousHearingDates ||
                !state.deputyPoliceCommissionerAddress
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {state.loading ? '⏳ Generating...' : '📥 CP-26'}
          </button>
          <button
            onClick={() => handleGenerate(true)}
            disabled={
              state.loading ||
              !state.noticeDate ||
              !state.policeStationAddress ||
              !state.scheduledDate ||
              !state.showCauseRef ||
              !state.previousHearingDates ||
              !state.deputyPoliceCommissionerAddress
            }
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              border: 'none',
              borderRadius: '8px',
              background:
                state.loading ||
                !state.noticeDate ||
                !state.policeStationAddress ||
                !state.scheduledDate ||
                !state.showCauseRef ||
                !state.previousHearingDates ||
                !state.deputyPoliceCommissionerAddress
                  ? '#ccc'
                  : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              cursor:
                state.loading ||
                !state.noticeDate ||
                !state.policeStationAddress ||
                !state.scheduledDate ||
                !state.showCauseRef ||
                !state.previousHearingDates ||
                !state.deputyPoliceCommissionerAddress
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {state.loading ? '⏳ Generating...' : '📥 CP-26 Through Area EO'}
          </button>
        </div>
      </div>
    </div>,
    portalRoot
  );
}

export default CP26Popup;

