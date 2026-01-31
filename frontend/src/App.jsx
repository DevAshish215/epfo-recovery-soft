/**
 * Main App Component
 * Refactored to use custom hooks for better code organization
 */

import { useState, useEffect } from 'react';
import api from './api/api.js';
import RecoveryForm from './recovery/RecoveryForm.jsx';
import RecoveryTable from './recovery/RecoveryTable.jsx';
import RecoveryLogs from './recovery/RecoveryLogs.jsx';
import RRCTable from './rrc/RRCTable.jsx';
import EnforcementOfficer from './officers/EnforcementOfficer.jsx';
import OfficeForm from './components/office/OfficeForm.jsx';
import ReportsSection from './components/reports/ReportsSection.jsx';
import * as XLSX from 'xlsx';
import logger from './utils/logger.js';
import { formatNumber } from './utils/number.util.js';
import { formatDate } from './utils/date.util.js';
import { useAuth } from './hooks/useAuth.js';
import { useOffice } from './hooks/useOffice.js';
import { useRRC } from './hooks/useRRC.js';
import { useEstablishment } from './hooks/useEstablishment.js';
import { extractUploadError } from './utils/error.util.js';

function App() {
  // Tab and UI state
  const [activeTab, setActiveTab] = useState('office'); // office, rrc, establishment, view-rrc, view-establishment, recovery, reports
  const [showTrashInRRC, setShowTrashInRRC] = useState(false); // Track if showing trash view within View RRC Data
  const [activeReport, setActiveReport] = useState(null); // null, 'top10NIR', 'top25IR', 'irAbove25Lakhs'
  const [loadingData, setLoadingData] = useState(false);
  const [recoveryLogsRefresh, setRecoveryLogsRefresh] = useState(0);
  // Recovery Entry form data (persist across tab switches)
  const [recoveryFormData, setRecoveryFormData] = useState(null);

  // Use custom hooks
  const auth = useAuth();
  const {
    loggedIn,
    user,
    error: authError,
    success: authSuccess,
    loading: authLoading,
    setError: setAuthError,
    setSuccess: setAuthSuccess,
    handleLogout: authHandleLogout,
  } = auth;

  // Local error/success state (can be set by any hook or component)
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync auth error/success with local state
  useEffect(() => {
    if (authError) setError(authError);
    if (authSuccess) setSuccess(authSuccess);
  }, [authError, authSuccess]);

  // Use office hook (only when logged in)
  const office = useOffice(
    user || null,
    setError,
    setSuccess,
    setLoading
  );

  // Use RRC hook (only when logged in)
  const rrc = useRRC(
    user || null,
    setError,
    setSuccess,
    setLoadingData
  );

  // Use establishment hook (only when logged in)
  const establishment = useEstablishment(
    user || null,
    setError,
    setSuccess,
    setLoadingData
  );

  // Extract office values from hook
  const {
    officeData,
    officeFormData,
    dispatchNoError,
    setOfficeFormData,
    handleOfficeSubmit,
    handleAddOfficer,
    handleRemoveOfficer,
    handleOfficerChange,
    handleDispatchNoChange,
  } = office;

  // Extract RRC values from hook
  const {
    rrcData,
    trashData,
    rrcDataLoaded,
    trashDataLoaded,
    rrcSearchQuery,
    rrcIrNirFilter,
    setRrcData,
    setRrcSearchQuery,
    setRrcIrNirFilter,
    loadRRCData,
    loadTrashData,
    handleRestoreRRC,
    handlePermanentDeleteRRC,
  } = rrc;

  // Extract establishment values from hook
  const {
    establishmentData,
    establishmentDataLoaded,
    establishmentCurrentPage,
    establishmentSearchQuery,
    setEstablishmentData,
    setEstablishmentCurrentPage,
    setEstablishmentSearchQuery,
    loadEstablishmentData,
  } = establishment;

  // Handle logout with cleanup
  const handleLogout = () => {
    authHandleLogout();
    // Reset office data on logout (hook will handle this, but we reset tab)
    setActiveTab('office');
  };

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000); // 5 seconds

      // Cleanup timer on unmount or when success changes
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-dismiss error messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000); // 5 seconds

      // Cleanup timer on unmount or when error changes
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Office functions are now in useOffice hook - extracted above

  const handleRRCUpload = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const fileInput = e.target.excelFile;
    if (!fileInput.files[0]) {
      setError('Please select an Excel file');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('excelFile', fileInput.files[0]);
    formData.append('username', user.username);
    formData.append('regional_office_code', user.regional_office_code);

    try {
      const response = await api.post('/rrc/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setSuccess(`RRC data uploaded successfully! ${response.data.data.recordsProcessed} records processed.`);
        fileInput.value = '';
      }
    } catch (err) {
      // Get error message from response, or use default message
      let errorMessage = 'Failed to upload RRC data';
      let missingColumns = null;
      
      if (err.response && err.response.data) {
        if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
        if (err.response.data.errors && err.response.data.errors.missingColumns) {
          missingColumns = err.response.data.errors.missingColumns;
        }
      }
      
      // If there are missing columns, add them to the error message
      if (missingColumns && missingColumns.length > 0) {
        errorMessage = `${errorMessage}. Missing columns: ${missingColumns.join(', ')}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEstablishmentUpload = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const fileInput = e.target.excelFile;
    if (!fileInput.files[0]) {
      setError('Please select an Excel file');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('excelFile', fileInput.files[0]);
    formData.append('username', user.username);
    formData.append('regional_office_code', user.regional_office_code);

    try {
      const response = await api.post('/establishment/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setSuccess(`Establishment data uploaded successfully! ${response.data.data.recordsProcessed} records processed. Establishment data has been automatically synced to RRC records.`);
        fileInput.value = '';
        // Refresh RRC data to show synced values
        if (rrcDataLoaded) {
          loadRRCData(true);
        }
      }
    } catch (err) {
      logger.error('Establishment upload error:', err);
      
      // Get error message from response, or use default message
      let errorMessage = 'Failed to upload establishment data';
      let missingColumns = null;
      
      if (err.response && err.response.data) {
        if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
        if (err.response.data.errors && err.response.data.errors.missingColumns) {
          missingColumns = err.response.data.errors.missingColumns;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // If there are missing columns, add them to the error message
      if (missingColumns && missingColumns.length > 0) {
        errorMessage = `${errorMessage}. Missing columns: ${missingColumns.join(', ')}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async (type) => {
    try {
      const response = await api.get(`/${type}/template`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_template.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSuccess(`${type.toUpperCase()} template downloaded successfully!`);
    } catch (err) {
      setError('Failed to download template');
    }
  };

  const syncEstablishmentToRRC = async () => {
    if (!user || !user.username) {
      setError('User not logged in');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post('/rrc/sync-establishment-data', {
        username: user.username
      });

      if (response.data.success) {
        setSuccess(`Establishment data synced to RRC successfully! ${response.data.data.synced} record(s) updated.`);
        // Refresh RRC data to show synced values
        loadRRCData(true);
      }
    } catch (err) {
      logger.error('Sync error:', err);
      setError(err.response?.data?.message || 'Failed to sync establishment data to RRC');
    } finally {
      setLoading(false);
    }
  };

  const exportRRCToExcel = () => {
    try {
      // Apply the same filtering logic as the view
      // Calculate OUTSTAND_TOT_WITH_REC_RRC for each ESTA_CODE
      const estaTotals = {};
      (rrcData || []).forEach(rrc => {
        const estaCode = rrc.ESTA_CODE;
        if (estaCode) {
          if (!estaTotals[estaCode]) {
            estaTotals[estaCode] = 0;
          }
          const outstandTotWithRec = parseFloat(rrc.OUTSTAND_TOT_WITH_REC || 0) || 0;
          estaTotals[estaCode] += outstandTotWithRec;
        }
      });

      // Filter RRC data based on search query and IR/NIR filter (same as view)
      let filteredRrcData = (rrcData || []).filter(rrc => {
        // Apply IR/NIR filter - exact match only
        if (rrcIrNirFilter) {
          const irNir = (rrc.IR_NIR || '').toString().trim().toUpperCase();
          if (rrcIrNirFilter === 'IR' && irNir !== 'IR') {
            return false;
          }
          if (rrcIrNirFilter === 'NIR' && irNir !== 'NIR') {
            return false;
          }
        }
        
        // Apply search query filter
        if (!rrcSearchQuery.trim()) return true;
        const query = rrcSearchQuery.toLowerCase().trim();
        const estaCode = (rrc.ESTA_CODE || '').toString().toLowerCase();
        const estaName = (rrc.ESTA_NAME || '').toString().toLowerCase();
        const rrcNo = (rrc.RRC_NO || '').toString().toLowerCase();
        return estaCode.includes(query) || estaName.includes(query) || rrcNo.includes(query);
      });

      // Add OUTSTAND_TOT_WITH_REC_RRC value to each RRC for sorting (same as view)
      filteredRrcData = filteredRrcData.map(rrc => ({
        ...rrc,
        _sortOutstandTotWithRecRrc: estaTotals[rrc.ESTA_CODE] || 0
      }));

      // Sort by OUTSTAND_TOT_WITH_REC_RRC in descending order (same as view)
      filteredRrcData.sort((a, b) => {
        const valueA = a._sortOutstandTotWithRecRrc || 0;
        const valueB = b._sortOutstandTotWithRecRrc || 0;
        return valueB - valueA; // Descending order
      });

      if (filteredRrcData.length === 0) {
        setError('No RRC data to export. Please apply different filters or ensure data is loaded.');
        return;
      }

      // Group by ESTA_CODE for ESTA-level fields (same logic as RRCTable)
      const estaGroups = {};
      filteredRrcData.forEach(rrc => {
        const estaCode = rrc.ESTA_CODE;
        if (!estaCode) return;
        if (!estaGroups[estaCode]) {
          estaGroups[estaCode] = [];
        }
        estaGroups[estaCode].push(rrc);
      });

      // Using imported utility functions from utils

      // ESTA-level fields (same as RRCTable)
      const ESTA_LEVEL_FIELDS = [
        'RO', 'ADD1', 'ADD2', 'CITY', 'DIST', 'PIN_CD', 'CIRCLE',
        'MOBILE_NO', 'EMAIL', 'STATUS', 'ESTA_PAN',
        'CP_1_DATE',
        'REMARKS', 'ENFORCEMENT_OFFICER',
        'RECOVERY_COST', 'RECEVIED_REC_COST', 'OUTSTAND_REC_COST', 'OUTSTAND_TOT_WITH_REC'
      ];

      // Prepare data for export - exact same fields and order as table
      const exportData = filteredRrcData.map((rrc, index) => {
        const estaRrcs = estaGroups[rrc.ESTA_CODE] || [];
        const firstEstaRrc = estaRrcs[0] || rrc;
        
        // For ESTA-level fields, use values from first RRC with same ESTA_CODE
        const displayRrc = { ...rrc };
        ESTA_LEVEL_FIELDS.forEach(field => {
          if (firstEstaRrc[field] !== undefined && firstEstaRrc[field] !== null) {
            displayRrc[field] = firstEstaRrc[field];
          }
        });

        // Create row with exact field order and format as shown in table
        return {
          'SN': index + 1,
          'ESTA CODE': rrc.ESTA_CODE || '-',
          'IR NIR': rrc.IR_NIR || '-',
          'ESTA NAME': rrc.ESTA_NAME || '-',
          'RRC NO': rrc.RRC_NO || '-',
          'RRC DATE': formatDate(rrc.RRC_DATE),
          'PERIOD': rrc.RRC_PERIOD || '-',
          'U/S': rrc.U_S || '-',
          'RACK LOCATION': rrc.RACK_LOCATION || '-',
          'RO': displayRrc.RO || '-',
          'ADD1': displayRrc.ADD1 || '-',
          'ADD2': displayRrc.ADD2 || '-',
          'CITY': displayRrc.CITY || '-',
          'DIST': displayRrc.DIST || '-',
          'PIN CD': displayRrc.PIN_CD || '-',
          'CIRCLE': displayRrc.CIRCLE || '-',
          'MOBILE NO': displayRrc.MOBILE_NO || '-',
          'EMAIL': displayRrc.EMAIL || '-',
          'STATUS': displayRrc.STATUS || '-',
          'ESTA PAN': displayRrc.ESTA_PAN || '-',
          'CP-1 DATE': formatDate(displayRrc.CP_1_DATE),
          'REMARKS': displayRrc.REMARKS || '-',
          'ENFORCEMENT OFFICER': displayRrc.ENFORCEMENT_OFFICER || '-',
          'DEMAND 7A': formatNumber(rrc.DEMAND_7A),
          'DEMAND 14B': formatNumber(rrc.DEMAND_14B),
          'DEMAND 7Q': formatNumber(rrc.DEMAND_7Q),
          'DEMAND TOTAL': formatNumber(rrc.DEMAND_TOTAL),
          'RECOVERY 7A': formatNumber(rrc.RECOVERY_7A),
          'RECOVERY 14B': formatNumber(rrc.RECOVERY_14B),
          'RECOVERY 7Q': formatNumber(rrc.RECOVERY_7Q),
          'RECOVERY TOTAL': formatNumber(rrc.RECOVERY_TOTAL),
          'OUTSTAND 7A': formatNumber(rrc.OUTSTAND_7A),
          'OUTSTAND 14B': formatNumber(rrc.OUTSTAND_14B),
          'OUTSTAND 7Q': formatNumber(rrc.OUTSTAND_7Q),
          'OUTSTAND TOTAL': formatNumber(rrc.OUTSTAND_TOTAL),
          'DEMAND 7A A/C 1_EE': formatNumber(rrc.DEMAND_7A_ACCOUNT_1_EE),
          'DEMAND 7A A/C 1_ER': formatNumber(rrc.DEMAND_7A_ACCOUNT_1_ER),
          'DEMAND 7A A/C 2': formatNumber(rrc.DEMAND_7A_ACCOUNT_2),
          'DEMAND 7A A/C 10': formatNumber(rrc.DEMAND_7A_ACCOUNT_10),
          'DEMAND 7A A/C 21': formatNumber(rrc.DEMAND_7A_ACCOUNT_21),
          'DEMAND 7A A/C 22': formatNumber(rrc.DEMAND_7A_ACCOUNT_22),
          'DEMAND 14B A/C 1': formatNumber(rrc.DEMAND_14B_ACCOUNT_1),
          'DEMAND 14B A/C 2': formatNumber(rrc.DEMAND_14B_ACCOUNT_2),
          'DEMAND 14B A/C 10': formatNumber(rrc.DEMAND_14B_ACCOUNT_10),
          'DEMAND 14B A/C 21': formatNumber(rrc.DEMAND_14B_ACCOUNT_21),
          'DEMAND 14B A/C 22': formatNumber(rrc.DEMAND_14B_ACCOUNT_22),
          'DEMAND 7Q A/C 1': formatNumber(rrc.DEMAND_7Q_ACCOUNT_1),
          'DEMAND 7Q A/C 2': formatNumber(rrc.DEMAND_7Q_ACCOUNT_2),
          'DEMAND 7Q A/C 10': formatNumber(rrc.DEMAND_7Q_ACCOUNT_10),
          'DEMAND 7Q A/C 21': formatNumber(rrc.DEMAND_7Q_ACCOUNT_21),
          'DEMAND 7Q A/C 22': formatNumber(rrc.DEMAND_7Q_ACCOUNT_22),
          'RECOVERY 7A A/C 1_EE': formatNumber(rrc.RECOVERY_7A_ACCOUNT_1_EE),
          'RECOVERY 7A A/C 1_ER': formatNumber(rrc.RECOVERY_7A_ACCOUNT_1_ER),
          'RECOVERY 7A A/C 2': formatNumber(rrc.RECOVERY_7A_ACCOUNT_2),
          'RECOVERY 7A A/C 10': formatNumber(rrc.RECOVERY_7A_ACCOUNT_10),
          'RECOVERY 7A A/C 21': formatNumber(rrc.RECOVERY_7A_ACCOUNT_21),
          'RECOVERY 7A A/C 22': formatNumber(rrc.RECOVERY_7A_ACCOUNT_22),
          'RECOVERY 14B A/C 1': formatNumber(rrc.RECOVERY_14B_ACCOUNT_1),
          'RECOVERY 14B A/C 2': formatNumber(rrc.RECOVERY_14B_ACCOUNT_2),
          'RECOVERY 14B A/C 10': formatNumber(rrc.RECOVERY_14B_ACCOUNT_10),
          'RECOVERY 14B A/C 21': formatNumber(rrc.RECOVERY_14B_ACCOUNT_21),
          'RECOVERY 14B A/C 22': formatNumber(rrc.RECOVERY_14B_ACCOUNT_22),
          'RECOVERY 7Q A/C 1': formatNumber(rrc.RECOVERY_7Q_ACCOUNT_1),
          'RECOVERY 7Q A/C 2': formatNumber(rrc.RECOVERY_7Q_ACCOUNT_2),
          'RECOVERY 7Q A/C 10': formatNumber(rrc.RECOVERY_7Q_ACCOUNT_10),
          'RECOVERY 7Q A/C 21': formatNumber(rrc.RECOVERY_7Q_ACCOUNT_21),
          'RECOVERY 7Q A/C 22': formatNumber(rrc.RECOVERY_7Q_ACCOUNT_22),
          'OUTSTAND 7A A/C 1_EE': formatNumber(rrc.OUTSTAND_7A_ACCOUNT_1_EE),
          'OUTSTAND 7A A/C 1_ER': formatNumber(rrc.OUTSTAND_7A_ACCOUNT_1_ER),
          'OUTSTAND 7A A/C 2': formatNumber(rrc.OUTSTAND_7A_ACCOUNT_2),
          'OUTSTAND 7A A/C 10': formatNumber(rrc.OUTSTAND_7A_ACCOUNT_10),
          'OUTSTAND 7A A/C 21': formatNumber(rrc.OUTSTAND_7A_ACCOUNT_21),
          'OUTSTAND 7A A/C 22': formatNumber(rrc.OUTSTAND_7A_ACCOUNT_22),
          'OUTSTAND 14B A/C 1': formatNumber(rrc.OUTSTAND_14B_ACCOUNT_1),
          'OUTSTAND 14B A/C 2': formatNumber(rrc.OUTSTAND_14B_ACCOUNT_2),
          'OUTSTAND 14B A/C 10': formatNumber(rrc.OUTSTAND_14B_ACCOUNT_10),
          'OUTSTAND 14B A/C 21': formatNumber(rrc.OUTSTAND_14B_ACCOUNT_21),
          'OUTSTAND 14B A/C 22': formatNumber(rrc.OUTSTAND_14B_ACCOUNT_22),
          'OUTSTAND 7Q A/C 1': formatNumber(rrc.OUTSTAND_7Q_ACCOUNT_1),
          'OUTSTAND 7Q A/C 2': formatNumber(rrc.OUTSTAND_7Q_ACCOUNT_2),
          'OUTSTAND 7Q A/C 10': formatNumber(rrc.OUTSTAND_7Q_ACCOUNT_10),
          'OUTSTAND 7Q A/C 21': formatNumber(rrc.OUTSTAND_7Q_ACCOUNT_21),
          'OUTSTAND 7Q A/C 22': formatNumber(rrc.OUTSTAND_7Q_ACCOUNT_22),
          'RECOVERY_COST': formatNumber(displayRrc.RECOVERY_COST),
          'RECEVIED_REC_COST': formatNumber(displayRrc.RECEVIED_REC_COST),
          'OUTSTAND_REC_COST': formatNumber(displayRrc.OUTSTAND_REC_COST),
          'OUTSTAND_TOT_WITH_REC': formatNumber(displayRrc.OUTSTAND_TOT_WITH_REC),
          'DEMAND TOTAL RRC': formatNumber(rrc.DEMAND_TOTAL_RRC),
          'RECOVERY TOTAL RRC': formatNumber(rrc.RECOVERY_TOTAL_RRC),
          'OUTSTAND TOTAL RRC': formatNumber(rrc.OUTSTAND_TOTAL_RRC),
          'OUTSTAND TOT WITH REC RRC': formatNumber(rrc.OUTSTAND_TOT_WITH_REC_RRC)
        };
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'RRC Data');

      // Generate filename with filter info
      let filename = 'RRC_Data';
      if (rrcIrNirFilter) {
        filename += `_${rrcIrNirFilter}`;
      } else {
        filename += '_ALL';
      }
      if (rrcSearchQuery.trim()) {
        filename += `_Filtered`;
      }
      filename += `_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Write and download
      XLSX.writeFile(wb, filename);
      
      setSuccess(`RRC data exported successfully! ${filteredRrcData.length} record(s) exported.`);
    } catch (err) {
      logger.error('Export error:', err);
      setError('Failed to export RRC data to Excel. Please try again.');
    }
  };

  // RRC and establishment values are already extracted above (lines 96-123)

  const handleRecoverySuccess = () => {
    // Always refresh RRC data after recovery is saved (RRC data is updated in backend)
    // Force reload to get the latest data
    loadRRCData(true);
    // Trigger refresh of Recovery Logs
    setRecoveryLogsRefresh(prev => prev + 1);
    // Switch to View RRC Data tab to show updated data
    setActiveTab('view-rrc');
    setSuccess('Recovery transaction saved successfully! RRC data has been updated.');
  };

  // Show logged in view
  if (loggedIn && user) {
    return (
      <div className="app" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Alert Messages at the top - Government Style */}
        {error && (
          <div className="gov-alert gov-alert-error" style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            minWidth: '300px',
            maxWidth: '90%',
            textAlign: 'center',
            animation: 'slideDown 0.3s ease-out'
          }}>
            {error}
          </div>
        )}
        {success && (
          <div className="gov-alert gov-alert-success" style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            minWidth: '350px',
            maxWidth: '90%',
            textAlign: 'center',
            fontSize: '16px',
            fontWeight: '500',
            animation: 'slideDown 0.3s ease-out'
          }}>
            ✓ {success}
          </div>
        )}
        
        <div className="gov-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>EPFO Recovery Soft</h1>
            <button 
              onClick={handleLogout} 
              className="gov-btn gov-btn-secondary"
              style={{ 
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'var(--gov-white)',
                borderColor: 'rgba(255, 255, 255, 0.3)'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="gov-card" style={{ marginBottom: '20px' }}>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--gov-primary)' }}>
            Welcome, {user.username}!
          </p>
          <p style={{ fontSize: '12px', color: 'var(--gov-gray-600)', marginTop: '8px', marginBottom: 0 }}>
            ✅ <strong>Data isolation by username:</strong> Each user has separate office details and recovery proceedings. Your username <strong>{user.username}</strong> ensures complete data separation.
          </p>
        </div>

        {/* Tabs - Government Style */}
        <div className="gov-tabs" style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('office')}
            className={activeTab === 'office' ? 'gov-tab active' : 'gov-tab'}
          >
            Office Details
          </button>
          <button
            onClick={() => setActiveTab('rrc')}
            className={activeTab === 'rrc' ? 'gov-tab active' : 'gov-tab'}
          >
            RRC Upload
          </button>
          <button
            onClick={() => setActiveTab('establishment')}
            className={activeTab === 'establishment' ? 'gov-tab active' : 'gov-tab'}
          >
            Establishment Upload
          </button>
          <button
            onClick={() => {
              setActiveTab('view-rrc');
              setShowTrashInRRC(false); // Reset trash view when switching to View RRC Data tab
              // Always load data when clicking the tab to ensure fresh data
              loadRRCData(true);
            }}
            className={activeTab === 'view-rrc' ? 'gov-tab active' : 'gov-tab'}
          >
            View RRC Data
          </button>
          <button
            onClick={() => {
              setActiveTab('view-establishment');
              // Load data only if not already loaded
              if (!establishmentDataLoaded || establishmentData.length === 0) {
                loadEstablishmentData();
              }
            }}
            className={activeTab === 'view-establishment' ? 'gov-tab active' : 'gov-tab'}
          >
            View Establishment Data
          </button>
          <button
            onClick={() => setActiveTab('recovery')}
            className={activeTab === 'recovery' ? 'gov-tab active' : 'gov-tab'}
          >
            Recovery Entry
          </button>
          <button
            onClick={() => setActiveTab('recovery-logs')}
            className={activeTab === 'recovery-logs' ? 'gov-tab active' : 'gov-tab'}
          >
            Recovery Logs
          </button>
          <button
            onClick={() => setActiveTab('enforcement-officer')}
            className={activeTab === 'enforcement-officer' ? 'gov-tab active' : 'gov-tab'}
          >
            AREA E.O. PIN CODES
          </button>
          <button
            onClick={() => {
              setActiveTab('reports');
              // Load RRC data if not already loaded
              if (!rrcDataLoaded || rrcData.length === 0) {
                loadRRCData(true);
              }
            }}
            className={activeTab === 'reports' ? 'gov-tab active' : 'gov-tab'}
          >
            REPORTS
          </button>
        </div>

        {/* Office Details Tab */}
        {activeTab === 'office' && (
          <OfficeForm
            officeFormData={officeFormData}
            dispatchNoError={dispatchNoError}
            loading={loading}
            setOfficeFormData={setOfficeFormData}
            handleOfficeSubmit={handleOfficeSubmit}
            handleAddOfficer={handleAddOfficer}
            handleRemoveOfficer={handleRemoveOfficer}
            handleOfficerChange={handleOfficerChange}
            handleDispatchNoChange={handleDispatchNoChange}
          />
        )}

        {/* RRC Upload Tab */}
        {activeTab === 'rrc' && (
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <h2>RRC Data Upload</h2>
            <p style={{ marginBottom: '15px', color: '#666' }}>
              Upload Excel or CSV file with RRC data. Required columns: ESTA CODE, ESTA NAME, RRC NO, RRC DATE
            </p>
            <div style={{ marginBottom: '15px' }}>
              <button
                type="button"
                onClick={() => downloadTemplate('rrc')}
                style={{ padding: '8px 16px', marginRight: '10px', background: '#17a2b8', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                Download Template
              </button>
            </div>
            <form onSubmit={handleRRCUpload}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Select Excel or CSV File:</label>
                <input
                  type="file"
                  name="excelFile"
                  accept=".xlsx,.xls,.csv"
                  required
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
                {loading ? 'Uploading...' : 'Upload RRC Data'}
              </button>
            </form>
          </div>
        )}

        {/* Establishment Upload Tab */}
        {activeTab === 'establishment' && (
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <h2>Establishment Data Upload</h2>
            <p style={{ marginBottom: '15px', color: '#666' }}>
              Upload Excel or CSV file with Establishment/Muster data. Required column: ESTA CODE (or EST_ID)
            </p>
            <p style={{ marginBottom: '15px', fontSize: '12px', color: '#666' }}>
              <strong>Accepted column formats:</strong><br/>
              Original: ESTA CODE, ESTA NAME, ADD1, ADD2, CITY, DIST, PIN CODE, CIRCLE, MOBILE NO, EMAIL, STATUS, ESTABLISHMENT PAN<br/>
              Alternate: EST_ID, EST_NAME, INCROP_ADDRESS1, INCROP_ADDRESS2, INCROP_CITY, INCROP_DIST (for DIST), INCROP_PIN, ENF_TASK_ID (for CIRCLE), MOBILE_SEEDED, PRIMARY_EMAIL, EST_STATUS_NAME, PAN
            </p>
            <div style={{ marginBottom: '15px' }}>
              <button
                type="button"
                onClick={() => downloadTemplate('establishment')}
                style={{ padding: '8px 16px', marginRight: '10px', background: '#17a2b8', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                Download Template
              </button>
            </div>
            <form onSubmit={handleEstablishmentUpload}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Select Excel or CSV File:</label>
                <input
                  type="file"
                  name="excelFile"
                  accept=".xlsx,.xls,.csv"
                  required
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>
              <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
                {loading ? 'Uploading...' : 'Upload Establishment Data'}
              </button>
            </form>
          </div>
        )}

        {/* View RRC Data Tab */}
        {activeTab === 'view-rrc' && (
          <div className="gov-card" style={{ minHeight: '200px' }}>
            {/* Loading State */}
            {loadingData && (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="gov-spinner" style={{ margin: '0 auto 20px' }}></div>
                <div style={{ fontSize: '16px', color: 'var(--gov-gray-700)', fontWeight: '500' }}>
                  Loading RRC data...
                </div>
                <div style={{ fontSize: '12px', color: 'var(--gov-gray-500)', marginTop: '8px' }}>
                  Please wait while we fetch your data
                </div>
              </div>
            )}
            
            {/* Error State */}
            {!loadingData && error && (
              <div className="gov-alert gov-alert-error" style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Error loading RRC data:</div>
                <div>{error}</div>
                <button 
                  onClick={() => {
                    setError('');
                    loadRRCData(true);
                  }}
                  className="gov-btn gov-btn-primary"
                  style={{ marginTop: '12px' }}
                >
                  Retry
                </button>
              </div>
            )}
            
            {/* Content - Only show when not loading */}
            {!loadingData && (
              <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ color: showTrashInRRC ? '#8b5cf6' : 'inherit' }}>
                {showTrashInRRC ? '🗑️ Trash - Deleted RRC Records' : (() => {
                  const filteredCount = rrcSearchQuery.trim() 
                    ? (rrcData || []).filter(rrc => {
                        const query = rrcSearchQuery.toLowerCase().trim();
                        const estaCode = (rrc.ESTA_CODE || '').toString().toLowerCase();
                        const estaName = (rrc.ESTA_NAME || '').toString().toLowerCase();
                        const rrcNo = (rrc.RRC_NO || '').toString().toLowerCase();
                        return estaCode.includes(query) || estaName.includes(query) || rrcNo.includes(query);
                      }).length
                    : rrcData.length;
                  return `RRC Data (${filteredCount}${rrcSearchQuery.trim() ? ` of ${rrcData.length}` : ''} records)`;
                })()}
              </h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                {!showTrashInRRC && (
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {/* IR/NIR Filter Buttons */}
                    <button
                      onClick={() => setRrcIrNirFilter(null)}
                      style={{
                        padding: '6px 16px',
                        background: rrcIrNirFilter === null ? '#007bff' : '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: rrcIrNirFilter === null ? 'bold' : 'normal'
                      }}
                    >
                      ALL
                    </button>
                    <button
                      onClick={() => setRrcIrNirFilter(rrcIrNirFilter === 'IR' ? null : 'IR')}
                      style={{
                        padding: '6px 16px',
                        background: rrcIrNirFilter === 'IR' ? '#007bff' : '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: rrcIrNirFilter === 'IR' ? 'bold' : 'normal'
                      }}
                    >
                      IR
                    </button>
                    <button
                      onClick={() => setRrcIrNirFilter(rrcIrNirFilter === 'NIR' ? null : 'NIR')}
                      style={{
                        padding: '6px 16px',
                        background: rrcIrNirFilter === 'NIR' ? '#007bff' : '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: rrcIrNirFilter === 'NIR' ? 'bold' : 'normal'
                      }}
                    >
                      NIR
                    </button>
                    <input
                      type="text"
                      placeholder="Search by ESTA CODE, ESTA NAME, or RRC NO..."
                      value={rrcSearchQuery}
                      onChange={(e) => setRrcSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        minWidth: '250px'
                      }}
                    />
                    <button
                      onClick={() => setRrcSearchQuery('')}
                      disabled={!rrcSearchQuery}
                      style={{
                        padding: '6px 12px',
                        background: rrcSearchQuery ? '#dc3545' : '#ccc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: rrcSearchQuery ? 'pointer' : 'not-allowed',
                        fontSize: '14px'
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (showTrashInRRC) {
                      // Switch back to RRC data view
                      setShowTrashInRRC(false);
                    } else {
                      // Switch to trash view
                      setShowTrashInRRC(true);
                      // Load trash data only if not already loaded
                      if (!trashDataLoaded || trashData.length === 0) {
                        loadTrashData();
                      }
                    }
                  }}
                  style={{ 
                    padding: '8px 16px', 
                    background: showTrashInRRC ? '#6c757d' : 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', 
                    color: 'white', 
                    border: 'none', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderRadius: '8px',
                    boxShadow: showTrashInRRC ? 'none' : '0 2px 8px rgba(139, 92, 246, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  title={showTrashInRRC ? "View RRC Data" : "View Trash"}
                >
                  <span style={{ fontSize: '16px' }}>🗑️</span>
                  <span>{showTrashInRRC ? 'Back to RRC Data' : 'Trash'}</span>
                </button>
                {!showTrashInRRC && (
                  <button
                    onClick={syncEstablishmentToRRC}
                    disabled={loading || loadingData}
                    style={{ 
                      padding: '8px 16px', 
                      background: loading || loadingData ? '#ccc' : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', 
                      color: 'white', 
                      border: 'none', 
                      cursor: loading || loadingData ? 'not-allowed' : 'pointer',
                      borderRadius: '8px',
                      boxShadow: loading || loadingData ? 'none' : '0 2px 8px rgba(40, 167, 69, 0.3)',
                      transition: 'all 0.3s ease'
                    }}
                    title="Sync Establishment Data to RRC"
                  >
                    {loading ? 'Syncing...' : '🔄 Sync'}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (showTrashInRRC) {
                      loadTrashData(true);
                    } else {
                      loadRRCData(true);
                    }
                  }}
                  disabled={loadingData}
                  style={{ padding: '8px 16px', background: '#17a2b8', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                >
                  {loadingData ? 'Loading...' : 'Refresh'}
                </button>
                {!showTrashInRRC && (
                  <button
                    onClick={exportRRCToExcel}
                    disabled={loadingData || !rrcData || rrcData.length === 0}
                    style={{ 
                      padding: '8px 16px', 
                      background: loadingData || !rrcData || rrcData.length === 0 ? '#ccc' : '#28a745', 
                      color: 'white', 
                      border: 'none', 
                      cursor: loadingData || !rrcData || rrcData.length === 0 ? 'not-allowed' : 'pointer',
                      borderRadius: '4px'
                    }}
                    title="Export filtered RRC data to Excel"
                  >
                    Export to Excel
                  </button>
                )}
              </div>
            </div>
            
            {showTrashInRRC ? (
              // Trash View
              <>
                <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
                  Deleted RRC records are stored here. You can restore them or permanently delete them.
                </p>
                
                {loadingData ? (
                  <div style={{ textAlign: 'center', padding: '20px' }}>Loading trash data...</div>
                ) : trashData.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    No deleted RRC records found. Trash is empty.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5', zIndex: 10 }}>
                        <tr>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', color: 'white' }}>SN</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', color: 'white' }}>ESTA CODE</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', color: 'white' }}>ESTA NAME</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', color: 'white' }}>RRC NO</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', color: 'white' }}>RRC DATE</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', color: 'white' }}>DELETED AT</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)', color: 'white' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trashData.map((rrc, index) => (
                          <tr key={rrc._id} style={{ background: index % 2 === 0 ? 'white' : '#f9f9f9' }}>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{rrc.ESTA_CODE || '-'}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{rrc.ESTA_NAME || '-'}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{rrc.RRC_NO || '-'}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                              {rrc.RRC_DATE ? new Date(rrc.RRC_DATE).toLocaleDateString('en-IN') : '-'}
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                              {rrc.deletedAt ? new Date(rrc.deletedAt).toLocaleString('en-IN') : '-'}
                            </td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleRestoreRRC(rrc._id)}
                                  disabled={loadingData}
                                  style={{
                                    padding: '4px 12px',
                                    background: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    cursor: loadingData ? 'not-allowed' : 'pointer',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                  }}
                                >
                                  Restore
                                </button>
                                <button
                                  onClick={() => handlePermanentDeleteRRC(rrc._id)}
                                  disabled={loadingData}
                                  style={{
                                    padding: '4px 12px',
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                                    color: 'white',
                                    border: 'none',
                                    cursor: loadingData ? 'not-allowed' : 'pointer',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  Delete Forever
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              // RRC Data View
              <>
                <p style={{ marginBottom: '15px', fontSize: '12px', color: '#666' }}>
                  <strong>Note:</strong> Click on any row to edit, update, or delete RRC data. Scroll horizontally to view all columns. RRC-level fields are unique per RRC_NO. 
                  ESTA-level fields (RECOVERY_COST, RECEVIED_REC_COST, etc.) are the same for all RRCs with the same ESTA_CODE.
                </p>
                {(() => {
                  try {
                    // Calculate OUTSTAND_TOT_WITH_REC_RRC for each ESTA_CODE (sum of OUTSTAND_TOT_WITH_REC for all RRCs with same ESTA_CODE)
                    const estaTotals = {};
                    (rrcData || []).forEach(rrc => {
                      const estaCode = rrc.ESTA_CODE;
                      if (estaCode) {
                        if (!estaTotals[estaCode]) {
                          estaTotals[estaCode] = 0;
                        }
                        const outstandTotWithRec = parseFloat(rrc.OUTSTAND_TOT_WITH_REC || 0) || 0;
                        estaTotals[estaCode] += outstandTotWithRec;
                      }
                    });

                    // Filter RRC data based on search query and IR/NIR filter
                    let filteredRrcData = (rrcData || []).filter(rrc => {
                      // Apply IR/NIR filter - exact match only
                      if (rrcIrNirFilter) {
                        const irNir = (rrc.IR_NIR || '').toString().trim().toUpperCase();
                        if (rrcIrNirFilter === 'IR' && irNir !== 'IR') {
                          return false;
                        }
                        if (rrcIrNirFilter === 'NIR' && irNir !== 'NIR') {
                          return false;
                        }
                      }
                      
                      // Apply search query filter
                      if (!rrcSearchQuery.trim()) return true;
                      const query = rrcSearchQuery.toLowerCase().trim();
                      const estaCode = (rrc.ESTA_CODE || '').toString().toLowerCase();
                      const estaName = (rrc.ESTA_NAME || '').toString().toLowerCase();
                      const rrcNo = (rrc.RRC_NO || '').toString().toLowerCase();
                      return estaCode.includes(query) || estaName.includes(query) || rrcNo.includes(query);
                    });

                    // Add OUTSTAND_TOT_WITH_REC_RRC value to each RRC for sorting
                    filteredRrcData = filteredRrcData.map(rrc => ({
                      ...rrc,
                      _sortOutstandTotWithRecRrc: estaTotals[rrc.ESTA_CODE] || 0
                    }));

                    // Sort by OUTSTAND_TOT_WITH_REC_RRC in descending order
                    filteredRrcData.sort((a, b) => {
                      const valueA = a._sortOutstandTotWithRecRrc || 0;
                      const valueB = b._sortOutstandTotWithRecRrc || 0;
                      return valueB - valueA; // Descending order
                    });
                    
                    return (
                      <RRCTable 
                        rrcData={filteredRrcData} 
                        loading={loadingData} 
                        error={error} 
                        username={user?.username || ''}
                        establishmentData={establishmentData || []}
                        officeData={officeData}
                        onRefresh={() => {
                          loadRRCData(true);
                          // Also refresh trash data if trash view is shown
                          if (showTrashInRRC && trashDataLoaded) {
                            loadTrashData(true);
                          }
                        }}
                        onSuccess={(message) => {
                          setSuccess(message);
                        }}
                      />
                    );
                  } catch (err) {
                    logger.error('Error rendering RRCTable:', err);
                    return (
                      <div style={{ padding: '20px', color: 'red', border: '1px solid #f5c6cb', borderRadius: '4px', background: '#f8d7da' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Error rendering RRC Table:</div>
                        <div style={{ marginBottom: '10px' }}>{err.message || String(err)}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                          Check browser console (F12) for more details.
                        </div>
                        <button 
                          onClick={() => window.location.reload()} 
                          style={{ 
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
                })()}
              </>
            )}
              </>
            )}
          </div>
        )}

        {/* View Establishment Data Tab */}
        {activeTab === 'view-establishment' && (
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <h2>{(() => {
                const filteredCount = establishmentSearchQuery.trim() 
                  ? (establishmentData || []).filter(est => {
                      const query = establishmentSearchQuery.toLowerCase().trim();
                      const estaCode = (est.ESTA_CODE || '').toString().toLowerCase();
                      const estaName = (est.ESTA_NAME || '').toString().toLowerCase();
                      const city = (est.CITY || '').toString().toLowerCase();
                      const dist = (est.DIST || '').toString().toLowerCase();
                      const pinCode = (est.PIN_CODE || '').toString().toLowerCase();
                      const circle = (est.CIRCLE || '').toString().toLowerCase();
                      return estaCode.includes(query) || estaName.includes(query) || city.includes(query) || dist.includes(query) || pinCode.includes(query) || circle.includes(query);
                    }).length
                  : establishmentData.length;
                return `Establishment Data (${filteredCount}${establishmentSearchQuery.trim() ? ` of ${establishmentData.length}` : ''} records)`;
              })()}</h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Search by ESTA CODE, ESTA NAME, CITY, DIST, PIN..."
                    value={establishmentSearchQuery}
                    onChange={(e) => {
                      setEstablishmentSearchQuery(e.target.value);
                      setEstablishmentCurrentPage(1); // Reset to first page when searching
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      minWidth: '250px'
                    }}
                  />
                  <button
                    onClick={() => {
                      setEstablishmentSearchQuery('');
                      setEstablishmentCurrentPage(1);
                    }}
                    disabled={!establishmentSearchQuery}
                    style={{
                      padding: '6px 12px',
                      background: establishmentSearchQuery ? '#dc3545' : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: establishmentSearchQuery ? 'pointer' : 'not-allowed',
                      fontSize: '14px'
                    }}
                  >
                    Clear
                  </button>
                </div>
              <button
                onClick={() => loadEstablishmentData(true)}
                disabled={loadingData}
                style={{ padding: '8px 16px', background: '#17a2b8', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                {loadingData ? 'Loading...' : 'Refresh'}
              </button>
              </div>
            </div>
            {loadingData ? (
              <p>Loading Establishment data...</p>
            ) : establishmentData.length === 0 ? (
              <p style={{ color: '#666' }}>No Establishment data found. Upload an Excel/CSV file to get started.</p>
            ) : (() => {
              // Filter establishment data based on search query
              const filteredEstablishmentData = (establishmentData || []).filter(est => {
                if (!establishmentSearchQuery.trim()) return true;
                const query = establishmentSearchQuery.toLowerCase().trim();
                const estaCode = (est.ESTA_CODE || '').toString().toLowerCase();
                const estaName = (est.ESTA_NAME || '').toString().toLowerCase();
                const city = (est.CITY || '').toString().toLowerCase();
                const dist = (est.DIST || '').toString().toLowerCase();
                const pinCode = (est.PIN_CODE || '').toString().toLowerCase();
                const circle = (est.CIRCLE || '').toString().toLowerCase();
                return estaCode.includes(query) || estaName.includes(query) || city.includes(query) || dist.includes(query) || pinCode.includes(query) || circle.includes(query);
              });
              
              // Pagination logic: 100 rows per page
              const rowsPerPage = 100;
              const totalPages = Math.ceil(filteredEstablishmentData.length / rowsPerPage);
              const startIndex = (establishmentCurrentPage - 1) * rowsPerPage;
              const endIndex = startIndex + rowsPerPage;
              const currentPageData = filteredEstablishmentData.slice(startIndex, endIndex);
              
              return (
                <>
                  <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 250px)', maxWidth: '100%', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '1200px' }}>
                      <thead>
                        <tr style={{ background: '#f5f5f5', position: 'sticky', top: 0, zIndex: 10 }}>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: '#f5f5f5' }}>SN</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: '#f5f5f5' }}>ESTA CODE</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: '#f5f5f5' }}>ESTA NAME</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: '#f5f5f5' }}>INCROP_ADDRESS1<br/>(ADD1)</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: '#f5f5f5' }}>INCROP_ADDRESS2<br/>(ADD2)</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: '#f5f5f5' }}>INCROP_CITY<br/>(CITY)</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: '#f5f5f5' }}>INCROP_DIST<br/>(DIST)</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: '#f5f5f5' }}>PIN CODE</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: '#f5f5f5' }}>CIRCLE</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: '#f5f5f5' }}>MOBILE NO</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: '#f5f5f5' }}>EMAIL</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: '#f5f5f5' }}>STATUS</th>
                          <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', background: '#f5f5f5' }}>ESTABLISHMENT PAN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPageData.map((est, index) => (
                          <tr key={startIndex + index} style={{ background: index % 2 === 0 ? 'white' : '#f9f9f9' }}>
                            <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{startIndex + index + 1}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{est.ESTA_CODE || '-'}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{est.ESTA_NAME || '-'}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{est.ADD1 || '-'}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{est.ADD2 || '-'}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{est.CITY || '-'}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{est.DIST || '-'}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{est.PIN_CODE || '-'}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{est.CIRCLE || '-'}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{est.MOBILE_NO || '-'}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{est.EMAIL || '-'}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{est.STATUS || '-'}</td>
                            <td style={{ padding: '8px', border: '1px solid #ddd' }}>{est.ESTABLISHMENT_PAN || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          onClick={() => setEstablishmentCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={establishmentCurrentPage === 1}
                          style={{
                            padding: '6px 12px',
                            background: establishmentCurrentPage === 1 ? '#ccc' : '#007bff',
                            color: 'white',
                            border: 'none',
                            cursor: establishmentCurrentPage === 1 ? 'not-allowed' : 'pointer',
                            borderRadius: '4px'
                          }}
                        >
                          Previous
                        </button>
                        <span style={{ padding: '0 10px' }}>
                          Page {establishmentCurrentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setEstablishmentCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={establishmentCurrentPage === totalPages}
                          style={{
                            padding: '6px 12px',
                            background: establishmentCurrentPage === totalPages ? '#ccc' : '#007bff',
                            color: 'white',
                            border: 'none',
                            cursor: establishmentCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                            borderRadius: '4px'
                          }}
                        >
                          Next
                        </button>
                      </div>
                      <div style={{ color: '#666', fontSize: '14px' }}>
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredEstablishmentData.length)} of {filteredEstablishmentData.length} {establishmentSearchQuery.trim() ? `(filtered from ${establishmentData.length} total)` : ''} records
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Recovery Entry Tab */}
        {activeTab === 'recovery' && (
          <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
            <RecoveryForm 
              user={user} 
              officeData={officeData}
              onSuccess={handleRecoverySuccess}
              initialFormData={recoveryFormData}
              onFormDataChange={setRecoveryFormData}
            />
          </div>
        )}

        {/* Recovery Logs Tab */}
        {activeTab === 'recovery-logs' && (
          <div style={{ border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box', background: '#fff' }}>
            <RecoveryLogs 
              user={user} 
              officeData={officeData}
              refreshTrigger={recoveryLogsRefresh}
              onDelete={() => {
                // Refresh RRC data after recovery deletion
                loadRRCData(true);
              }}
            />
          </div>
        )}

        {/* Enforcement Officer Tab */}
        {activeTab === 'enforcement-officer' && (
          <div style={{ border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box', background: '#fff' }}>
            <EnforcementOfficer user={user} />
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <ReportsSection
            activeReport={activeReport}
            setActiveReport={setActiveReport}
            rrcData={rrcData}
            setError={setError}
            setSuccess={setSuccess}
          />
        )}

        {/* Messages */}
        {error && (
          <div style={{ marginTop: '20px', padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ marginTop: '20px', padding: '10px', background: '#d4edda', color: '#155724', borderRadius: '4px' }}>
            {success}
          </div>
        )}
      </div>
    );
  }

  // Show login or register form
  return (
    <div className="app">
      <h1>EPFO Recovery Soft</h1>
      
      {/* Alert Messages at the top */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px 20px',
          borderRadius: '4px',
          border: '1px solid #f5c6cb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000,
          minWidth: '300px',
          maxWidth: '90%',
          textAlign: 'center',
          animation: 'slideDown 0.3s ease-out'
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '12px 20px',
          borderRadius: '4px',
          border: '1px solid #c3e6cb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000,
          minWidth: '300px',
          maxWidth: '90%',
          textAlign: 'center',
          animation: 'slideDown 0.3s ease-out'
        }}>
          {success}
        </div>
      )}
      
      {!auth.showRegister ? (
        // Login Form
        <>
          <form onSubmit={auth.handleLogin}>
            <h2>Login</h2>
            <div>
              <label>Username:</label>
              <input
                type="text"
                value={auth.username}
                onChange={(e) => auth.setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Password:</label>
              <input
                type="password"
                value={auth.password}
                onChange={(e) => auth.setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={auth.loading}>
              {auth.loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p style={{ marginTop: '20px' }}>
            Don't have an account?{' '}
            <button type="button" onClick={() => {
              auth.setShowRegister(true);
              setError('');
              setSuccess('');
              auth.setPassword('');
              auth.setConfirmPassword('');
            }}>
              Register
            </button>
          </p>
        </>
      ) : (
        // Register Form
        <>
          <form onSubmit={auth.handleRegister}>
            <h2>Register</h2>
            <div>
              <label>Username:</label>
              <input
                type="text"
                value={auth.username}
                onChange={(e) => auth.setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Password:</label>
              <input
                type="password"
                value={auth.password}
                onChange={(e) => auth.setPassword(e.target.value)}
                required
                minLength={6}
              />
              <small style={{ display: 'block', color: '#666', fontSize: '12px', marginTop: '4px' }}>
                Password must be at least 6 characters long
              </small>
            </div>
            <div>
              <label>Confirm Password:</label>
              <input
                type="password"
                value={auth.confirmPassword}
                onChange={(e) => auth.setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <button type="submit" disabled={auth.loading}>
              {auth.loading ? 'Registering...' : 'Register'}
            </button>
          </form>
          <p style={{ marginTop: '20px' }}>
            Already have an account?{' '}
            <button type="button" onClick={() => {
              auth.setShowRegister(false);
              setError('');
              setSuccess('');
              auth.setPassword('');
              auth.setConfirmPassword('');
            }}>
              Login
            </button>
          </p>
        </>
      )}
    </div>
  );
}

export default App;
