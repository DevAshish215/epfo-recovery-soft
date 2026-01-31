import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/api.js';
import logger from '../../utils/logger.js';
import { formatDateForInput } from '../../utils/date.util.js';

// Format ESTA address from RRC/Establishment-style data
const formatEstaAddressFromRow = (row, establishment) => {
  if (!row) return '';
  const add1 = (establishment?.ADD1 || row.ADD1 || '').trim();
  const add2 = (establishment?.ADD2 || row.ADD2 || '').trim();
  const city = (establishment?.CITY || row.CITY || '').trim();
  const dist = (establishment?.DIST || row.DIST || '').trim();
  const pinCd = (establishment?.PIN_CODE || row.PIN_CD || '').trim();

  const parts = [];
  if (add1) parts.push(add1);
  if (add2 && add2 !== add1) parts.push(add2);
  if (city) parts.push(city);

  const locationParts = [];
  if (dist) locationParts.push(dist);
  if (pinCd) {
    if (locationParts.length > 0) {
      parts.push(`${locationParts.join(' & ')} - ${pinCd}`);
    } else {
      parts.push(pinCd);
    }
  } else if (locationParts.length > 0) {
    parts.push(locationParts.join(' & '));
  }

  return parts.join('\n');
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
  maxWidth: '800px',
  width: '90%',
  maxHeight: '90vh',
  overflowY: 'auto',
  position: 'relative',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
  animation: 'slideUp 0.3s ease-out',
};

/**
 * EstaLetterPopup
 * Isolates all ESTA letter popup state and logic from RRCTable to reduce re-renders.
 */
