import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/api.js';
import logger from '../../utils/logger.js';
import { formatDateForInput } from '../../utils/date.util.js';

// Local helper: format date for remarks (DD-MM-YYYY)
const formatDateForRemarkLocal = (dateValue) => {
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

// Local helper: calculate hearing date (22 working days after notice date)
const calculateHearingDateLocal = (noticeDate) => {
  if (!noticeDate) return '';

  try {
    const date = new Date(noticeDate);
    if (isNaN(date.getTime())) return '';

    // Add 22 days
    date.setDate(date.getDate() + 22);

    // Skip weekends
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (err) {
    logger.error('CP25Popup: Error calculating hearing date:', err);
    return '';
  }
};

// Backdrop and container styles are static so they don't cause re-renders
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
  maxWidth: '700px',
  width: '90%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
  animation: 'slideUp 0.3s ease-out',
};

/**
 * CP25Popup
 * Isolates all CP-25 popup state and logic from RRCTable to reduce re-renders.
 * Props:
 * - isOpen
 * - onClose
 * - editRow
 * - username
 * - officeData
 * - onRefresh
 * - onSuccess
 */
function CP25Popup({
  isOpen,
  onClose,
  editRow,
  username,
  officeData,
  onRefresh,
  onSuccess,
}) {
  // Guard: if not open or no row, render nothing
  if (!isOpen || !editRow || !username) {
    return null;
  }

  // Use a single state object to minimize hook calls & re-renders
  const [state, setState] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const cp1DateValue = editRow.CP_1_DATE ? formatDateForInput(editRow.CP_1_DATE) : '';
    return {
      noticeDate: today,
      hearingDate: calculateHearingDateLocal(today),
      hearingTime: '15:00',
      cp1Date: cp1DateValue || '',
      employerName: '',
      remark: '',
      addressMode: 'existing', // 'existing' | 'saved' | 'new'
      useExistingAddress: true,
      newAddress: '',
      newPinCode: '',
      selectedSavedAddressId: '',
      selectedEmployerNames: [],
      savedAddresses: [],
      savedEmployerNames: [],
      savedAddressEnforcementOfficers: {},
      enforcementOfficer: '',
      loading: false,
      loadingAddresses: false,
      error: '',
      editingNameId: null,
      editingNameValue: '',
      editingAddressId: null,
      editingAddressValue: '',
      editingAddressPinCode: '',
      editingExistingAddress: false,
      editingExistingAddressValue: '',
      editingExistingDistrict: '',
      editingExistingPinCode: '',
    };
  });

  // Text fields that change often use refs to avoid extra re-renders
  const employerNameRef = useRef('');
  const newAddressRef = useRef('');
  const newPinCodeRef = useRef('');

  // Convenience updater
  const updateState = (patch) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  // Derived helpers for existing address (from editRow)
  const existingAddress = useMemo(() => {
    const add1 = editRow.ADD1 || '';
    const add2 = editRow.ADD2 || '';
    const city = editRow.CITY || '';
    const parts = [];
    if (add1) parts.push(add1);
    if (add2 && add2 !== add1) parts.push(add2);
    if (city) parts.push(city);
    return parts.join('\n');
  }, [editRow.ADD1, editRow.ADD2, editRow.CITY]);

  const existingDistrict = editRow.DIST || '';
  const existingPinCode = editRow.PIN_CD || '';


  // Load saved employer addresses (same behaviour as RRCTable)
  const loadSavedEmployerAddresses = async () => {
    if (!editRow || !username) return [];

    try {
      updateState({ loadingAddresses: true });
      const response = await api.get(`/employer-address/${editRow.ESTA_CODE}`, {
        params: { username },
      });

      if (response.data.success) {
        const addresses = response.data.data || [];

        // Extract unique employer names
        const uniqueNames = [...new Set(
          addresses
            .filter((addr) => addr.employerName && addr.employerName.trim())
            .map((addr) => addr.employerName.trim()),
        )];

        // Map enforcement officers by PIN from RRC list
        const enforcementOfficerMap = {};
        try {
          const rrcResponse = await api.get('/rrc', { params: { username } });
          if (rrcResponse.data.success) {
            const rrcs = rrcResponse.data.data || [];
            const pinToOfficerMap = {};
            rrcs.forEach((rrc) => {
              if (rrc.PIN_CD && rrc.ENFORCEMENT_OFFICER) {
                pinToOfficerMap[rrc.PIN_CD.trim()] = rrc.ENFORCEMENT_OFFICER;
              }
            });
            addresses.forEach((addr) => {
              if (addr.pinCode && addr.pinCode.trim() && pinToOfficerMap[addr.pinCode.trim()]) {
                enforcementOfficerMap[addr._id] = pinToOfficerMap[addr.pinCode.trim()];
              }
            });
          }
        } catch (err) {
          logger.error('CP25Popup: Error fetching enforcement officers:', err);
        }

        updateState({
          savedAddresses: addresses,
          savedEmployerNames: uniqueNames,
          savedAddressEnforcementOfficers: enforcementOfficerMap,
        });

        return addresses;
      }
      return [];
    } catch (err) {
      logger.error('CP25Popup: Error loading saved employer addresses:', err);
      updateState({
        savedAddresses: [],
        savedEmployerNames: [],
      });
      return [];
    } finally {
      updateState({ loadingAddresses: false });
    }
  };

  // Load saved employer names separately
  const loadSavedEmployerNames = async () => {
    if (!editRow || !username) return;
    try {
      const response = await api.get(`/employer-address/${editRow.ESTA_CODE}/names`, {
        params: { username },
      });
      if (response.data.success) {
        const names = response.data.data || [];
        updateState((prev) => ({
          savedEmployerNames: [...new Set([...(prev.savedEmployerNames || []), ...names])],
        }));
      }
    } catch (err) {
      logger.error('CP25Popup: Error loading saved employer names:', err);
    }
  };

  // Fetch Enforcement Officer by PIN CODE (single call)
  const fetchEnforcementOfficerByPinCode = async (pinCode) => {
    if (!pinCode || !username) {
      updateState({ enforcementOfficer: '' });
      return;
    }
    try {
      const response = await api.get('/rrc', { params: { username } });
      if (response.data.success) {
        const rrcs = response.data.data || [];
        const rrc = rrcs.find(
          (item) => item.PIN_CD && item.PIN_CD.trim() === pinCode.trim(),
        );
        if (rrc && rrc.ENFORCEMENT_OFFICER) {
          updateState({ enforcementOfficer: rrc.ENFORCEMENT_OFFICER });
        } else {
          updateState({ enforcementOfficer: '' });
        }
      }
    } catch (err) {
      logger.error('CP25Popup: Error fetching enforcement officer:', err);
      updateState({ enforcementOfficer: '' });
    }
  };

  // Initialise popup when opened
  useEffect(() => {
    if (!isOpen) return;

    const today = new Date().toISOString().split('T')[0];
    const cp1DateValue = editRow.CP_1_DATE ? formatDateForInput(editRow.CP_1_DATE) : '';

    employerNameRef.current = '';
    newAddressRef.current = '';
    newPinCodeRef.current = '';

    setState((prev) => ({
      ...prev,
      noticeDate: today,
      hearingDate: calculateHearingDateLocal(today),
      hearingTime: '15:00',
      cp1Date: cp1DateValue || '',
      employerName: '',
      remark: '',
      addressMode: 'existing',
      useExistingAddress: true,
      newAddress: '',
      newPinCode: '',
      selectedSavedAddressId: '',
      selectedEmployerNames: [],
      enforcementOfficer: '',
      error: '',
      editingNameId: null,
      editingNameValue: '',
      editingAddressId: null,
      editingAddressValue: '',
      editingAddressPinCode: '',
      editingExistingAddress: false,
      editingExistingAddressValue: '',
      editingExistingDistrict: existingDistrict || '',
      editingExistingPinCode: existingPinCode || '',
    }));

    // Existing enforcement officer (from RRC PIN)
    if (existingPinCode) {
      fetchEnforcementOfficerByPinCode(existingPinCode);
    }

    // Load saved addresses and restore last address mode
    loadSavedEmployerAddresses().then((addresses) => {
      if (editRow && editRow.ESTA_CODE) {
        const lastAddressKey = `cp25_last_address_${editRow.ESTA_CODE}`;
        const lastAddress = localStorage.getItem(lastAddressKey);
        if (lastAddress === 'existing') {
          updateState({ addressMode: 'existing' });
        } else if (lastAddress && lastAddress.startsWith('saved_')) {
          const savedId = lastAddress.replace('saved_', '');
          const savedExists = addresses && addresses.some((addr) => addr._id === savedId);
          if (savedExists) {
            updateState({
              addressMode: 'saved',
              selectedSavedAddressId: savedId,
            });
          }
        } else if (lastAddress === 'new') {
          updateState({ addressMode: 'new' });
        }
      }
    });

    loadSavedEmployerNames();
  }, [isOpen, editRow._id]);

  // Auto-generate remark (debounced) when notice date, employer names change
  useEffect(() => {
    if (!isOpen || !state.noticeDate) return;

    const timeoutId = setTimeout(() => {
      const allNames = [];
      if (employerNameRef.current && employerNameRef.current.trim()) {
        allNames.push(employerNameRef.current.trim());
      }
      if (state.selectedEmployerNames && state.selectedEmployerNames.length > 0) {
        state.selectedEmployerNames.forEach((name) => {
          if (name && name.trim() && !allNames.includes(name.trim())) {
            allNames.push(name.trim());
          }
        });
      }
      const formattedDate = formatDateForRemarkLocal(state.noticeDate);
      if (allNames.length > 0) {
        updateState({
          remark: `${formattedDate} - CP-25 issued to ${allNames.join(', ')}`,
        });
      } else {
        updateState({
          remark: `${formattedDate} - CP-25 issued to`,
        });
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [isOpen, state.noticeDate, state.selectedEmployerNames]);

  // Change enforcement officer when address mode / PIN changes
  useEffect(() => {
    if (!isOpen) return;

    if (state.addressMode === 'existing') {
      if (existingPinCode) {
        fetchEnforcementOfficerByPinCode(existingPinCode);
      } else {
        updateState({ enforcementOfficer: '' });
      }
    } else if (state.addressMode === 'saved' && state.selectedSavedAddressId) {
      const saved = state.savedAddresses.find(
        (addr) => addr._id === state.selectedSavedAddressId,
      );
      if (saved && saved.pinCode) {
        fetchEnforcementOfficerByPinCode(saved.pinCode);
      } else {
        updateState({ enforcementOfficer: '' });
      }
    } else if (state.addressMode === 'new' && newPinCodeRef.current) {
      fetchEnforcementOfficerByPinCode(newPinCodeRef.current);
    }
  }, [isOpen, state.addressMode, state.selectedSavedAddressId, existingPinCode, state.savedAddresses]);

  // Watch new PIN code changes for enforcement officer
  useEffect(() => {
    if (!isOpen || state.addressMode !== 'new') return;
    if (state.newPinCode && state.newPinCode.trim()) {
      fetchEnforcementOfficerByPinCode(state.newPinCode.trim());
    } else {
      updateState({ enforcementOfficer: '' });
    }
  }, [isOpen, state.addressMode, state.newPinCode]);

  // --- Handlers ---

  const handleEmployerNameChange = (value) => {
    employerNameRef.current = value;
    updateState({ employerName: value });
  };

  const handleNewAddressChange = (value) => {
    newAddressRef.current = value;
    updateState({ newAddress: value });
  };

  const handleNewPinCodeChange = (value) => {
    newPinCodeRef.current = value;
    updateState({ newPinCode: value });
  };

  // Delete a saved address
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
        // Reload list and clear selection if needed
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
      logger.error('CP25Popup: Error deleting address:', err);
      updateState({
        error: err.response?.data?.message || 'Failed to delete address',
      });
    } finally {
      updateState({ loading: false });
    }
  };

  // Save employer name only
  const handleSaveEmployerNameOnly = async () => {
    const name = employerNameRef.current || '';
    if (!editRow || !username || !name.trim()) {
      updateState({ error: 'Please enter employer name to save' });
      return;
    }
    try {
      updateState({ loading: true, error: '' });
      const response = await api.post('/employer-address', {
        username,
        estaCode: editRow.ESTA_CODE,
        employerName: name.trim(),
        address: '',
      });
      if (response.data.success) {
        await loadSavedEmployerAddresses();
        await loadSavedEmployerNames();
        employerNameRef.current = '';
        updateState({ employerName: '' });
        if (onSuccess) onSuccess('Employer name saved successfully!');
      }
    } catch (err) {
      logger.error('CP25Popup: Error saving employer name:', err);
      updateState({
        error: err.response?.data?.message || 'Failed to save employer name',
      });
    } finally {
      updateState({ loading: false });
    }
  };

  // Toggle employer name selection
  const handleToggleEmployerName = (name) => {
    setState((prev) => {
      const selected = prev.selectedEmployerNames || [];
      if (selected.includes(name)) {
        return {
          ...prev,
          selectedEmployerNames: selected.filter((n) => n !== name),
        };
      }
      return {
        ...prev,
        selectedEmployerNames: [...selected, name],
      };
    });
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
      if (state.editingExistingAddress) {
        currentAddress = state.editingExistingAddressValue;
        currentPinCode = state.editingExistingPinCode;
      } else {
        currentAddress = existingAddress;
        currentPinCode = existingPinCode;
      }
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

    // Append PIN to address if missing
    if (currentPinCode && !currentAddress.includes(currentPinCode)) {
      currentAddress = `${currentAddress}\n${currentPinCode}`;
    }

    try {
      updateState({ loading: true, error: '' });
      let addressWithoutPin = currentAddress.trim();
      let extractedPinCode = currentPinCode || '';

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
        if (onSuccess) onSuccess('Address saved successfully!');
      }
    } catch (err) {
      logger.error('CP25Popup: Error saving address:', err);
      updateState({
        error: err.response?.data?.message || 'Failed to save address',
      });
    } finally {
      updateState({ loading: false });
    }
  };

  // Generate CP-25 notice
  const handleGenerate = async (isAEO = false) => {
    if (!editRow || !username || !state.noticeDate) {
      updateState({ error: 'Please enter notice date' });
      return;
    }

    const allEmployerNames = [];
    if (employerNameRef.current && employerNameRef.current.trim()) {
      allEmployerNames.push(employerNameRef.current.trim());
    }
    if (state.selectedEmployerNames && state.selectedEmployerNames.length > 0) {
      state.selectedEmployerNames.forEach((name) => {
        if (name && name.trim() && !allEmployerNames.includes(name.trim())) {
          allEmployerNames.push(name.trim());
        }
      });
    }
    if (allEmployerNames.length === 0) {
      updateState({ error: 'Please enter or select at least one employer name' });
      return;
    }

    if (!state.hearingDate) {
      updateState({ error: 'Please enter hearing date' });
      return;
    }
    if (!state.hearingTime) {
      updateState({ error: 'Please enter hearing time' });
      return;
    }
    if (!state.cp1Date || !state.cp1Date.trim()) {
      updateState({
        error:
          'CP-1 DATE is mandatory. Please enter CP-1 DATE before generating CP-25 notice.',
      });
      return;
    }

    // Prepare selected address
    let selectedAddress = '';
    let selectedPinCode = '';
    let selectedDistrict = '';

    if (state.addressMode === 'existing') {
      selectedAddress = existingAddress;
      selectedPinCode = existingPinCode;
      selectedDistrict = existingDistrict;
      if (selectedAddress && selectedDistrict && selectedPinCode) {
        selectedAddress = `${selectedAddress}\n${selectedDistrict} - ${selectedPinCode}`;
      } else if (selectedAddress && selectedPinCode) {
        selectedAddress = `${selectedAddress}\n${selectedPinCode}`;
      } else if (selectedAddress && selectedDistrict) {
        selectedAddress = `${selectedAddress}\n${selectedDistrict}`;
      }
    } else if (state.addressMode === 'saved') {
      const saved = state.savedAddresses.find(
        (addr) => addr._id === state.selectedSavedAddressId,
      );
      if (saved) {
        selectedAddress = saved.address;
        selectedPinCode = saved.pinCode || '';
        if (selectedPinCode && selectedAddress && !selectedAddress.includes(selectedPinCode)) {
          selectedAddress = `${selectedAddress}\n${selectedPinCode}`;
        }
      }
    } else if (state.addressMode === 'new') {
      selectedAddress = newAddressRef.current.trim();
      selectedPinCode = newPinCodeRef.current.trim();
      if (!selectedPinCode) {
        updateState({ error: 'Please enter PIN CODE for new address' });
        return;
      }
      if (selectedAddress && selectedPinCode) {
        selectedAddress = `${selectedAddress}\n${selectedPinCode}`;
      }
    }

    if (!selectedAddress || selectedAddress === '') {
      updateState({ error: 'Please select or enter address' });
      return;
    }

    // Save last selected address mode for this ESTA_CODE
    if (editRow && editRow.ESTA_CODE) {
      const lastAddressKey = `cp25_last_address_${editRow.ESTA_CODE}`;
      let lastAddressValue = '';
      if (state.addressMode === 'existing') {
        lastAddressValue = 'existing';
      } else if (state.addressMode === 'saved' && state.selectedSavedAddressId) {
        lastAddressValue = `saved_${state.selectedSavedAddressId}`;
      } else if (state.addressMode === 'new') {
        lastAddressValue = 'new';
      }
      if (lastAddressValue) {
        localStorage.setItem(lastAddressKey, lastAddressValue);
      }
    }

    const enforcementOfficerName = state.enforcementOfficer || '';

    // Ask user about remark
    let finalRemark = '';
    const addRemark = window.confirm('Do you want to add a remark to RRC data?');
    if (addRemark) {
      if (state.remark && state.remark.trim()) {
        finalRemark = state.remark.trim();
      } else {
        const remarkInput = window.prompt(
          'Enter remark to be added to REMARKS field:',
          '',
        );
        if (remarkInput === null) {
          return;
        }
        finalRemark = remarkInput.trim();
      }
    }

    try {
      updateState({ loading: true, error: '' });

      const response = await api.post(
        '/notices/cp25/generate',
        {
          username,
          estaCode: editRow.ESTA_CODE,
          rrcNo: editRow.RRC_NO,
          noticeDate: state.noticeDate,
          employerNames: allEmployerNames,
          address: selectedAddress,
          hearingDate: state.hearingDate,
          hearingTime: state.hearingTime,
          regionalOfficeName: officeData?.regional_office_name || '',
          enforcementOfficer: enforcementOfficerName,
          isAEO,
          cp1Date: state.cp1Date,
          remark: finalRemark,
        },
        { responseType: 'blob' },
      );

      // Download file
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let filename = 'CP-25_Notice.docx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/i);
        if (match) {
          filename = match[1];
        }
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Auto-save CP-1 DATE to RRC table
      if (editRow && editRow._id && state.cp1Date) {
        try {
          await api.put(`/rrc/${editRow._id}`, {
            username,
            CP_1_DATE: state.cp1Date,
          });
        } catch (err) {
          logger.error('CP25Popup: Error saving CP-1 DATE to RRC:', err);
        }
      }

      // Close popup and notify
      if (onRefresh) onRefresh();
      if (onSuccess) {
        onSuccess(`CP-25 ${isAEO ? 'AEO ' : ''}notice generated and downloaded successfully!`);
      }
      onClose();
    } catch (err) {
      logger.error('CP25Popup: CP-25 generation failed', err);
      let errorMessage = 'Failed to generate CP-25 notice';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      updateState({ error: errorMessage });
    } finally {
      updateState({ loading: false });
    }
  };

  // Close handler
  const handleCancel = () => {
    if (state.loading) return;
    onClose();
  };

  const portalTarget = document.body;

  const content = (
    <div
      style={POPUP_BACKDROP_STYLE}
      onClick={(e) => {
        if (e.target === e.currentTarget && !state.loading) {
          handleCancel();
        }
      }}
    >
      <div
        style={POPUP_CONTAINER_STYLE}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '20px' }}>
          <h2
            style={{
              margin: '0 0 10px 0',
              color: '#333',
              fontSize: '24px',
              fontWeight: '600',
            }}
          >
            📄 Generate CP-25 Notice
          </h2>
          <p
            style={{
              margin: '0',
              color: '#666',
              fontSize: '14px',
            }}
          >
            Enter details for CP-25 notice generation
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
            CP-25 Notice Date: *
          </label>
          <input
            type="date"
            value={state.noticeDate}
            onChange={(e) => {
              const value = e.target.value;
              updateState({
                noticeDate: value,
                hearingDate: calculateHearingDateLocal(value),
              });
            }}
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

        {/* Employer Names */}
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '12px',
              fontWeight: '600',
              color: '#333',
              fontSize: '15px',
            }}
          >
            Employer Name(s): * (Select multiple or enter new)
          </label>

          {/* Saved Employer Names with Checkboxes */}
          {state.savedEmployerNames && state.savedEmployerNames.length > 0 && (
            <div
              style={{
                marginBottom: '12px',
                padding: '12px',
                background: '#f0f8ff',
                borderRadius: '8px',
                border: '1px solid #b3d9ff',
                maxHeight: '150px',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#0066cc',
                  fontSize: '13px',
                }}
              >
                Saved Employer Names:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {state.savedEmployerNames.map((name) => (
                  <label
                    key={name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={state.selectedEmployerNames.includes(name)}
                      onChange={() => handleToggleEmployerName(name)}
                      disabled={state.loading}
                    />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* New Employer Name Input */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <input
              type="text"
              value={state.employerName}
              onChange={(e) => handleEmployerNameChange(e.target.value)}
              placeholder="Enter new employer name"
              disabled={state.loading}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '14px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={handleSaveEmployerNameOnly}
              disabled={state.loading || !state.employerName.trim()}
              style={{
                padding: '12px 16px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#fff',
                background:
                  state.loading || !state.employerName.trim()
                    ? '#ccc'
                    : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                border: 'none',
                borderRadius: '8px',
                cursor:
                  state.loading || !state.employerName.trim() ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              💾 Save Name
            </button>
          </div>

          {state.selectedEmployerNames.length > 0 && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px',
                background: '#e8f5e9',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#2e7d32',
              }}
            >
              Selected: {state.selectedEmployerNames.join(', ')}
            </div>
          )}
        </div>

        {/* ESTA Address for this notice (select / enter / save) */}
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
            ESTA ADDRESS for CP-25 Notice: *
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
                name="cp25_address_mode"
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
                name="cp25_address_mode"
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
                name="cp25_address_mode"
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
                      name="cp25_saved_address"
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
                onChange={(e) => handleNewAddressChange(e.target.value)}
                placeholder="Enter new ESTA address (without PIN)"
                disabled={state.loading}
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
                onChange={(e) => handleNewPinCodeChange(e.target.value)}
                placeholder="PIN CODE (6 digits)"
                maxLength={6}
                disabled={state.loading}
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
                background:
                  state.loading
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

        {/* Hearing Date & Time */}
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
            Hearing Date: * (Auto-calculated: 22 days after notice date, skipping weekends)
          </label>
          <input
            type="date"
            value={state.hearingDate}
            onChange={(e) => updateState({ hearingDate: e.target.value })}
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
            Hearing Time: * (Default: 3:00 PM)
          </label>
          <input
            type="time"
            value={state.hearingTime}
            onChange={(e) => updateState({ hearingTime: e.target.value })}
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

        {/* CP-1 DATE */}
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
            CP-1 DATE: * (Mandatory)
          </label>
          <input
            type="date"
            value={state.cp1Date}
            onChange={(e) => updateState({ cp1Date: e.target.value })}
            required
            disabled={state.loading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              border: state.cp1Date ? '2px solid #28a745' : '2px solid #dc3545',
              borderRadius: '8px',
              boxSizing: 'border-box',
              background: state.cp1Date ? '#f8fff9' : '#fff5f5',
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
              fontFamily: 'inherit',
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
        <div
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={handleCancel}
            disabled={state.loading}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#666',
              background: '#f0f0f0',
              border: 'none',
              borderRadius: '8px',
              cursor: state.loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => handleGenerate(false)}
            disabled={
              state.loading || !state.noticeDate || !state.hearingDate || !state.hearingTime || !state.cp1Date
            }
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#fff',
              background:
                state.loading || !state.noticeDate || !state.cp1Date
                  ? '#ccc'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor:
                state.loading || !state.noticeDate || !state.cp1Date
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {state.loading ? 'Generating...' : 'Generate CP-25'}
          </button>
          <button
            onClick={() => handleGenerate(true)}
            disabled={
              state.loading || !state.noticeDate || !state.hearingDate || !state.hearingTime || !state.cp1Date
            }
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#fff',
              background:
                state.loading || !state.noticeDate || !state.cp1Date
                  ? '#ccc'
                  : 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor:
                state.loading || !state.noticeDate || !state.cp1Date
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {state.loading ? 'Generating...' : 'Generate CP-25 (AEO)'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, portalTarget);
}

export default React.memo(CP25Popup);


