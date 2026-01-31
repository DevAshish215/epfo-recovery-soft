/**
 * Recovery Logs Component
 * Displays all recovery transactions for the logged-in user
 * Shows all recovery entries in a table format with account-wise allocation breakdown
 */

import { useState, useEffect } from 'react';
import api from '../api/api.js';
import RecoveryForm from './RecoveryForm.jsx';
import * as XLSX from 'xlsx';
import logger from '../utils/logger.js';

function RecoveryLogs({ user, officeData, refreshTrigger, onDelete }) {
  const [recoveries, setRecoveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [editingRecovery, setEditingRecovery] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    if (user && user.username) {
      loadRecoveries();
    }
  }, [user, refreshTrigger]);

  const loadRecoveries = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/recovery/all?username=${user.username}`);
      if (response.data && response.data.success) {
        setRecoveries(response.data.data || []);
      }
    } catch (err) {
      let errorMessage = 'Failed to load recovery data';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
      setRecoveries([]);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return (num || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const formatDate = (date) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('en-IN');
    } catch {
      return '-';
    }
  };

  const handleDelete = async (recoveryId) => {
    if (!window.confirm('Are you sure you want to delete this recovery transaction? This will also update the RRC financial data.')) {
      return;
    }

    setDeletingId(recoveryId);
    setError('');
    
    try {
      await api.delete(`/recovery/${recoveryId}?username=${user.username}`);
      // Reload recoveries after successful deletion
      await loadRecoveries();
      // Call onDelete callback to refresh RRC data
      if (onDelete) {
        onDelete();
      }
    } catch (err) {
      let errorMessage = 'Failed to delete recovery transaction';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (recovery) => {
    // Format dates for form inputs (YYYY-MM-DD)
    const formatDateForInput = (date) => {
      if (!date) return '';
      try {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch {
        return '';
      }
    };

    setEditingRecovery({
      ...recovery,
      RECOVERY_DATE: formatDateForInput(recovery.RECOVERY_DATE),
      DD_TRRN_DATE: formatDateForInput(recovery.DD_TRRN_DATE),
    });
  };

  const handleEditCancel = () => {
    setEditingRecovery(null);
  };

  const handleEditSuccess = async () => {
    setEditingRecovery(null);
    // Reload recoveries after successful update
    await loadRecoveries();
    // Call onDelete callback to refresh RRC data (same effect as delete)
    if (onDelete) {
      onDelete();
    }
  };

  const handleGenerateLetterToCash = async (recovery) => {
    if (!recovery || !user || !user.username) {
      setError('Invalid recovery data');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await api.post('/notices/dd-to-cash/generate', {
        username: user.username,
        recoveryId: recovery._id,
        officeData: officeData || {}
      }, {
        responseType: 'blob'
      });

      // Download the generated file
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'DD_to_Cash_Letter.docx';
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
    } catch (err) {
      let errorMessage = 'Failed to generate DD to Cash letter';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const downloadRecoveryTemplate = async () => {
    try {
      const response = await api.get('/recovery/template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'recovery_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setUploadSuccess('Recovery template downloaded successfully!');
      setError('');
    } catch (err) {
      setError('Failed to download template');
      setUploadSuccess('');
    }
  };

  const handleBulkRecoveryUpload = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');
    setUploadLoading(true);

    const fileInput = e.target.excelFile;
    if (!fileInput.files[0]) {
      setUploadError('Please select an Excel file');
      setUploadLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('excelFile', fileInput.files[0]);
    formData.append('username', user.username);
    formData.append('regional_office_code', user.regional_office_code || '');

    try {
      const response = await api.post('/recovery/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const result = response.data.data;
        let message = `Recovery data uploaded successfully! ${result.recordsProcessed} record(s) processed.`;
        
        if (result.recordsFailed > 0) {
          message += ` ${result.recordsFailed} record(s) failed.`;
          if (result.errors && result.errors.length > 0) {
            const errorDetails = result.errors.slice(0, 5).map(err => `Row ${err.row}: ${err.error}`).join('\n');
            message += `\n\nErrors:\n${errorDetails}`;
            if (result.errors.length > 5) {
              message += `\n... and ${result.errors.length - 5} more errors.`;
            }
          }
        }
        
        setUploadSuccess(message);
        setUploadError('');
        fileInput.value = '';
        // Reload recoveries after successful upload
        await loadRecoveries();
        // Refresh RRC data
        if (onDelete) {
          onDelete();
        }
        // Close modal after successful upload (wait 2 seconds to show success message)
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadSuccess('');
          setUploadError('');
        }, 2000);
      } else {
        // Handle case where response is not successful but no exception thrown
        const errorMessage = response.data.message || 'Upload failed. Please try again.';
        setUploadError(errorMessage);
        setUploadSuccess('');
        // Modal stays open - user must close it manually
      }
    } catch (err) {
      let errorMessage = 'Failed to upload recovery data';
      
      if (err.response && err.response.data) {
        if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
        // Handle RRC validation errors
        if (err.response.data.errors && err.response.data.errors.invalidRRCs) {
          const invalidRRCs = err.response.data.errors.invalidRRCs;
          errorMessage = `Upload rejected: The following RRC numbers are not present in RRC data:\n\n${invalidRRCs.map(rrc => `Row ${rrc.row}: ESTA_CODE: ${rrc.ESTA_CODE}, RRC_NO: ${rrc.RRC_NO}`).join('\n')}\n\nPlease ensure all ESTA_CODE and RRC_NO combinations exist in RRC data before uploading.`;
        }
        // Handle missing columns
        if (err.response.data.errors && err.response.data.errors.missingColumns) {
          const missingColumns = err.response.data.errors.missingColumns;
          errorMessage = `${errorMessage}. Missing columns: ${missingColumns.join(', ')}`;
        }
      }
      
      // Set error and ensure modal stays open
      setUploadError(errorMessage);
      setUploadSuccess('');
      // Explicitly ensure modal remains open - do NOT close it on error
      // Modal will only close when user clicks X or Cancel, or after successful upload
    } finally {
      setUploadLoading(false);
      // Do NOT close modal here - it should stay open on errors
    }
  };

  // Filter recoveries based on search query
  const filteredRecoveries = (recoveries || []).filter(recovery => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const estaCode = (recovery.ESTA_CODE || '').toString().toLowerCase();
    const rrcNo = (recovery.RRC_NO || '').toString().toLowerCase();
    const bankName = (recovery.BANK_NAME || '').toString().toLowerCase();
    const referenceNumber = (recovery.REFERENCE_NUMBER || '').toString().toLowerCase();
    const transactionType = (recovery.TRANSACTION_TYPE || '').toString().toLowerCase();
    return estaCode.includes(query) || rrcNo.includes(query) || bankName.includes(query) || referenceNumber.includes(query) || transactionType.includes(query);
  });

  const exportRecoveryLogsToExcel = () => {
    try {
      if (filteredRecoveries.length === 0) {
        setError('No recovery data to export. Please apply different filters or ensure data is loaded.');
        return;
      }

      // Prepare data for export - exact same fields and order as table
      const exportData = filteredRecoveries.map((recovery, index) => {
        return {
          'SN': index + 1,
          'ESTA_CODE': recovery.ESTA_CODE || '-',
          'RRC_NO': recovery.RRC_NO || '-',
          'Recovery Date': formatDate(recovery.RECOVERY_DATE),
          'DD/TRRN Date': formatDate(recovery.DD_TRRN_DATE),
          'Bank Name': recovery.BANK_NAME || '-',
          'DD/TRRN Number': recovery.REFERENCE_NUMBER || '-',
          'Type': recovery.TRANSACTION_TYPE || '-',
          'Recovery Amount': formatNumber(recovery.RECOVERY_AMOUNT),
          '7A A/C 1_EE': formatNumber(recovery.ALLOCATED_7A_ACCOUNT_1_EE || 0),
          '7A A/C 1_ER': formatNumber(recovery.ALLOCATED_7A_ACCOUNT_1_ER || 0),
          '7A A/C 2': formatNumber(recovery.ALLOCATED_7A_ACCOUNT_2 || 0),
          '7A A/C 10': formatNumber(recovery.ALLOCATED_7A_ACCOUNT_10 || 0),
          '7A A/C 21': formatNumber(recovery.ALLOCATED_7A_ACCOUNT_21 || 0),
          '7A A/C 22': formatNumber(recovery.ALLOCATED_7A_ACCOUNT_22 || 0),
          '7Q A/C 1': formatNumber(recovery.ALLOCATED_7Q_ACCOUNT_1 || 0),
          '7Q A/C 2': formatNumber(recovery.ALLOCATED_7Q_ACCOUNT_2 || 0),
          '7Q A/C 10': formatNumber(recovery.ALLOCATED_7Q_ACCOUNT_10 || 0),
          '7Q A/C 21': formatNumber(recovery.ALLOCATED_7Q_ACCOUNT_21 || 0),
          '7Q A/C 22': formatNumber(recovery.ALLOCATED_7Q_ACCOUNT_22 || 0),
          '14B A/C 1': formatNumber(recovery.ALLOCATED_14B_ACCOUNT_1 || 0),
          '14B A/C 2': formatNumber(recovery.ALLOCATED_14B_ACCOUNT_2 || 0),
          '14B A/C 10': formatNumber(recovery.ALLOCATED_14B_ACCOUNT_10 || 0),
          '14B A/C 21': formatNumber(recovery.ALLOCATED_14B_ACCOUNT_21 || 0),
          '14B A/C 22': formatNumber(recovery.ALLOCATED_14B_ACCOUNT_22 || 0),
          'Total 7A': formatNumber(recovery.ALLOCATED_7A || 0),
          'Total 7Q': formatNumber(recovery.ALLOCATED_7Q || 0),
          'Total 14B': formatNumber(recovery.ALLOCATED_14B || 0),
          'Recovery Cost': formatNumber(recovery.RECOVERY_COST || 0)
        };
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Recovery Logs');

      // Generate filename with filter info
      let filename = 'Recovery_Logs';
      if (searchQuery.trim()) {
        filename += `_Filtered`;
      }
      filename += `_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Write and download
      XLSX.writeFile(wb, filename);
      
      setError(''); // Clear any previous errors
      setSuccess(`Recovery logs exported successfully! ${filteredRecoveries.length} record(s) exported.`);
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      logger.error('Export error:', err);
      setError('Failed to export recovery logs to Excel. Please try again.');
      setSuccess('');
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', padding: '20px', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>
          Recovery Logs ({filteredRecoveries.length}{searchQuery.trim() ? ` of ${recoveries.length}` : ''} records)
        </h2>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by ESTA CODE, RRC NO, Bank Name, Reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            onClick={() => setSearchQuery('')}
            disabled={!searchQuery}
            style={{
              padding: '6px 12px',
              background: searchQuery ? '#dc3545' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: searchQuery ? 'pointer' : 'not-allowed',
              fontSize: '14px'
            }}
          >
            Clear
          </button>
          <button
            onClick={exportRecoveryLogsToExcel}
            disabled={loading || filteredRecoveries.length === 0}
            style={{
              padding: '6px 12px',
              background: loading || filteredRecoveries.length === 0 ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || filteredRecoveries.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px'
            }}
            title="Export filtered recovery logs to Excel"
          >
            Export to Excel
          </button>
          <button
            onClick={() => {
              setShowUploadModal(true);
              setUploadError('');
              setUploadSuccess('');
            }}
            style={{
              padding: '6px 12px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Upload Bulk Recovery
          </button>
        </div>
      </div>
      
      {success && (
        <div style={{ marginBottom: '15px', padding: '10px', background: '#d4edda', color: '#155724', borderRadius: '4px' }}>
          {success}
        </div>
      )}
      
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
          Loading recovery logs...
        </div>
      ) : error ? (
        <div style={{ padding: '20px', color: 'red', background: '#f8d7da', borderRadius: '4px' }}>
          {error}
        </div>
      ) : recoveries.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666', background: '#f8f9fa', borderRadius: '4px' }}>
          No recovery transactions found. Recovery entries will appear here after saving.
        </div>
      ) : filteredRecoveries.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#666', background: '#f8f9fa', borderRadius: '4px' }}>
          No recovery transactions match your search query. Try a different search term.
        </div>
      ) : (
        <div style={{ width: '100%', boxSizing: 'border-box', overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #ddd', minWidth: '2500px' }}>
            <thead>
              <tr style={{ background: '#e9ecef', position: 'sticky', top: 0, zIndex: 10 }}>
                {/* Basic Info Columns */}
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', minWidth: '40px' }}>SN</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold', minWidth: '100px' }}>ESTA_CODE</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold', minWidth: '100px' }}>RRC_NO</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold', minWidth: '90px' }}>Recovery Date</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold', minWidth: '90px' }}>DD/TRRN Date</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold', minWidth: '120px' }}>Bank Name</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold', minWidth: '100px' }}>DD/TRRN Number</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold', minWidth: '90px' }}>Type</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', minWidth: '120px' }}>Recovery Amount</th>
                
                {/* Section 7A - Account-wise */}
                <th colSpan="6" style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', background: '#fff3cd' }}>Section 7A - Account-wise</th>
                
                {/* Section 7Q - Account-wise */}
                <th colSpan="5" style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', background: '#d1ecf1' }}>Section 7Q - Account-wise</th>
                
                {/* Section 14B - Account-wise */}
                <th colSpan="5" style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', background: '#d4edda' }}>Section 14B - Account-wise</th>
                
                {/* Section Totals */}
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', minWidth: '100px' }}>Total 7A</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', minWidth: '100px' }}>Total 7Q</th>
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', minWidth: '100px' }}>Total 14B</th>
                
                {/* Recovery Cost */}
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', minWidth: '100px', background: '#f8d7da' }}>Recovery Cost</th>
                
                {/* Action */}
                <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', minWidth: '80px' }}>Action</th>
              </tr>
              
              {/* Sub-header row for account columns */}
              <tr style={{ background: '#f8f9fa', position: 'sticky', top: '35px', zIndex: 9 }}>
                <th colSpan="9"></th>
                {/* 7A Accounts */}
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#fff3cd' }}>1_EE</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#fff3cd' }}>1_ER</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#fff3cd' }}>2</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#fff3cd' }}>10</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#fff3cd' }}>21</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#fff3cd' }}>22</th>
                {/* 7Q Accounts */}
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#d1ecf1' }}>1</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#d1ecf1' }}>2</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#d1ecf1' }}>10</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#d1ecf1' }}>21</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#d1ecf1' }}>22</th>
                {/* 14B Accounts */}
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#d4edda' }}>1</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#d4edda' }}>2</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#d4edda' }}>10</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#d4edda' }}>21</th>
                <th style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', fontSize: '10px', background: '#d4edda' }}>22</th>
                <th colSpan="5"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRecoveries.map((recovery, index) => (
                <tr key={recovery._id || index} style={{ background: index % 2 === 0 ? 'white' : '#f9f9f9' }}>
                  {/* Basic Info */}
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{recovery.ESTA_CODE || '-'}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{recovery.RRC_NO || '-'}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{formatDate(recovery.RECOVERY_DATE)}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{formatDate(recovery.DD_TRRN_DATE)}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{recovery.BANK_NAME || '-'}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{recovery.REFERENCE_NUMBER || '-'}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{recovery.TRANSACTION_TYPE || '-'}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatNumber(recovery.RECOVERY_AMOUNT)}
                  </td>
                  
                  {/* Section 7A - Account-wise */}
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#fff3cd' }}>
                    {formatNumber(recovery.ALLOCATED_7A_ACCOUNT_1_EE || 0)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#fff3cd' }}>
                    {formatNumber(recovery.ALLOCATED_7A_ACCOUNT_1_ER || 0)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#fff3cd' }}>
                    {formatNumber(recovery.ALLOCATED_7A_ACCOUNT_2 || 0)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#fff3cd' }}>
                    {formatNumber(recovery.ALLOCATED_7A_ACCOUNT_10 || 0)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#fff3cd' }}>
                    {formatNumber(recovery.ALLOCATED_7A_ACCOUNT_21 || 0)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#fff3cd' }}>
                    {formatNumber(recovery.ALLOCATED_7A_ACCOUNT_22 || 0)}
                  </td>
                  
                  {/* Section 7Q - Account-wise */}
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#d1ecf1' }}>
                    {formatNumber(recovery.ALLOCATED_7Q_ACCOUNT_1 || 0)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#d1ecf1' }}>
                    {formatNumber(recovery.ALLOCATED_7Q_ACCOUNT_2 || 0)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#d1ecf1' }}>
                    {formatNumber(recovery.ALLOCATED_7Q_ACCOUNT_10 || 0)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#d1ecf1' }}>
                    {formatNumber(recovery.ALLOCATED_7Q_ACCOUNT_21 || 0)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#d1ecf1' }}>
                    {formatNumber(recovery.ALLOCATED_7Q_ACCOUNT_22 || 0)}
                  </td>
                  
                  {/* Section 14B - Account-wise */}
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#d4edda' }}>
                    {formatNumber(recovery.ALLOCATED_14B_ACCOUNT_1 || 0)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#d4edda' }}>
                    {formatNumber(recovery.ALLOCATED_14B_ACCOUNT_2 || 0)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#d4edda' }}>
                    {formatNumber(recovery.ALLOCATED_14B_ACCOUNT_10 || 0)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#d4edda' }}>
                    {formatNumber(recovery.ALLOCATED_14B_ACCOUNT_21 || 0)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', background: '#d4edda' }}>
                    {formatNumber(recovery.ALLOCATED_14B_ACCOUNT_22 || 0)}
                  </td>
                  
                  {/* Section Totals */}
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatNumber(recovery.ALLOCATED_7A || 0)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatNumber(recovery.ALLOCATED_7Q || 0)}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>
                    {formatNumber(recovery.ALLOCATED_14B || 0)}
                  </td>
                  
                  {/* Recovery Cost */}
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', background: '#f8d7da' }}>
                    {formatNumber(recovery.RECOVERY_COST || 0)}
                  </td>
                  
                  {/* Action */}
                  <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleEdit(recovery)}
                        disabled={deletingId === recovery._id || loading}
                        style={{
                          padding: '5px 10px',
                          background: (deletingId === recovery._id || loading) ? '#ccc' : '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: (deletingId === recovery._id || loading) ? 'not-allowed' : 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}
                        title="Edit this recovery transaction"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(recovery._id)}
                        disabled={deletingId === recovery._id || loading}
                        style={{
                          padding: '5px 10px',
                          background: (deletingId === recovery._id || loading) ? '#ccc' : '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: (deletingId === recovery._id || loading) ? 'not-allowed' : 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}
                        title="Delete this recovery transaction"
                      >
                        {deletingId === recovery._id ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        onClick={() => handleGenerateLetterToCash(recovery)}
                        disabled={loading || deletingId === recovery._id}
                        style={{
                          padding: '5px 10px',
                          background: (loading || deletingId === recovery._id) ? '#ccc' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: (loading || deletingId === recovery._id) ? 'not-allowed' : 'pointer',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}
                        title="Generate Letter to Cash Section"
                      >
                        Letter to Cash
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Bulk Recovery Modal */}
      {showUploadModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            zIndex: 1000,
            overflowY: 'auto',
            padding: '20px'
          }}
          onClick={(e) => {
            // Only close if clicking the backdrop (not the modal content) and there's no error
            if (e.target === e.currentTarget && !uploadError) {
              setShowUploadModal(false);
              setUploadSuccess('');
              setUploadError('');
            }
          }}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              width: '100%',
              maxWidth: '600px',
              marginTop: '20px',
              marginBottom: '20px',
              boxSizing: 'border-box',
              maxHeight: '95vh',
              overflowY: 'auto'
            }}
            onClick={(e) => {
              // Prevent clicks inside modal from closing it
              e.stopPropagation();
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Bulk Recovery Entry Upload</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadSuccess('');
                  setUploadError('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
              Upload Excel file with recovery data. Required columns: ESTA_CODE, RRC_NO, RECOVERY_AMOUNT, BANK_NAME, RECOVERY_DATE, DD_TRRN_DATE, REFERENCE_NUMBER, TRANSACTION_TYPE.
              Account-wise allocation columns (7A_AC_*, 14B_AC_*, 7Q_AC_*) are mandatory. RECOVERY_AMOUNT must equal the sum of all account allocations plus RECOVERY_COST (if any).
              Optional columns: TOTAL_7A, TOTAL_14B, TOTAL_7Q (for display/reference only - computed automatically from account-wise values), RECOVERY_COST.
            </p>
            <div style={{ marginBottom: '15px' }}>
              <button
                type="button"
                onClick={downloadRecoveryTemplate}
                style={{ padding: '8px 16px', marginRight: '10px', background: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
              >
                Download Template
              </button>
            </div>
            <form onSubmit={handleBulkRecoveryUpload}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Select Excel or CSV File:</label>
                <input
                  type="file"
                  name="excelFile"
                  accept=".xlsx,.xls,.csv"
                  required
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="submit" 
                  disabled={uploadLoading} 
                  style={{ padding: '10px 20px', background: uploadLoading ? '#6c757d' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: uploadLoading ? 'not-allowed' : 'pointer', fontSize: '14px' }}
                >
                  {uploadLoading ? 'Uploading...' : 'Upload Bulk Recovery'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadSuccess('');
                    setUploadError('');
                  }}
                  style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                >
                  Cancel
                </button>
              </div>
            </form>
            {uploadSuccess && (
              <div style={{ marginTop: '15px', padding: '10px', background: '#d4edda', color: '#155724', borderRadius: '4px', fontSize: '14px', whiteSpace: 'pre-line' }}>
                {uploadSuccess}
              </div>
            )}
            {uploadError && (
              <div style={{ marginTop: '15px', padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '14px', whiteSpace: 'pre-line' }}>
                {uploadError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRecovery && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          zIndex: 1000,
          overflowY: 'auto',
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            width: '100%',
            maxWidth: '95%',
            marginTop: '20px',
            marginBottom: '20px',
            boxSizing: 'border-box',
            maxHeight: '95vh',
            overflowY: 'auto'
          }}>
            <RecoveryForm
              user={user}
              editMode={true}
              recoveryId={editingRecovery._id}
              initialFormData={{
                ESTA_CODE: editingRecovery.ESTA_CODE || '',
                RRC_NO: editingRecovery.RRC_NO || '',
                RECOVERY_AMOUNT: editingRecovery.RECOVERY_AMOUNT || '',
                BANK_NAME: editingRecovery.BANK_NAME || '',
                RECOVERY_DATE: editingRecovery.RECOVERY_DATE || '',
                DD_TRRN_DATE: editingRecovery.DD_TRRN_DATE || '',
                REFERENCE_NUMBER: editingRecovery.REFERENCE_NUMBER || '',
                TRANSACTION_TYPE: editingRecovery.TRANSACTION_TYPE || 'DD',
                RECOVERY_COST: editingRecovery.RECOVERY_COST || '',
              }}
              onSuccess={handleEditSuccess}
              onCancel={handleEditCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default RecoveryLogs;
