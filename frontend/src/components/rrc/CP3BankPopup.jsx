import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/api.js';
import logger from '../../utils/logger.js';

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
};

function CP3BankPopup({
  isOpen,
  onClose,
  editRow,
  username,
  officeData,
  establishmentMap,
  onRefresh,
  onSuccess,
}) {
  if (!isOpen || !editRow || !username) {
    return null;
  }

  const establishment = establishmentMap[editRow.ESTA_CODE];

  const [state, setState] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      noticeDate: today,
      bankAddress: '',
      bankAccountNumbers: '',
      employerName: '',
      employerPAN: establishment?.ESTABLISHMENT_PAN || editRow?.ESTA_PAN || '',
      employerMobile: establishment?.MOBILE_NO || editRow?.MOBILE_NO || '',
      enforcementOfficer: editRow?.ENFORCEMENT_OFFICER || '',
      remark: '',
      loading: false,
      error: '',
      savedEmployerNames: [],
    };
  });

  const updateState = (patch) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  // Load saved employer names
  useEffect(() => {
    if (isOpen && editRow && username) {
      loadSavedEmployerNames();
    }
  }, [isOpen, editRow, username]);

  // Fetch enforcement officer from RRC data
  useEffect(() => {
    if (isOpen && editRow && username && editRow.PIN_CD) {
      fetchEnforcementOfficer();
    }
  }, [isOpen, editRow, username]);

  // Auto-generate remark
  useEffect(() => {
    if (state.noticeDate && isOpen) {
      const formattedDate = formatDateForRemarkLocal(state.noticeDate);
      if (formattedDate) {
        const defaultRemark = `${formattedDate} - CP-3 Bank issued`;
        updateState({ remark: defaultRemark });
      }
    }
  }, [state.noticeDate, isOpen]);

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
      logger.error('CP3BankPopup: Error loading saved employer names:', err);
    }
  };

  const fetchEnforcementOfficer = async () => {
    if (!editRow?.PIN_CD || !username) {
      updateState({ enforcementOfficer: editRow?.ENFORCEMENT_OFFICER || '' });
      return;
    }
    try {
      const response = await api.get('/rrc', { params: { username } });
      if (response.data.success) {
        const rrcs = response.data.data || [];
        const rrc = rrcs.find(
          (item) => item.PIN_CD && item.PIN_CD.trim() === editRow.PIN_CD.trim(),
        );
        if (rrc && rrc.ENFORCEMENT_OFFICER) {
          updateState({ enforcementOfficer: rrc.ENFORCEMENT_OFFICER });
        } else {
          updateState({ enforcementOfficer: editRow?.ENFORCEMENT_OFFICER || '' });
        }
      }
    } catch (err) {
      logger.error('CP3BankPopup: Error fetching enforcement officer:', err);
      updateState({ enforcementOfficer: editRow?.ENFORCEMENT_OFFICER || '' });
    }
  };

  // Handle generate
  const handleGenerate = async () => {
    if (!editRow || !username || !state.noticeDate) {
      updateState({ error: 'Please enter notice date' });
      return;
    }

    if (!state.bankAddress || !state.bankAddress.trim()) {
      updateState({ error: 'Please enter bank address' });
      return;
    }

    if (!state.bankAccountNumbers || !state.bankAccountNumbers.trim()) {
      updateState({ error: 'Please enter bank account numbers' });
      return;
    }

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
        '/notices/cp3-bank/generate',
        {
          username,
          estaCode: editRow.ESTA_CODE,
          rrcNo: editRow.RRC_NO,
          noticeDate: state.noticeDate,
          bankAddress: state.bankAddress.trim(),
          bankAccountNumbers: state.bankAccountNumbers.trim(),
          employerName: state.employerName.trim(),
          employerPAN: state.employerPAN.trim(),
          employerMobile: state.employerMobile.trim(),
          regionalOfficeName: officeData?.regional_office_name || '',
          enforcementOfficer: state.enforcementOfficer.trim(),
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
      let filename = 'CP-3_Bank.docx';
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

      // Close popup and notify
      if (onRefresh) onRefresh();
      if (onSuccess) {
        onSuccess('CP-3 Bank notice generated and downloaded successfully!');
      }
      onClose();
    } catch (err) {
      logger.error('CP3BankPopup: CP-3 Bank generation failed', err);
      let errorMessage = 'Failed to generate CP-3 Bank notice';
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
      <div style={POPUP_CONTAINER_STYLE} onClick={(e) => e.stopPropagation()}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '24px', fontWeight: '600' }}>
            🏦 Generate CP-3 Bank Notice
          </h2>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            Enter details for CP-3 Bank (Prohibitory Order) notice generation
          </p>
        </div>

        {state.error && (
          <div style={{
            marginBottom: '15px',
            padding: '12px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            color: '#c33',
            fontSize: '14px'
          }}>
            ⚠️ {state.error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              CP-3 Bank Notice Date: *
            </label>
            <input
              type="date"
              value={state.noticeDate}
              onChange={(e) => updateState({ noticeDate: e.target.value })}
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

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Bank Address: *
            </label>
            <textarea
              value={state.bankAddress}
              onChange={(e) => updateState({ bankAddress: e.target.value })}
              disabled={state.loading}
              placeholder="Enter complete bank address"
              rows={4}
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

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Bank Account Numbers: *
            </label>
            <input
              type="text"
              value={state.bankAccountNumbers}
              onChange={(e) => updateState({ bankAccountNumbers: e.target.value })}
              disabled={state.loading}
              placeholder="Enter bank account number(s)"
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

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Employer Name (optional):
            </label>
            {state.savedEmployerNames.length > 0 ? (
              <select
                value={state.employerName}
                onChange={(e) => updateState({ employerName: e.target.value })}
                disabled={state.loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  marginBottom: '8px',
                }}
              >
                <option value="">-- Select or enter below --</option>
                {state.savedEmployerNames.map((name, idx) => (
                  <option key={idx} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : null}
            <input
              type="text"
              value={state.employerName}
              onChange={(e) => updateState({ employerName: e.target.value })}
              disabled={state.loading}
              placeholder="Enter employer name (optional)"
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

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Employer PAN (optional):
            </label>
            <input
              type="text"
              value={state.employerPAN}
              onChange={(e) => updateState({ employerPAN: e.target.value })}
              disabled={state.loading}
              placeholder="Auto-filled from establishment data"
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

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Employer Mobile (optional):
            </label>
            <input
              type="text"
              value={state.employerMobile}
              onChange={(e) => updateState({ employerMobile: e.target.value })}
              disabled={state.loading}
              placeholder="Auto-filled from establishment data"
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

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Enforcement Officer (optional):
            </label>
            <input
              type="text"
              value={state.enforcementOfficer}
              onChange={(e) => updateState({ enforcementOfficer: e.target.value })}
              disabled={state.loading}
              placeholder="Auto-filled from RRC data"
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

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Remark (optional):
            </label>
            <textarea
              value={state.remark}
              onChange={(e) => updateState({ remark: e.target.value })}
              disabled={state.loading}
              placeholder="Auto-generated remark"
              rows={3}
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
        </div>

        <div style={{ marginTop: '30px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            disabled={state.loading}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              border: '2px solid #ddd',
              borderRadius: '8px',
              background: '#fff',
              color: '#333',
              cursor: state.loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={state.loading || !state.noticeDate || !state.bankAddress.trim() || !state.bankAccountNumbers.trim()}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              border: 'none',
              borderRadius: '8px',
              background: (state.loading || !state.noticeDate || !state.bankAddress.trim() || !state.bankAccountNumbers.trim())
                ? '#ccc'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              cursor: (state.loading || !state.noticeDate || !state.bankAddress.trim() || !state.bankAccountNumbers.trim()) ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s',
            }}
          >
            {state.loading ? '⏳ Generating...' : '📥 Generate & Download'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, portalTarget);
}

export default React.memo(CP3BankPopup);
