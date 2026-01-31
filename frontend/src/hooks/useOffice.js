/**
 * useOffice Hook
 * Handles office data management
 */

import { useState, useEffect } from 'react';
import api from '../api/api.js';
import logger from '../utils/logger.js';
import { extractErrorMessage } from '../utils/error.util.js';

export function useOffice(user, setError, setSuccess, setLoading) {
  const [officeData, setOfficeData] = useState(null);
  const [officeFormData, setOfficeFormData] = useState({
    regional_office_code: '',
    regional_office_name: '',
    regional_office_address: '',
    regional_office_email: '',
    regional_office_phone: '',
    recovery_officer_names: [''],
    officer_designation: '',
    dispatch_no_for_letters_cps: '',
  });
  const [dispatchNoError, setDispatchNoError] = useState('');

  // Load office data after login
  useEffect(() => {
    if (user && user.username) {
      loadOfficeData();
    }
  }, [user]);

  const loadOfficeData = async () => {
    try {
      // IMPORTANT: Data isolation by username - each user has their own office data
      const response = await api.get(`/office/${user.username}`);
      if (response.data.success && response.data.data) {
        // Validate that the returned office matches the user's username
        if (response.data.data.username !== user.username) {
          setError('Security warning: Office data does not match your username!');
          return;
        }
        const officeData = response.data.data;
        setOfficeData(officeData);
        
        // Fill the form with existing office data
        const officerNames = officeData.recovery_officer_names;
        const hasOfficerNames = officerNames && officerNames.length > 0;
        
        setOfficeFormData({
          regional_office_code: officeData.regional_office_code || '',
          regional_office_name: officeData.regional_office_name || '',
          regional_office_address: officeData.regional_office_address || '',
          regional_office_email: officeData.regional_office_email || '',
          regional_office_phone: officeData.regional_office_phone || '',
          recovery_officer_names: hasOfficerNames ? officerNames : [''],
          officer_designation: officeData.officer_designation || '',
          dispatch_no_for_letters_cps: officeData.dispatch_no_for_letters_cps || '',
        });
      }
    } catch (err) {
      // Office not found yet, that's okay - reset form to empty
      setOfficeFormData({
        regional_office_code: '',
        regional_office_name: '',
        regional_office_address: '',
        regional_office_email: '',
        regional_office_phone: '',
        recovery_officer_names: [''],
        officer_designation: '',
        dispatch_no_for_letters_cps: '',
      });
    }
  };

  const validateOfficeForm = () => {
    // Validate regional_office_code - must be exactly 5 characters
    if (!officeFormData.regional_office_code || officeFormData.regional_office_code.length !== 5) {
      return 'Regional Office Code must be exactly 5 characters';
    }

    // Validate regional_office_name - should not be more than 20 characters
    if (officeFormData.regional_office_name && officeFormData.regional_office_name.length > 20) {
      return 'Regional Office Name should not exceed 20 characters';
    }

    // Validate regional_office_address - should not be more than 150 characters
    if (officeFormData.regional_office_address && officeFormData.regional_office_address.length > 150) {
      return 'Address should not exceed 150 characters';
    }

    // Validate email format
    if (officeFormData.regional_office_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(officeFormData.regional_office_email)) {
        return 'Please enter a valid email address';
      }
    }

    // Validate regional_office_phone - should not be more than 30 characters
    if (officeFormData.regional_office_phone && officeFormData.regional_office_phone.length > 30) {
      return 'Phone should not exceed 30 characters';
    }

    // Validate recovery_officer_names - each name should not be more than 25 characters
    if (officeFormData.recovery_officer_names) {
      for (let i = 0; i < officeFormData.recovery_officer_names.length; i++) {
        if (officeFormData.recovery_officer_names[i] && officeFormData.recovery_officer_names[i].length > 25) {
          return `Recovery Officer Name ${i + 1} should not exceed 25 characters`;
        }
      }
    }

    // Validate officer_designation - should not be more than 25 characters
    if (officeFormData.officer_designation && officeFormData.officer_designation.length > 25) {
      return 'Officer Designation should not exceed 25 characters';
    }

    // Validate dispatch_no_for_letters_cps - should not be more than 15 characters
    if (officeFormData.dispatch_no_for_letters_cps && officeFormData.dispatch_no_for_letters_cps.length > 15) {
      return 'DISPATCH NO. for LETTERs/CPs should not exceed 15 characters';
    }

    return null; // No errors
  };

  const handleOfficeSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const validationError = validateOfficeForm();
    if (validationError) {
      setError(validationError);
      setLoading(false);
      return;
    }

    try {
      // IMPORTANT: Data isolation by username - each user has their own office details
      const response = await api.post('/office/save', {
        username: user.username, // Use username for data isolation
        ...officeFormData,
      });

      if (response.data.success) {
        setSuccess('Office details saved successfully!');
        await loadOfficeData();
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to save office details'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddOfficer = () => {
    setOfficeFormData({
      ...officeFormData,
      recovery_officer_names: [...officeFormData.recovery_officer_names, ''],
    });
  };

  const handleRemoveOfficer = (index) => {
    const newOfficers = officeFormData.recovery_officer_names.filter((_, i) => i !== index);
    setOfficeFormData({
      ...officeFormData,
      recovery_officer_names: newOfficers.length > 0 ? newOfficers : [''],
    });
  };

  const handleOfficerChange = (index, value) => {
    const newOfficers = [...officeFormData.recovery_officer_names];
    newOfficers[index] = value;
    setOfficeFormData({
      ...officeFormData,
      recovery_officer_names: newOfficers,
    });
  };

  const handleDispatchNoChange = (value) => {
    // Validate dispatch number format (optional, but if provided, should be valid)
    if (value && value.length > 15) {
      setDispatchNoError('DISPATCH NO. should not exceed 15 characters');
    } else {
      setDispatchNoError('');
    }
    setOfficeFormData({
      ...officeFormData,
      dispatch_no_for_letters_cps: value,
    });
  };

  return {
    // State
    officeData,
    officeFormData,
    dispatchNoError,
    // Setters
    setOfficeFormData,
    setDispatchNoError,
    // Functions
    loadOfficeData,
    handleOfficeSubmit,
    handleAddOfficer,
    handleRemoveOfficer,
    handleOfficerChange,
    handleDispatchNoChange,
  };
}


