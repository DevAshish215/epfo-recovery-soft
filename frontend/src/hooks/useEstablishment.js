/**
 * useEstablishment Hook
 * Handles establishment data management
 */

import { useState } from 'react';
import api from '../api/api.js';
import { extractErrorMessage } from '../utils/error.util.js';

export function useEstablishment(user, setError, setSuccess, setLoadingData) {
  const [establishmentData, setEstablishmentData] = useState([]);
  const [establishmentDataLoaded, setEstablishmentDataLoaded] = useState(false);
  const [establishmentCurrentPage, setEstablishmentCurrentPage] = useState(1);
  const [establishmentSearchQuery, setEstablishmentSearchQuery] = useState('');

  const loadEstablishmentData = async (forceReload = false) => {
    // Only load if not already loaded or if force reload is requested
    if (!forceReload && establishmentDataLoaded && establishmentData.length > 0) {
      return; // Data already loaded, don't reload
    }

    setLoadingData(true);
    setError('');
    try {
      const response = await api.get(`/establishment?username=${user.username}`);
      if (response.data && response.data.success) {
        const establishmentRecords = response.data.data || [];
        setEstablishmentData(establishmentRecords);
        setEstablishmentDataLoaded(true);
        setEstablishmentCurrentPage(1); // Reset to first page when data is loaded
        setSuccess(`Loaded ${establishmentRecords.length} Establishment records`);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load Establishment data'));
      // Don't clear data on error if we already have data
      if (!establishmentDataLoaded) {
        setEstablishmentData([]);
        setEstablishmentCurrentPage(1); // Reset to first page on error
      }
    } finally {
      setLoadingData(false);
    }
  };

  const clearEstablishmentData = async () => {
    setLoadingData(true);
    setError('');
    try {
      const response = await api.delete(`/establishment?username=${user.username}`);
      if (response.data && response.data.success) {
        setEstablishmentData([]);
        setEstablishmentDataLoaded(true); // Mark as loaded so we show "No data" state
        setEstablishmentCurrentPage(1);
        setEstablishmentSearchQuery('');
        setSuccess(response.data.message || 'All establishment data cleared. Upload an Excel file to add data again.');
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to clear establishment data'));
    } finally {
      setLoadingData(false);
    }
  };

  return {
    // State
    establishmentData,
    establishmentDataLoaded,
    establishmentCurrentPage,
    establishmentSearchQuery,
    // Setters
    setEstablishmentData,
    setEstablishmentDataLoaded,
    setEstablishmentCurrentPage,
    setEstablishmentSearchQuery,
    // Functions
    loadEstablishmentData,
    clearEstablishmentData,
  };
}


