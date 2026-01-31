import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/api.js';
import logger from '../../utils/logger.js';

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
    logger.error('SummonPopup: Error calculating hearing date:', err);
    return '';
  }
};

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
  maxWidth: '600px',
  width: '90%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
};

function SummonPopup({
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
      hearingDate: calculateHearingDateLocal(today),
      hearingTime: '15:00',
      remark: '',
      loading: false,
      error: '',
    };
  });

  const updateState = (patch) => {
    setState((prev) => ({ ...prev, ...patch }));
  };

  // Auto-calculate hearing date when notice date changes
  useEffect(() => {
    if (state.noticeDate) {
      const calculatedHearingDate = calculateHearingDateLocal(state.noticeDate);
      if (calculatedHearingDate) {
        updateState({ hearingDate: calculatedHearingDate });
      }
    }
  }, [state.noticeDate]);

  // Auto-generate remark
  useEffect(() => {
    if (state.noticeDate && isOpen) {
      const formattedDate = formatDateForRemarkLocal(state.noticeDate);
      if (formattedDate) {
        const defaultRemark = `${formattedDate} - Summon issued`;
        updateState({ remark: defaultRemark });
      }
    }
  }, [state.noticeDate, isOpen]);

  // Handle generate
  const handleGenerate = async () => {
    if (!editRow || !username || !state.noticeDate) {
      updateState({ error: 'Please enter notice date' });
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
        '/notices/summon/generate',
        {
          username,
          estaCode: editRow.ESTA_CODE,
          rrcNo: editRow.RRC_NO,
          noticeDate: state.noticeDate,
          hearingDate: state.hearingDate,
          hearingTime: state.hearingTime,
          regionalOfficeName: officeData?.regional_office_name || '',
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
      let filename = 'Summon.docx';
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
        onSuccess('Summon notice generated and downloaded successfully!');
      }
      onClose();
    } catch (err) {
      logger.error('SummonPopup: Summon generation failed', err);
      let errorMessage = 'Failed to generate Summon notice';
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
            ⚖️ Generate Summon Notice
          </h2>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            Enter details for Summon notice generation
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
              Summon Notice Date: *
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
              Hearing Date: *
            </label>
            <input
              type="date"
              value={state.hearingDate}
              onChange={(e) => updateState({ hearingDate: e.target.value })}
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
              Hearing Time: *
            </label>
            <input
              type="time"
              value={state.hearingTime}
              onChange={(e) => updateState({ hearingTime: e.target.value })}
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
            disabled={state.loading || !state.noticeDate || !state.hearingDate || !state.hearingTime}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              border: 'none',
              borderRadius: '8px',
              background: (state.loading || !state.noticeDate || !state.hearingDate || !state.hearingTime)
                ? '#ccc'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              cursor: (state.loading || !state.noticeDate || !state.hearingDate || !state.hearingTime) ? 'not-allowed' : 'pointer',
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

export default React.memo(SummonPopup);
