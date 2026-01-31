/**
 * useRecoveryForm Hook
 * Manages recovery form state and logic
 */

import { useState, useEffect, useRef } from 'react';
import api from '../api/api.js';
import logger from '../utils/logger.js';
import { getTodayDate } from '../utils/date.util.js';

export function useRecoveryForm({ user, officeData, initialFormData, onFormDataChange, editMode = false, recoveryId = null }) {
  // Initialize form data
  const getInitialFormData = () => {
    if (initialFormData) {
      return initialFormData;
    }
    return {
      ESTA_CODE: '',
      RRC_NO: '',
      RECOVERY_AMOUNT: '',
      BANK_NAME: '',
      RECOVERY_DATE: getTodayDate(),
      DD_TRRN_DATE: '',
      REFERENCE_NUMBER: '',
      TRANSACTION_TYPE: 'DD',
      RECOVERY_COST: '',
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [remark, setRemark] = useState('');
  const prevInitialFormDataRef = useRef(initialFormData);
  const saveTimeoutRef = useRef(null);
  
  // Get RO code from office data
  const roCode = officeData?.regional_office_code || '';
  
  // Parse ESTA_CODE to extract establishment number and extension
  const parseEstaCode = (estaCode, roCode) => {
    if (!estaCode || !roCode) {
      return { establishmentNumber: '', extension: '000' };
    }
    
    if (estaCode.startsWith(roCode)) {
      const remaining = estaCode.substring(roCode.length);
      if (remaining.length >= 3) {
        const extension = remaining.substring(remaining.length - 3);
        const establishmentNumber = remaining.substring(0, remaining.length - 3);
        return { establishmentNumber, extension };
      }
    }
    
    return { establishmentNumber: '', extension: '000' };
  };
  
  // Initialize establishment number and extension
  const initialEstaParts = editMode && formData.ESTA_CODE 
    ? parseEstaCode(formData.ESTA_CODE, roCode)
    : { establishmentNumber: '', extension: '000' };
  
  const [establishmentNumber, setEstablishmentNumber] = useState(initialEstaParts.establishmentNumber);
  const [extension, setExtension] = useState(initialEstaParts.extension);
  
  // Construct ESTA_CODE from RO code + establishment number + extension
  const constructEstaCode = (roCode, estNum, ext) => {
    if (!roCode) return '';
    
    const paddedEstNum = String(estNum || '').padStart(7, '0');
    const extValue = String(ext || '000').toUpperCase();
    const paddedExt = extValue.padEnd(3, '0').substring(0, 3);
    
    return `${roCode}${paddedEstNum}${paddedExt}`;
  };
  
  // Update ESTA_CODE when establishment number or extension changes
  useEffect(() => {
    if (!editMode && roCode) {
      const newEstaCode = constructEstaCode(roCode, establishmentNumber, extension);
      if (newEstaCode !== formData.ESTA_CODE) {
        setFormData(prev => ({ ...prev, ESTA_CODE: newEstaCode, RRC_NO: '' }));
      }
    }
  }, [establishmentNumber, extension, roCode, editMode]);
  
  // Update local state when initialFormData changes
  useEffect(() => {
    if (initialFormData !== prevInitialFormDataRef.current) {
      prevInitialFormDataRef.current = initialFormData;
      if (initialFormData) {
        setFormData(initialFormData);
        if (editMode && initialFormData.ESTA_CODE) {
          const parts = parseEstaCode(initialFormData.ESTA_CODE, roCode);
          setEstablishmentNumber(parts.establishmentNumber);
          setExtension(parts.extension);
        }
      }
    }
  }, [initialFormData, editMode, roCode]);
  
  // Persist form data to parent component (debounced)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    if (onFormDataChange) {
      saveTimeoutRef.current = setTimeout(() => {
        onFormDataChange(formData);
      }, 2000);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, onFormDataChange]);
  
  // RRC-related state
  const [rrcOptions, setRrcOptions] = useState([]);
  const [selectedRRC, setSelectedRRC] = useState(null);
  const [loadingRrcs, setLoadingRrcs] = useState(false);
  const [allocationPreview, setAllocationPreview] = useState(null);
  const [manualAllocation, setManualAllocation] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Helper function to determine which sections to show based on U/S
  const getSectionsToShow = (usValue) => {
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

  const sectionsToShow = selectedRRC ? getSectionsToShow(selectedRRC.U_S) : { show7A: true, show14B: true, show7Q: true };

  // Load RRC options when ESTA_CODE changes
  useEffect(() => {
    if (formData.ESTA_CODE && user && user.username) {
      loadRRCOptions(formData.ESTA_CODE);
    } else {
      setRrcOptions([]);
      setSelectedRRC(null);
      if (!editMode) {
        setFormData(prev => ({ ...prev, RRC_NO: '' }));
      }
    }
  }, [formData.ESTA_CODE, editMode]);

  // Load selected RRC data when RRC_NO changes
  useEffect(() => {
    if (formData.RRC_NO && rrcOptions.length > 0) {
      const rrc = rrcOptions.find(r => r.RRC_NO === formData.RRC_NO);
      setSelectedRRC(rrc || null);
    } else {
      setSelectedRRC(null);
      setAllocationPreview(null);
      setManualAllocation(null);
    }
  }, [formData.RRC_NO, rrcOptions]);

  // Auto-load allocation preview when RRC and Recovery Amount are both available
  useEffect(() => {
    if (formData.ESTA_CODE && formData.RRC_NO && formData.RECOVERY_AMOUNT && selectedRRC && user && user.username) {
      loadAllocationPreview();
    } else {
      setAllocationPreview(null);
      setManualAllocation(null);
    }
  }, [formData.ESTA_CODE, formData.RRC_NO, formData.RECOVERY_AMOUNT, selectedRRC]);

  // Auto-generate default remark based on form fields
  useEffect(() => {
    if (
      formData.RECOVERY_DATE &&
      formData.RECOVERY_AMOUNT &&
      formData.REFERENCE_NUMBER &&
      formData.BANK_NAME
    ) {
      const recoveryDate = new Date(formData.RECOVERY_DATE);
      const formattedDate = recoveryDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const formattedAmount = parseFloat(formData.RECOVERY_AMOUNT || 0).toLocaleString('en-IN', {
        maximumFractionDigits: 0
      });
      
      const defaultRemark = `${formattedDate} - ₹${formattedAmount} - ${formData.REFERENCE_NUMBER} - ${formData.BANK_NAME}`;
      setRemark(defaultRemark);
    } else {
      setRemark('');
    }
  }, [formData.RECOVERY_DATE, formData.RECOVERY_AMOUNT, formData.REFERENCE_NUMBER, formData.BANK_NAME]);

  const loadRRCOptions = async (estaCode) => {
    setLoadingRrcs(true);
    setError('');
    try {
      const response = await api.get(`/rrc?username=${user.username}`);
      if (response.data && response.data.success) {
        const allRrcs = response.data.data || [];
        const filtered = allRrcs.filter(rrc => rrc.ESTA_CODE === estaCode);
        setRrcOptions(filtered);
      }
    } catch (err) {
      let errorMessage = 'Failed to load RRC options';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
    } finally {
      setLoadingRrcs(false);
    }
  };

  // Helper function to validate allocation
  const validateAllocation = (allocation, recoveryAmount) => {
    if (!allocation || !recoveryAmount) {
      return '';
    }
    
    const total = 
      (allocation.ALLOCATED_7A_ACCOUNT_1_EE || 0) +
      (allocation.ALLOCATED_7A_ACCOUNT_1_ER || 0) +
      (allocation.ALLOCATED_7A_ACCOUNT_2 || 0) +
      (allocation.ALLOCATED_7A_ACCOUNT_10 || 0) +
      (allocation.ALLOCATED_7A_ACCOUNT_21 || 0) +
      (allocation.ALLOCATED_7A_ACCOUNT_22 || 0) +
      (allocation.ALLOCATED_7Q_ACCOUNT_1 || 0) +
      (allocation.ALLOCATED_7Q_ACCOUNT_2 || 0) +
      (allocation.ALLOCATED_7Q_ACCOUNT_10 || 0) +
      (allocation.ALLOCATED_7Q_ACCOUNT_21 || 0) +
      (allocation.ALLOCATED_7Q_ACCOUNT_22 || 0) +
      (allocation.ALLOCATED_14B_ACCOUNT_1 || 0) +
      (allocation.ALLOCATED_14B_ACCOUNT_2 || 0) +
      (allocation.ALLOCATED_14B_ACCOUNT_10 || 0) +
      (allocation.ALLOCATED_14B_ACCOUNT_21 || 0) +
      (allocation.ALLOCATED_14B_ACCOUNT_22 || 0);
    
    const recoveryAmt = parseFloat(recoveryAmount || 0);
    
    if (total !== recoveryAmt) {
      return `Total allocated (₹${total.toLocaleString('en-IN')}) does not match Recovery Amount (₹${recoveryAmt.toLocaleString('en-IN')})`;
    }
    
    return '';
  };

  const loadAllocationPreview = async () => {
    if (!formData.ESTA_CODE || !formData.RRC_NO || !formData.RECOVERY_AMOUNT) {
      return;
    }

    setPreviewLoading(true);
    setError('');
    
    try {
      const previewPayload = {
        username: user.username,
        ESTA_CODE: formData.ESTA_CODE,
        RRC_NO: formData.RRC_NO,
        RECOVERY_AMOUNT: formData.RECOVERY_AMOUNT,
      };

      if (editMode && recoveryId) {
        previewPayload.recoveryId = recoveryId;
      }

      const response = await api.post('/recovery/preview', previewPayload);
      
      if (response.data && response.data.success) {
        const preview = response.data.data;
        setAllocationPreview(preview);
        setManualAllocation({ ...preview });
        
        // Validate after loading preview
        const validationError = validateAllocation(preview, formData.RECOVERY_AMOUNT);
        if (validationError) {
          setError(validationError);
        }
      }
    } catch (err) {
      let errorMessage = 'Failed to generate allocation preview';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
      setAllocationPreview(null);
      setManualAllocation(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const updateAllocation = (key, value) => {
    const numValue = parseFloat(value) || 0;
    const updatedAllocation = {
      ...manualAllocation,
      [key]: numValue,
    };
    setManualAllocation(updatedAllocation);
    
    // Validate allocation immediately
    const validationError = validateAllocation(updatedAllocation, formData.RECOVERY_AMOUNT);
    if (validationError) {
      setError(validationError);
    } else {
      setError('');
    }
  };

  // Validate allocation whenever RECOVERY_AMOUNT changes
  useEffect(() => {
    if (manualAllocation && formData.RECOVERY_AMOUNT) {
      const validationError = validateAllocation(manualAllocation, formData.RECOVERY_AMOUNT);
      if (validationError) {
        setError(validationError);
      } else {
        setError('');
      }
    }
  }, [formData.RECOVERY_AMOUNT]);

  const resetForm = () => {
    const resetFormData = {
      ESTA_CODE: '',
      RRC_NO: '',
      RECOVERY_AMOUNT: '',
      BANK_NAME: '',
      RECOVERY_DATE: getTodayDate(),
      DD_TRRN_DATE: '',
      REFERENCE_NUMBER: '',
      TRANSACTION_TYPE: 'DD',
      RECOVERY_COST: '',
    };
    setFormData(resetFormData);
    setEstablishmentNumber('');
    setExtension('000');
    setRemark('');
    setAllocationPreview(null);
    setManualAllocation(null);
    setRrcOptions([]);
    setSelectedRRC(null);
    if (onFormDataChange) {
      onFormDataChange(null);
    }
  };

  return {
    // Form state
    formData,
    setFormData,
    remark,
    setRemark,
    
    // ESTA code state
    establishmentNumber,
    setEstablishmentNumber,
    extension,
    setExtension,
    roCode,
    parseEstaCode,
    constructEstaCode,
    
    // RRC state
    rrcOptions,
    selectedRRC,
    loadingRrcs,
    allocationPreview,
    manualAllocation,
    previewLoading,
    sectionsToShow,
    
    // Loading and error state
    loading,
    setLoading,
    error,
    setError,
    success,
    setSuccess,
    
    // Functions
    loadRRCOptions,
    loadAllocationPreview,
    updateAllocation,
    resetForm,
  };
}