function EstaLetterPopup({
  isOpen,
  onClose,
  editRow,
  username,
  officeData,
  establishmentMap,
  onRefresh,
  onSuccess,
}) {
  const DEFAULT_LETTER_PROMPT =
    'Generate the content in this exact structure only:\n' +
    'subject: <one subject line>\n\n' +
    'Sir/Madam,\n' +
    '    <letter body in 2–3 short paragraphs>\n' +
    'Do not add addresses, headings, signatures, dates, or any other parts of the letter.\n\n';
  if (!isOpen || !editRow || !username) {
    return null;
  }

  const establishment = establishmentMap?.[editRow.ESTA_CODE];

  const [state, setState] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      date: today,
      employerName: '',
      subject: '',
      letterBody: '',
      prompt: DEFAULT_LETTER_PROMPT,
      remark: '',
      savedEmployerNames: [],
      addressMode: 'existing', // 'existing' | 'saved' | 'new'
      savedAddresses: [],
      selectedSavedAddressId: '',
      newAddress: '',
      newPinCode: '',
      enforcementOfficer: '',
      loading: false,
      generating: false,
      error: '',
    };
  });

  // Refs for inputs that change often
  const employerNameRef = useRef('');
  const subjectRef = useRef('');
  const letterBodyRef = useRef('');
  const promptRef = useRef('');
  const newAddressRef = useRef('');
  const newPinCodeRef = useRef('');

  const updateState = (patch) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  // Derived helpers for existing address (from editRow/establishment)
  const existingAddress = useMemo(() => {
    const add1 = (establishment?.ADD1 || editRow.ADD1 || '').trim();
    const add2 = (establishment?.ADD2 || editRow.ADD2 || '').trim();
    const city = (establishment?.CITY || editRow.CITY || '').trim();
    const dist = (establishment?.DIST || editRow.DIST || '').trim();
    const pinCd = (establishment?.PIN_CODE || editRow.PIN_CD || '').trim();

    const parts = [];
    if (add1) parts.push(add1);
    if (add2 && add2 !== add1) parts.push(add2);
    if (city) parts.push(city);

    const locationParts = [];
    if (dist) locationParts.push(dist);
    if (pinCd) {
      if (locationParts.length > 0) {
        parts.push(`${locationParts.join(' & ')} - ${pinCd}`);
      } else {
        parts.push(pinCd);
      }
    } else if (locationParts.length > 0) {
      parts.push(locationParts.join(' & '));
    }

    return parts.join('\n');
  }, [editRow.ADD1, editRow.ADD2, editRow.CITY, editRow.DIST, editRow.PIN_CD, establishment]);

  // Load saved employer names
  const loadSavedEmployerNames = async () => {
    if (!editRow || !username) return;

    try {
      const response = await api.get(`/employer-address/${editRow.ESTA_CODE}/names`, {
        params: { username },
      });

      if (response.data.success) {
        const names = response.data.data || [];
        updateState({ savedEmployerNames: names });
      }
    } catch (err) {
      logger.error('EstaLetterPopup: Error loading saved employer names:', err);
      updateState({ savedEmployerNames: [] });
    }
  };

  // Load saved employer addresses
  const loadSavedEmployerAddresses = async () => {
    if (!editRow || !username) return [];

    try {
      const response = await api.get(`/employer-address/${editRow.ESTA_CODE}`, {
        params: { username },
      });

      if (response.data.success) {
        const addresses = response.data.data || [];
        updateState({ savedAddresses: addresses });
        return addresses;
      }
      return [];
    } catch (err) {
      logger.error('EstaLetterPopup: Error loading saved employer addresses:', err);
      updateState({ savedAddresses: [] });
      return [];
    }
  };

  // Save employer name only
  const handleSaveEmployerNameOnly = async () => {
    if (!editRow || !username) {
      updateState({ error: 'Invalid request' });
      return;
    }

    const name = (state.employerName || '').trim();
    if (!name) {
      updateState({ error: 'Please enter employer name to save' });
      return;
    }

    try {
      updateState({ loading: true, error: '' });
      const response = await api.post('/employer-address', {
        username,
        estaCode: editRow.ESTA_CODE,
        employerName: name,
        address: '',
        pinCode: '',
      });

      if (response.data.success) {
        await loadSavedEmployerNames();
        if (onSuccess) {
          onSuccess('Employer name saved successfully!');
        }
      }
    } catch (err) {
      logger.error('EstaLetterPopup: Error saving employer name:', err);
      updateState({
        error: err.response?.data?.message || 'Failed to save employer name',
      });
    } finally {
      updateState({ loading: false });
    }
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
      logger.error('EstaLetterPopup: Error fetching enforcement officer:', err);
      updateState({ enforcementOfficer: '' });
    }
  };

  // Save address only (existing/saved/new) to employer-address collection
  const handleSaveAddressOnly = async () => {
    if (!editRow || !username) {
      updateState({ error: 'Invalid request' });
      return;
    }

    let currentAddress = '';
    let currentPinCode = '';

    if (state.addressMode === 'existing') {
      currentAddress = existingAddress;
      // Extract PIN from editRow
      currentPinCode = editRow.PIN_CD || establishment?.PIN_CODE || '';
    } else if (state.addressMode === 'saved') {
      const saved = state.savedAddresses.find(
        (addr) => addr._id === state.selectedSavedAddressId,
      );
      if (saved) {
        currentAddress = saved.address;
        currentPinCode = saved.pinCode || '';
      }
    } else if (state.addressMode === 'new') {
      currentAddress = newAddressRef.current.trim();
      currentPinCode = newPinCodeRef.current.trim();
      if (!currentPinCode) {
        updateState({ error: 'Please enter PIN CODE for new address' });
        return;
      }
    }

    if (!currentAddress || currentAddress.trim() === '') {
      updateState({ error: 'Please select or enter an address to save' });
      return;
    }

    try {
      updateState({ loading: true, error: '' });
      let addressWithoutPin = currentAddress.trim();
      let extractedPinCode = currentPinCode || '';

      // Try to extract PIN code from address if not already provided
      if (!extractedPinCode && addressWithoutPin) {
        const pinMatch = addressWithoutPin.match(/\b\d{6}\b/);
        if (pinMatch) {
          extractedPinCode = pinMatch[0];
          addressWithoutPin = addressWithoutPin.replace(/\b\d{6}\b/, '').trim();
        }
      }

      const response = await api.post('/employer-address', {
        username,
        estaCode: editRow.ESTA_CODE,
        employerName: '',
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
      logger.error('EstaLetterPopup: Error saving address:', err);
      updateState({
        error: err.response?.data?.message || 'Failed to save address',
      });
    } finally {
      updateState({ loading: false });
    }
  };

  // Delete saved address
  const handleDeleteSavedAddress = async (addressId) => {
    if (!editRow || !username || !addressId) {
      updateState({ error: 'Invalid request' });
      return;
    }

    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      updateState({ loading: true, error: '' });
      const response = await api.delete(`/employer-address/${addressId}`, {
        params: { username },
      });

      if (response.data.success) {
        await loadSavedEmployerAddresses();
        if (state.selectedSavedAddressId === addressId) {
          updateState({
            selectedSavedAddressId: '',
            addressMode: 'existing',
          });
        }
        if (onSuccess) {
          onSuccess('Address deleted successfully!');
        }
      }
    } catch (err) {
      logger.error('EstaLetterPopup: Error deleting address:', err);
      updateState({
        error: err.response?.data?.message || 'Failed to delete address',
      });
    } finally {
      updateState({ loading: false });
    }
  };

  // Generate letter body using AI
  const handleGenerateLetterBody = async () => {
    if (!state.prompt.trim()) {
      updateState({ error: 'Please enter a prompt' });
      return;
    }

    if (!editRow || !username) {
      updateState({ error: 'Invalid request' });
      return;
    }

    try {
      updateState({ generating: true, error: '' });

      const response = await api.post('/notices/esta-letter/generate-body', {
        prompt: state.prompt.trim(),
      });

      if (response.data.success) {
        updateState({ letterBody: response.data.data.letterBody });
        if (onSuccess) {
          onSuccess('Letter body generated successfully!');
        }
      }
    } catch (err) {
      logger.error('EstaLetterPopup: Letter body generation failed', err);
      updateState({
        error: err.response?.data?.message || 'Failed to generate letter body. Please try again or write manually.',
      });
    } finally {
      updateState({ generating: false });
    }
  };

  // Generate ESTA letter
  const handleGenerate = async () => {
    if (!editRow || !username) {
      updateState({ error: 'Invalid request' });
      return;
    }

    if (!state.date) {
      updateState({ error: 'Please enter date' });
      return;
    }

    if (!state.employerName || !state.employerName.trim()) {
      updateState({ error: 'Please enter employer name' });
      return;
    }

    if (!state.letterBody || !state.letterBody.trim()) {
      updateState({ error: 'Please enter letter body' });
      return;
    }

    // Prepare selected address based on mode
    let selectedAddress = '';
    if (state.addressMode === 'existing') {
      selectedAddress = existingAddress;
    } else if (state.addressMode === 'saved') {
      const saved = state.savedAddresses.find(
        (addr) => addr._id === state.selectedSavedAddressId,
      );
      if (saved) {
        selectedAddress = saved.address;
        if (saved.pinCode && !selectedAddress.includes(saved.pinCode)) {
          selectedAddress = `${selectedAddress}\n${saved.pinCode}`;
        }
      }
    } else if (state.addressMode === 'new') {
      selectedAddress = newAddressRef.current.trim();
      const pinCode = newPinCodeRef.current.trim();
      if (!pinCode) {
        updateState({ error: 'Please enter PIN CODE for new address' });
        return;
      }
      if (selectedAddress && pinCode) {
        selectedAddress = `${selectedAddress}\n${pinCode}`;
      }
    }

    if (!selectedAddress || !selectedAddress.trim()) {
      updateState({ error: 'Please select or enter ESTA address' });
      return;
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

      const estaName = editRow.ESTA_NAME || establishment?.ESTA_NAME || '';
      const regionalOffice = officeData?.regional_office_name || '';

      const response = await api.post(
        '/notices/esta-letter/generate',
        {
          username,
          estaCode: editRow.ESTA_CODE,
          rrcNo: editRow.RRC_NO,
          date: state.date,
          employerName: state.employerName.trim(),
          estaName,
          estaAddress: selectedAddress.trim(),
          subject: (state.subject || '').trim(),
          letterBody: state.letterBody.trim(),
          regionalOffice,
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

      // Close and notify
      if (onRefresh) onRefresh();
      if (onSuccess) {
        onSuccess('ESTA Letter generated and downloaded successfully!');
      }
      handleCancel();
    } catch (err) {
      logger.error('EstaLetterPopup: ESTA Letter generation failed', err);
      updateState({
        error: err.response?.data?.message || err.message || 'Failed to generate ESTA Letter',
      });
    } finally {
      updateState({ loading: false });
    }
  };

  const handleCancel = () => {
    if (state.loading || state.generating) return;
    updateState({
      date: '',
      employerName: '',
      subject: '',
      letterBody: '',
      prompt: '',
      estaAddress: '',
      error: '',
    });
    onClose();
  };

  // Initialize on open
  useEffect(() => {
    if (!isOpen) return;

    const today = new Date().toISOString().split('T')[0];
    updateState({
      date: today,
      employerName: '',
      subject: '',
      letterBody: '',
      prompt: DEFAULT_LETTER_PROMPT,
      remark: '',
      addressMode: 'existing',
      selectedSavedAddressId: '',
      newAddress: '',
      newPinCode: '',
      enforcementOfficer: '',
      error: '',
    });

    loadSavedEmployerNames();
    loadSavedEmployerAddresses();
  }, [isOpen, editRow._id]);

  // Auto-generate remark (debounced) when date changes - like CP-25
  useEffect(() => {
    if (!isOpen || !state.date) return;

    const timeoutId = setTimeout(() => {
      const formattedDate = state.date
        ? (() => {
            try {
              const date = new Date(state.date);
              if (isNaN(date.getTime())) return '';
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              return `${day}-${month}-${year}`;
            } catch (e) {
              return '';
            }
          })()
        : '';
      if (formattedDate) {
        updateState({
          remark: `${formattedDate} - ESTA Letter issued`,
        });
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [isOpen, state.date]);

  // Watch new PIN code changes for enforcement officer (debounced)
  useEffect(() => {
    if (!isOpen || state.addressMode !== 'new') {
      updateState({ enforcementOfficer: '' });
      return;
    }
    
    if (!state.newPinCode || !state.newPinCode.trim()) {
      updateState({ enforcementOfficer: '' });
      return;
    }

    // Debounce the API call to avoid too many requests while typing
    const timeoutId = setTimeout(() => {
      const pinCode = state.newPinCode.trim();
      if (pinCode && pinCode.length >= 6) {
        fetchEnforcementOfficerByPinCode(pinCode);
      } else {
        updateState({ enforcementOfficer: '' });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [isOpen, state.addressMode, state.newPinCode]);

  const portalRoot = document.getElementById('popup-root');
  if (!portalRoot) return null;

  return createPortal(
    <div
      style={POPUP_BACKDROP_STYLE}
      onClick={(e) => {
        if (e.target === e.currentTarget && !state.loading && !state.generating) {
          handleCancel();
        }
      }}
    >
      <div style={POPUP_CONTAINER_STYLE} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            marginBottom: '20px',
            position: 'sticky',
            top: 0,
            background: 'white',
            zIndex: 1,
          }}
        >
          {/* Top-right close (X) button */}
          <button
            type="button"
            onClick={handleCancel}
            disabled={state.loading || state.generating}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: '-10px',
              right: '-10px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: '#eee',
              color: '#555',
              fontSize: '18px',
              fontWeight: '600',
              cursor:
                state.loading || state.generating ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
            }}
          >
            ×
          </button>
          <h2
            style={{
              margin: '0 0 10px 0',
              color: '#333',
              fontSize: '24px',
              fontWeight: '600',
            }}
          >
            🏢 Generate ESTA LETTER
          </h2>
          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
            Enter details for ESTA letter generation
          </p>
        </div>

        <div>
          {/* Date */}
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
            Date: *
          </label>
          <input
            type="date"
            value={state.date}
            onChange={(e) => updateState({ date: e.target.value })}
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

          {/* ESTA CODE (read-only) */}
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
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '500',
              color: '#333',
              fontSize: '14px',
            }}
          >
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

          {/* ESTA ADDRESS for this letter (select / enter / save) */}
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
            ESTA ADDRESS: *
          </label>

          {/* Address mode selector */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '10px',
              fontSize: '13px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="radio"
                name="esta_address_mode"
                value="existing"
                checked={state.addressMode === 'existing'}
                onChange={() => updateState({ addressMode: 'existing' })}
                disabled={state.loading}
              />
              <span>Use existing ESTA address (from RRC)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="radio"
                name="esta_address_mode"
                value="saved"
                checked={state.addressMode === 'saved'}
                onChange={() => updateState({ addressMode: 'saved' })}
                disabled={state.loading || !state.savedAddresses.length}
              />
              <span>Use saved address</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="radio"
                name="esta_address_mode"
                value="new"
                checked={state.addressMode === 'new'}
                onChange={() => updateState({ addressMode: 'new' })}
                disabled={state.loading}
              />
              <span>Enter new address</span>
            </label>
          </div>

          {/* Existing address preview */}
          {state.addressMode === 'existing' && (
            <textarea
              value={existingAddress}
              readOnly
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '13px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'monospace',
                whiteSpace: 'pre-line',
                background: '#f9f9f9',
                color: '#555',
                marginBottom: '10px',
              }}
            />
          )}

          {/* Saved addresses list */}
          {state.addressMode === 'saved' && state.savedAddresses.length > 0 && (
            <div
              style={{
                marginBottom: '10px',
                padding: '10px',
                background: '#f0f8ff',
                borderRadius: '8px',
                border: '1px solid #b3d9ff',
                maxHeight: '160px',
                overflowY: 'auto',
                fontSize: '13px',
              }}
            >
              {state.savedAddresses.map((addr) => (
                <div
                  key={addr._id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                    marginBottom: '6px',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '6px',
                      flex: 1,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="esta_saved_address"
                      checked={state.selectedSavedAddressId === addr._id}
                      onChange={() =>
                        updateState({ selectedSavedAddressId: addr._id })
                      }
                      disabled={state.loading}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ whiteSpace: 'pre-line' }}>{addr.address}</div>
                      {addr.pinCode && (
                        <div style={{ color: '#555' }}>PIN: {addr.pinCode}</div>
                      )}
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleDeleteSavedAddress(addr._id)}
                    disabled={state.loading}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      background: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: state.loading ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                    title="Delete this address"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New address input */}
          {state.addressMode === 'new' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                value={state.newAddress}
                onChange={(e) => {
                  const value = e.target.value;
                  newAddressRef.current = value;
                  updateState({ newAddress: value });
                }}
                placeholder="Enter new ESTA address (without PIN)"
                disabled={state.loading || state.generating}
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '13px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
              <input
                type="text"
                value={state.newPinCode}
                onChange={(e) => {
                  const value = e.target.value;
                  newPinCodeRef.current = value;
                  updateState({ newPinCode: value });
                }}
                placeholder="PIN CODE (6 digits)"
                maxLength={6}
                disabled={state.loading || state.generating}
                style={{
                  width: '200px',
                  padding: '8px 10px',
                  fontSize: '13px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                }}
              />
              {state.addressMode === 'new' && (
                <div
                  style={{
                    marginTop: '6px',
                    padding: '8px',
                    fontSize: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    background: state.enforcementOfficer ? '#e8f5e9' : '#fff3cd',
                    color: state.enforcementOfficer ? '#2e7d32' : '#856404',
                    fontFamily: 'monospace',
                  }}
                >
                  <strong>Enforcement Officer:</strong>{' '}
                  {state.enforcementOfficer || 'Not assigned'}
                </div>
              )}
            </div>
          )}

          {/* Save address for future use */}
          <div style={{ marginTop: '10px', textAlign: 'right' }}>
            <button
              type="button"
              onClick={handleSaveAddressOnly}
              disabled={state.loading}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#fff',
                background: state.loading
                  ? '#ccc'
                  : 'linear-gradient(135deg, #007bff 0%, #00b4ff 100%)',
                border: 'none',
                borderRadius: '8px',
                cursor: state.loading ? 'not-allowed' : 'pointer',
              }}
            >
              💾 Save Address
            </button>
          </div>
          </div>

          {/* Employer Name */}
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
            Employer Name: *
          </label>
          {state.savedEmployerNames.length > 0 && (
            <select
              value={state.employerName}
              onChange={(e) => {
                const value = e.target.value;
                employerNameRef.current = value;
                updateState({ employerName: value });
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
              <option value="">Select saved employer name...</option>
              {state.savedEmployerNames.map((name, idx) => (
                <option key={idx} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={state.employerName}
            onChange={(e) => {
              const value = e.target.value;
              employerNameRef.current = value;
              updateState({ employerName: value });
            }}
            required
            disabled={state.loading}
            placeholder="Enter employer name"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              border: '2px solid #ddd',
              borderRadius: '8px',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ marginTop: '8px', textAlign: 'right' }}>
            <button
              type="button"
              onClick={handleSaveEmployerNameOnly}
              disabled={state.loading || !state.employerName.trim()}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#fff',
                background:
                  state.loading || !state.employerName.trim()
                    ? '#ccc'
                    : 'linear-gradient(135deg, #28a745 0%, #5cd85a 100%)',
                border: 'none',
                borderRadius: '8px',
                cursor:
                  state.loading || !state.employerName.trim()
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              💾 Save Employer Name
            </button>
          </div>
          </div>

          {/* Subject */}
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
            Subject: *
          </label>
          <input
            type="text"
            value={state.subject}
            onChange={(e) => {
              const value = e.target.value;
              subjectRef.current = value;
              updateState({ subject: value });
            }}
            required
            disabled={state.loading}
            placeholder="e.g., Recovery of Outstanding Dues"
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

          {/* Letter Body Prompt */}
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
            Letter Body Prompt (Optional - AI Generated):
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <textarea
              value={state.prompt}
              onChange={(e) => {
                const value = e.target.value;
                promptRef.current = value;
                updateState({ prompt: value });
              }}
              disabled={state.loading || state.generating}
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
              }}
            />
            <button
              onClick={handleGenerateLetterBody}
              disabled={state.loading || state.generating || !state.prompt.trim()}
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '500',
                border: 'none',
                borderRadius: '8px',
                background:
                  state.loading || state.generating || !state.prompt.trim()
                    ? '#ccc'
                    : 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                color: 'white',
                cursor:
                  state.loading || state.generating || !state.prompt.trim()
                    ? 'not-allowed'
                    : 'pointer',
                whiteSpace: 'nowrap',
                alignSelf: 'flex-start',
              }}
            >
              {state.generating ? '⏳ Generating...' : '✨ Generate'}
            </button>
          </div>
          <p style={{ marginTop: '6px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
            Enter a prompt describing what you want in the letter. The AI will generate the letter body automatically.
          </p>
          </div>

          {/* Letter Body */}
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
            Letter Body: *
          </label>
          <textarea
            value={state.letterBody}
            onChange={(e) => {
              const value = e.target.value;
              letterBodyRef.current = value;
              updateState({ letterBody: value });
            }}
            required
            disabled={state.loading}
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
            }}
          />
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

          {/* Regional Office (read-only) */}
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
              disabled={state.loading || state.generating}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                border: '2px solid #ddd',
                borderRadius: '8px',
                background: 'white',
                color: '#666',
                cursor: state.loading || state.generating ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={
                state.loading ||
                state.generating ||
                !state.date ||
                !state.employerName ||
                !state.letterBody
              }
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                border: 'none',
                borderRadius: '8px',
                background:
                  state.loading ||
                  state.generating ||
                  !state.date ||
                  !state.employerName ||
                  !state.letterBody
                    ? '#ccc'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                cursor:
                  state.loading ||
                  state.generating ||
                  !state.date ||
                  !state.employerName ||
                  !state.letterBody
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {state.loading ? '⏳ Generating...' : '📥 Generate ESTA Letter'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalRoot
  );
}

export default EstaLetterPopup;

