import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/api.js';
import logger from '../../utils/logger.js';

const formatDateForRemarkLocal = (dateValue) => {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
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
  maxWidth: '750px',
  width: '90%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  fontSize: '14px',
  border: '2px solid #ddd',
  borderRadius: '8px',
  boxSizing: 'border-box',
};

const textareaStyle = {
  ...inputStyle,
  resize: 'vertical',
  minHeight: '80px',
};

let employerRowId = 0;

function IncomeTaxLetterPopup({
  isOpen,
  onClose,
  editRow,
  username,
  officeData,
  establishmentMap,
  onRefresh,
  onSuccess,
}) {
  if (!isOpen || !editRow || !username) return null;

  const establishment = establishmentMap?.[editRow.ESTA_CODE];
  const defaultPAN = establishment?.ESTABLISHMENT_PAN || editRow?.ESTA_PAN || '';

  const [state, setState] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      noticeDate: today,
      incomeTaxAddress: '',
      officeAddress: officeData?.regional_office_address || '',
      officerName: '',
      officerFatherName: '',
      officerDesignation: officeData?.officer_designation || 'Regional PF Commissioner - II',
      employers: [],
      remark: '',
      loading: false,
      error: '',
      savedEmployerNames: [],
      addFromSavedValue: '',
    };
  });

  const updateState = (patch) => setState((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    if (!isOpen || !editRow || !username) return;
    const load = async () => {
      try {
        const res = await api.get(`/employer-address/${editRow.ESTA_CODE}/names`, { params: { username } });
        if (res.data?.success && Array.isArray(res.data.data)) {
          updateState({ savedEmployerNames: res.data.data });
        }
      } catch (err) {
        logger.error('IncomeTaxLetterPopup: load employer names', err);
      }
    };
    load();
  }, [isOpen, editRow?.ESTA_CODE, username]);

  useEffect(() => {
    if (!state.noticeDate || !isOpen) return;
    const formatted = formatDateForRemarkLocal(state.noticeDate);
    if (formatted) {
      updateState({ remark: `${formatted} - Income Tax Letter issued` });
    }
  }, [state.noticeDate, isOpen]);

  const addEmployerRow = (name = '', pan = '', designation = '') => {
    const row = { id: ++employerRowId, name, pan, designation };
    updateState({ employers: [...state.employers, row] });
  };

  const removeEmployerRow = (id) => {
    updateState({ employers: state.employers.filter((e) => e.id !== id) });
  };

  const updateEmployerRow = (id, field, value) => {
    updateState({
      employers: state.employers.map((e) =>
        e.id === id ? { ...e, [field]: value } : e
      ),
    });
  };

  const handleAddFromSaved = () => {
    const v = (state.addFromSavedValue || '').trim();
    if (!v) return;
    addEmployerRow(v, defaultPAN, '');
    updateState({ addFromSavedValue: '' });
  };

  const handleGenerate = async () => {
    if (!state.noticeDate) {
      updateState({ error: 'Please enter notice date' });
      return;
    }
    if (!state.incomeTaxAddress?.trim()) {
      updateState({ error: 'Please enter Income Tax (Pr. Chief Commissioner) address' });
      return;
    }

    const employersPayload = state.employers.map((e) => ({
      name: String(e.name || '').trim(),
      pan: String(e.pan || '').trim(),
      designation: String(e.designation || '').trim(),
    }));

    try {
      updateState({ loading: true, error: '' });
      const response = await api.post(
        '/notices/income-tax-letter/generate',
        {
          username,
          estaCode: editRow.ESTA_CODE,
          rrcNo: editRow.RRC_NO,
          noticeDate: state.noticeDate,
          incomeTaxAddress: state.incomeTaxAddress.trim(),
          officeAddress: state.officeAddress?.trim() || '',
          officerName: state.officerName.trim(),
          officerFatherName: state.officerFatherName.trim(),
          officerDesignation: state.officerDesignation.trim(),
          employers: employersPayload,
          regionalOfficeName: officeData?.regional_office_name || '',
          remark: state.remark?.trim() || '',
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cd = response.headers['content-disposition'];
      let filename = 'Income_Tax_Letter.docx';
      if (cd) {
        const m = cd.match(/filename="?(.+)"?/i);
        if (m) filename = m[1];
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      if (onRefresh) onRefresh();
      if (onSuccess) onSuccess('Income Tax Letter generated and downloaded successfully!');
      onClose();
    } catch (err) {
      logger.error('IncomeTaxLetterPopup: generate failed', err);
      let msg = 'Failed to generate Income Tax Letter';
      if (err.response?.data) {
        try {
          const t = await (typeof err.response.data.text === 'function' ? err.response.data.text() : Promise.resolve(String(err.response.data)));
          const j = JSON.parse(t);
          if (j?.message) msg = j.message;
        } catch (_) {}
      } else if (err.message) msg = err.message;
      updateState({ error: msg });
    } finally {
      updateState({ loading: false });
    }
  };

  const handleCancel = () => {
    if (state.loading) return;
    onClose();
  };

  const portalTarget = document.body;
  const canGenerate = state.noticeDate && state.incomeTaxAddress?.trim() && !state.loading;

  const content = (
    <div
      style={POPUP_BACKDROP_STYLE}
      onClick={(e) => {
        if (e.target === e.currentTarget && !state.loading) handleCancel();
      }}
    >
      <div style={POPUP_CONTAINER_STYLE} onClick={(e) => e.stopPropagation()}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '24px', fontWeight: '600' }}>
            📄 Generate Income Tax Letter
          </h2>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            Application u/s 138 IT Act + Form 46. Enter officer (signing letter), Pr. Chief Commissioner address, and employers (Name, PAN, Designation).
          </p>
        </div>

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Letter Date: *
            </label>
            <input
              type="date"
              value={state.noticeDate}
              onChange={(e) => updateState({ noticeDate: e.target.value })}
              disabled={state.loading}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Income Tax Address (Pr. Chief Commissioner of Income Tax): *
            </label>
            <textarea
              value={state.incomeTaxAddress}
              onChange={(e) => updateState({ incomeTaxAddress: e.target.value })}
              disabled={state.loading}
              placeholder="Full address of Pr. Chief Commissioner of Income Tax"
              rows={4}
              style={textareaStyle}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Office Address (optional)
            </label>
            <textarea
              value={state.officeAddress}
              onChange={(e) => updateState({ officeAddress: e.target.value })}
              disabled={state.loading}
              placeholder="Office / RO address (pre-filled from office data)"
              rows={3}
              style={textareaStyle}
            />
          </div>

          <div style={{ borderTop: '1px solid #eee', paddingTop: '16px', marginTop: '4px' }}>
            <span style={{ fontWeight: '600', color: '#333', fontSize: '14px' }}>Officer signing the letter</span>
            <span style={{ color: '#888', fontSize: '12px', marginLeft: '8px' }}>(optional — not necessarily Recovery Officer)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '13px' }}>
                Officer Name
              </label>
              <input
                type="text"
                value={state.officerName}
                onChange={(e) => updateState({ officerName: e.target.value })}
                disabled={state.loading}
                placeholder="e.g. Name of officer"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '13px' }}>
                Officer Designation
              </label>
              <input
                type="text"
                value={state.officerDesignation}
                onChange={(e) => updateState({ officerDesignation: e.target.value })}
                disabled={state.loading}
                placeholder="e.g. RPFC"
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '13px' }}>
              Officer Father Name (S/o …)
            </label>
            <input
              type="text"
              value={state.officerFatherName}
              onChange={(e) => updateState({ officerFatherName: e.target.value })}
              disabled={state.loading}
              placeholder="e.g. Father Name"
              style={inputStyle}
            />
          </div>

          <div style={{ borderTop: '1px solid #eee', paddingTop: '16px', marginTop: '4px' }}>
            <span style={{ fontWeight: '600', color: '#333', fontSize: '14px' }}>Employers</span>
            <span style={{ color: '#888', fontSize: '12px', marginLeft: '8px' }}>(optional — multiple allowed)</span>
          </div>
          {state.savedEmployerNames.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: '140px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#333', fontSize: '12px' }}>
                  Add from saved names
                </label>
                <select
                  value={state.addFromSavedValue}
                  onChange={(e) => updateState({ addFromSavedValue: e.target.value })}
                  disabled={state.loading}
                  style={inputStyle}
                >
                  <option value="">— Select to add —</option>
                  {state.savedEmployerNames.map((n, i) => (
                    <option key={i} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddFromSaved}
                disabled={state.loading || !state.addFromSavedValue}
                style={{
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: '500',
                  border: 'none',
                  borderRadius: '8px',
                  background: (state.loading || !state.addFromSavedValue) ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  cursor: (state.loading || !state.addFromSavedValue) ? 'not-allowed' : 'pointer',
                }}
              >
                Add row
              </button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <label style={{ fontWeight: '500', color: '#333', fontSize: '13px' }}>Employer rows</label>
            <button
              type="button"
              onClick={() => addEmployerRow('', defaultPAN, '')}
              disabled={state.loading}
              style={{
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: '500',
                border: '2px solid #667eea',
                borderRadius: '8px',
                background: '#fff',
                color: '#667eea',
                cursor: state.loading ? 'not-allowed' : 'pointer',
              }}
            >
              + Add employer
            </button>
          </div>
          {state.employers.length === 0 ? (
            <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px', color: '#666', fontSize: '13px' }}>
              No employers added. You can add multiple employers with Name, PAN, and Designation. If none, establishment name/PAN may be used as fallback.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {state.employers.map((row, idx) => (
                <div
                  key={row.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr auto',
                    gap: '10px',
                    alignItems: 'end',
                    padding: '12px',
                    background: '#fafafa',
                    borderRadius: '8px',
                    border: '1px solid #eee',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#555' }}>Name</label>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateEmployerRow(row.id, 'name', e.target.value)}
                      disabled={state.loading}
                      placeholder="Employer name"
                      style={{ ...inputStyle, padding: '8px 10px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#555' }}>PAN</label>
                    <input
                      type="text"
                      value={row.pan}
                      onChange={(e) => updateEmployerRow(row.id, 'pan', e.target.value)}
                      disabled={state.loading}
                      placeholder="PAN"
                      style={{ ...inputStyle, padding: '8px 10px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 100px', minWidth: '80px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#555' }}>Designation</label>
                      <input
                        type="text"
                        value={row.designation}
                        onChange={(e) => updateEmployerRow(row.id, 'designation', e.target.value)}
                        disabled={state.loading}
                        placeholder="e.g. Director"
                        style={{ ...inputStyle, padding: '8px 10px' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEmployerRow(row.id)}
                      disabled={state.loading}
                      title="Remove employer"
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        border: 'none',
                        borderRadius: '6px',
                        background: '#fee',
                        color: '#c33',
                        cursor: state.loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Remark (optional)
            </label>
            <textarea
              value={state.remark}
              onChange={(e) => updateState({ remark: e.target.value })}
              disabled={state.loading}
              placeholder="Auto-generated remark"
              rows={2}
              style={textareaStyle}
            />
          </div>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
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
            disabled={!canGenerate}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              border: 'none',
              borderRadius: '8px',
              background: !canGenerate ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              cursor: !canGenerate ? 'not-allowed' : 'pointer',
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

export default React.memo(IncomeTaxLetterPopup);
