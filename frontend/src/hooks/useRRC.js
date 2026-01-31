/**
 * useRRC Hook
 * Handles RRC data loading and management
 */

import { useState } from 'react';
import api from '../api/api.js';
import logger from '../utils/logger.js';
import { extractErrorMessage } from '../utils/error.util.js';

export function useRRC(user, setError, setSuccess, setLoadingData) {
  const [rrcData, setRrcData] = useState([]);
  const [trashData, setTrashData] = useState([]);
  const [rrcDataLoaded, setRrcDataLoaded] = useState(false);
  const [trashDataLoaded, setTrashDataLoaded] = useState(false);
  const [rrcSearchQuery, setRrcSearchQuery] = useState('');
  const [rrcIrNirFilter, setRrcIrNirFilter] = useState(null); // null, 'IR', or 'NIR'

  const loadRRCData = async (forceReload = false) => {
    logger.debug('loadRRCData called', { forceReload, rrcDataLoaded, rrcDataLength: rrcData.length, user: user?.username });
    
    // Only load if not already loaded or if force reload is requested
    if (!forceReload && rrcDataLoaded && rrcData.length > 0) {
      logger.debug('Skipping load - data already loaded');
      return; // Data already loaded, don't reload
    }

    if (!user || !user.username) {
      logger.error('Cannot load RRC data: User not logged in', { user });
      setError('User not logged in. Please login again.');
      setLoadingData(false);
      return;
    }

    logger.debug('Starting to load RRC data for user:', user.username);
    setLoadingData(true);
    setError('');
    setSuccess('');
    
    try {
      const url = `/rrc?username=${user.username}`;
      logger.debug('Fetching RRC data from:', url);
      const response = await api.get(url);
      logger.debug('RRC data response:', { 
        success: response.data?.success, 
        dataLength: response.data?.data?.length,
      });
      
      if (response.data && response.data.success) {
        const rrcRecords = response.data.data || [];
        logger.debug('Setting RRC data:', rrcRecords.length, 'records');
        setRrcData(rrcRecords);
        setRrcDataLoaded(true);
        if (rrcRecords.length > 0) {
          setSuccess(`Loaded ${rrcRecords.length} RRC records`);
        } else {
          setSuccess('No RRC records found. Upload an Excel/CSV file to get started.');
        }
      } else {
        logger.error('Invalid response structure:', response.data);
        setRrcData([]);
        setRrcDataLoaded(true);
        setError('Failed to load RRC data: Invalid response from server');
      }
    } catch (err) {
      const errorMessage = extractErrorMessage(err, 'Failed to load RRC data');
      setError(errorMessage);
      // Don't clear data on error if we already have data
      if (!rrcDataLoaded) {
        setRrcData([]);
      }
    } finally {
      logger.debug('RRC data loading finished');
      setLoadingData(false);
    }
  };

  const loadTrashData = async (forceReload = false) => {
    // Only load if not already loaded or if force reload is requested
    if (!forceReload && trashDataLoaded && trashData.length > 0) {
      return; // Data already loaded, don't reload
    }

    setLoadingData(true);
    setError('');
    try {
      const response = await api.get(`/rrc/trash?username=${user.username}`);
      if (response.data && response.data.success) {
        const trashRecords = response.data.data || [];
        setTrashData(trashRecords);
        setTrashDataLoaded(true);
        setSuccess(`Loaded ${trashRecords.length} deleted RRC records`);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load trash data'));
      // Don't clear data on error if we already have data
      if (!trashDataLoaded) {
        setTrashData([]);
      }
    } finally {
      setLoadingData(false);
    }
  };

  const handleRestoreRRC = async (rrcId) => {
    const confirmed = window.confirm('Are you sure you want to restore this RRC record?');
    if (!confirmed) return;

    try {
      setLoadingData(true);
      const response = await api.post(`/rrc/${rrcId}/restore?username=${user.username}`);
      
      if (response.data && response.data.success) {
        setSuccess('RRC restored successfully!');
        // Refresh both trash and RRC data
        loadTrashData(true);
        loadRRCData(true);
      } else {
        throw new Error(response.data?.message || 'Restore failed');
      }
    } catch (err) {
      logger.error('Restore failed', err);
      setError(`Failed to restore RRC: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  const handlePermanentDeleteRRC = async (rrcId) => {
    const confirmed = window.confirm('Are you sure you want to permanently delete this RRC record? This action CANNOT be undone!');
    if (!confirmed) return;

    try {
      setLoadingData(true);
      const response = await api.delete(`/rrc/${rrcId}/permanent?username=${user.username}`);
      
      if (response.data && response.data.success) {
        setSuccess('RRC permanently deleted successfully!');
        // Refresh trash data
        loadTrashData(true);
      } else {
        throw new Error(response.data?.message || 'Permanent delete failed');
      }
    } catch (err) {
      logger.error('Permanent delete failed', err);
      setError(`Failed to permanently delete RRC: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  return {
    // State
    rrcData,
    trashData,
    rrcDataLoaded,
    trashDataLoaded,
    rrcSearchQuery,
    rrcIrNirFilter,
    // Setters
    setRrcData,
    setTrashData,
    setRrcDataLoaded,
    setTrashDataLoaded,
    setRrcSearchQuery,
    setRrcIrNirFilter,
    // Functions
    loadRRCData,
    loadTrashData,
    handleRestoreRRC,
    handlePermanentDeleteRRC,
  };
}


