/**
 * Recovery Form Component
 * Form for entering DD/TRRN recovery transactions
 * Shows allocation preview automatically when RRC is selected
 * Refactored to use custom hook and components
 */

import api from '../api/api.js';
import logger from '../utils/logger.js';
import { useRecoveryForm } from '../hooks/useRecoveryForm.js';
import { getTodayDate } from '../utils/date.util.js';
import EstaCodeInput from './components/EstaCodeInput.jsx';
import RRCSelector from './components/RRCSelector.jsx';
import AllocationPreview from './components/AllocationPreview.jsx';

function RecoveryForm({ user, officeData, onSuccess, initialFormData, onFormDataChange, editMode = false, recoveryId = null, onCancel }) {
  // Use custom hook for form state and logic
  const {
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
  } = useRecoveryForm({
    user,
    officeData,
    initialFormData,
    onFormDataChange,
    editMode,
    recoveryId,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (error) {
      setError('Please fix allocation errors before saving');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);
    
    const allocationToUse = manualAllocation || allocationPreview;
    
    if (!allocationToUse) {
      setError('Please ensure allocation preview is loaded before submitting');
      setLoading(false);
      return;
    }
    
    // Ask if user wants to add a remark
    let finalRemark = '';
    const addRemark = window.confirm('Do you want to add a remark to RRC data?');
    
    if (addRemark) {
      // If remark field already has value, use it; otherwise prompt
      if (remark && remark.trim()) {
        finalRemark = remark.trim();
      } else {
        const remarkInput = window.prompt('Enter remark to be added to REMARKS field:', '');
        if (remarkInput === null) {
          // User cancelled, don't proceed with save
          setLoading(false);
          return;
        }
        finalRemark = remarkInput.trim();
      }
    }
    
    try {
      let response;
      if (editMode && recoveryId) {
        // Update existing recovery
        response = await api.put(`/recovery/${recoveryId}?username=${user.username}`, {
          RECOVERY_AMOUNT: formData.RECOVERY_AMOUNT,
          BANK_NAME: formData.BANK_NAME,
          RECOVERY_DATE: formData.RECOVERY_DATE,
          DD_TRRN_DATE: formData.DD_TRRN_DATE,
          REFERENCE_NUMBER: formData.REFERENCE_NUMBER,
          TRANSACTION_TYPE: formData.TRANSACTION_TYPE,
          RECOVERY_COST: formData.RECOVERY_COST || 0,
          remark: finalRemark,
          ...allocationToUse,
        });
      } else {
        // Create new recovery
        response = await api.post('/recovery/add', {
          username: user.username,
          regional_office_code: user.regional_office_code || '',
          ESTA_CODE: formData.ESTA_CODE,
          RRC_NO: formData.RRC_NO,
          RECOVERY_AMOUNT: formData.RECOVERY_AMOUNT,
          BANK_NAME: formData.BANK_NAME,
          RECOVERY_DATE: formData.RECOVERY_DATE,
          DD_TRRN_DATE: formData.DD_TRRN_DATE,
          REFERENCE_NUMBER: formData.REFERENCE_NUMBER,
          TRANSACTION_TYPE: formData.TRANSACTION_TYPE,
          RECOVERY_COST: formData.RECOVERY_COST || 0,
          remark: finalRemark,
          ...allocationToUse,
        });
      }
      
      if (response.data && response.data.success) {
        const successMessage = editMode 
          ? 'Recovery transaction updated successfully! RRC amounts have been updated.' 
          : 'Recovery transaction saved successfully! RRC amounts have been updated.';
        setSuccess(successMessage);
        
        // Show alert to generate DD to Cash letter ONLY if TRANSACTION_TYPE is 'DD'
        if (formData.TRANSACTION_TYPE === 'DD') {
          const shouldGenerateLetter = window.confirm('Send DD to Cash section?');
          
          if (shouldGenerateLetter) {
            try {
              const recoveryId = response.data.data._id || response.data.data;
              const letterResponse = await api.post('/notices/dd-to-cash/generate', {
                username: user.username,
                recoveryId: recoveryId,
                officeData: officeData || {}
              }, {
                responseType: 'blob'
              });

              // Download the generated file
              const blob = new Blob([letterResponse.data], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              });
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              
              const contentDisposition = letterResponse.headers['content-disposition'];
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
              logger.error('Error generating DD to Cash letter:', err);
              // Don't show error to user, just log it
            }
          }
        }
        
        if (editMode) {
          // In edit mode, close the form and notify parent
          if (onSuccess) {
            onSuccess();
          }
        } else {
          // Reset form using hook's resetForm function
          resetForm();
          
          if (onSuccess) {
            onSuccess();
          }
        }
      }
    } catch (err) {
      let errorMessage = editMode ? 'Failed to update recovery transaction' : 'Failed to save recovery transaction';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Container styles
  const containerStyle = {
    width: '100%',
    padding: '20px',
    boxSizing: 'border-box',
  };

  const formStyle = {
    width: '100%',
    boxSizing: 'border-box',
  };

  const gridRowStyle = {
    display: 'grid',
    gap: '15px',
    marginBottom: '15px',
    width: '100%',
    boxSizing: 'border-box',
  };

  const fieldContainerStyle = {
    width: '100%',
    boxSizing: 'border-box',
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
    boxSizing: 'border-box',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '4px',
  };

  return (
    <div style={{ ...containerStyle, minWidth: '100%' }}>
      <h2 style={{ marginBottom: '10px' }}>{editMode ? 'Edit Recovery Entry (DD/TRRN)' : 'Recovery Entry (DD/TRRN)'}</h2>
      <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
        Enter recovery transaction details. The system will automatically allocate the recovery amount
        based on EPFO legal priority: Section 7A → Section 7Q → Section 14B
      </p>
      
      <form onSubmit={handleSubmit} style={formStyle}>
        {/* Row 1: ESTA_CODE (Composite) | RRC_NO */}
        <div style={{ ...gridRowStyle, gridTemplateColumns: '1fr 1fr' }}>
          <div style={fieldContainerStyle}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Establishment Code (ESTA_CODE):</label>
            <EstaCodeInput
              editMode={editMode}
              roCode={roCode}
              estaCode={formData.ESTA_CODE}
              establishmentNumber={establishmentNumber}
              extension={extension}
              setEstablishmentNumber={setEstablishmentNumber}
              setExtension={setExtension}
              inputStyle={inputStyle}
                  />
          </div>
          
          <div style={fieldContainerStyle}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>RRC Number:</label>
            <RRCSelector
              editMode={editMode}
              rrcNo={formData.RRC_NO}
              setRrcNo={(value) => setFormData({ ...formData, RRC_NO: value })}
              rrcOptions={rrcOptions}
              loadingRrcs={loadingRrcs}
              inputStyle={inputStyle}
            />
          </div>
        </div>

        {/* Row 2: Recovery Amount | Transaction Type */}
        <div style={{ ...gridRowStyle, gridTemplateColumns: '1fr 1fr' }}>
          <div style={fieldContainerStyle}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Recovery Amount:</label>
            <input
              type="number"
              step="0.01"
              value={formData.RECOVERY_AMOUNT}
              onChange={(e) => setFormData({ ...formData, RECOVERY_AMOUNT: e.target.value })}
              required
              style={inputStyle}
            />
          </div>
          
          <div style={fieldContainerStyle}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Transaction Type:</label>
            <select
              value={formData.TRANSACTION_TYPE}
              onChange={(e) => setFormData({ ...formData, TRANSACTION_TYPE: e.target.value })}
              required
              style={inputStyle}
            >
              <option value="DD">DD (Demand Draft)</option>
              <option value="TRRN">TRRN (Transaction Reference Number)</option>
            </select>
          </div>
        </div>

        {/* Row 3: Bank Name | DD/TRRN Number | DD/TRRN Date */}
        <div style={{ ...gridRowStyle, gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div style={fieldContainerStyle}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Bank Name:</label>
            <input
              type="text"
              value={formData.BANK_NAME}
              onChange={(e) => setFormData({ ...formData, BANK_NAME: e.target.value.toUpperCase() })}
              required
              style={inputStyle}
            />
          </div>
          
          <div style={fieldContainerStyle}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>DD/TRRN Number:</label>
            <input
              type="text"
              value={formData.REFERENCE_NUMBER}
              onChange={(e) => setFormData({ ...formData, REFERENCE_NUMBER: e.target.value })}
              required
              style={inputStyle}
            />
          </div>
          
          <div style={fieldContainerStyle}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>DD/TRRN Date:</label>
            <input
              type="date"
              value={formData.DD_TRRN_DATE}
              onChange={(e) => setFormData({ ...formData, DD_TRRN_DATE: e.target.value })}
              required
              style={inputStyle}
            />
          </div>
        </div>

        {/* Row 4: Recovery Date | U/S field */}
        <div style={{ ...gridRowStyle, gridTemplateColumns: '1fr 1fr' }}>
          <div style={fieldContainerStyle}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Recovery Date:</label>
            <input
              type="date"
              value={formData.RECOVERY_DATE}
              onChange={(e) => setFormData({ ...formData, RECOVERY_DATE: e.target.value })}
              required
              style={inputStyle}
            />
          </div>
          
          {selectedRRC && selectedRRC.U_S && (
            <div style={fieldContainerStyle}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>U/S (Under Section):</label>
              <div style={{ 
                padding: '12px', 
                background: '#e8f4f8', 
                border: '1px solid #b3d9e6', 
                borderRadius: '4px',
                fontSize: '16px', 
                color: '#0066cc',
                fontWeight: 'bold',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                {selectedRRC.U_S}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                Showing: {sectionsToShow.show7A ? '7A ' : ''}{sectionsToShow.show14B ? '14B ' : ''}{sectionsToShow.show7Q ? '7Q' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Allocation Preview (Editable) */}
        {selectedRRC && formData.RECOVERY_AMOUNT && (
          <div style={{ marginTop: '30px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
            <h3 style={{ marginBottom: '15px', fontSize: '18px', fontWeight: 'bold' }}>Allocation Preview (Editable)</h3>
            <AllocationPreview
              previewLoading={previewLoading}
              allocationPreview={allocationPreview}
              manualAllocation={manualAllocation}
              selectedRRC={selectedRRC}
              sectionsToShow={sectionsToShow}
              updateAllocation={updateAllocation}
              formData={formData}
              setFormData={setFormData}
              error={error}
                    />
          </div>
        )}

        {/* Remark Field */}
        <div style={{ marginTop: '20px', marginBottom: '20px', width: '100%', boxSizing: 'border-box' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            fontSize: '14px'
          }}>
            Remark (Optional):
          </label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Enter remark to be added to REMARKS field in RRC data..."
            disabled={loading}
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
              transition: 'border-color 0.3s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#28a745'}
            onBlur={(e) => e.target.style.borderColor = '#ddd'}
          />
        </div>

        {/* Save/Update Recovery Button */}
        <div style={{ marginTop: '25px', width: '100%', boxSizing: 'border-box', display: 'flex', gap: '10px' }}>
          {editMode && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{ 
                padding: '12px 40px', 
                background: loading ? '#ccc' : '#6c757d', 
                color: 'white', 
                border: 'none', 
                cursor: loading ? 'not-allowed' : 'pointer', 
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold',
                width: '100%',
                maxWidth: '300px',
                boxSizing: 'border-box'
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !allocationPreview || previewLoading}
            style={{ 
              padding: '12px 40px', 
              background: loading || !allocationPreview || previewLoading ? '#ccc' : '#28a745', 
              color: 'white', 
              border: 'none', 
              cursor: loading || !allocationPreview || previewLoading ? 'not-allowed' : 'pointer', 
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              width: '100%',
              maxWidth: '300px',
              boxSizing: 'border-box'
            }}
          >
            {loading ? (editMode ? 'Updating...' : 'Saving...') : (editMode ? 'Update Recovery' : 'Save Recovery')}
          </button>
        </div>
      </form>
      
      {/* Error and Success Messages */}
      {error && (
        <div style={{ marginTop: '20px', padding: '12px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ marginTop: '20px', padding: '12px', background: '#d4edda', color: '#155724', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}>
          {success}
        </div>
      )}
    </div>
  );
}

export default RecoveryForm;
