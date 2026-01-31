/**
 * EstaCodeInput Component
 * Handles ESTA code input with establishment number and extension
 */

import React from 'react';

function EstaCodeInput({
  editMode,
  roCode,
  estaCode,
  establishmentNumber,
  extension,
  setEstablishmentNumber,
  setExtension,
  inputStyle,
}) {
  if (editMode) {
    // Edit mode: show read-only ESTA_CODE
    return (
      <input
        type="text"
        value={estaCode}
        disabled
        style={{ ...inputStyle, background: '#e9ecef', cursor: 'not-allowed' }}
      />
    );
  }

  if (!roCode) {
    // No RO code available
    return (
      <div style={{ 
        padding: '12px', 
        background: '#fff3cd', 
        border: '1px solid #ffc107', 
        borderRadius: '4px',
        color: '#856404'
      }}>
        ⚠️ Please save Office Details first to get Regional Office Code (RO Code)
      </div>
    );
  }

  // Create mode: two fields - establishment number and extension
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      {/* Establishment Number */}
      <div style={{ flex: '1' }}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={establishmentNumber}
          onChange={(e) => {
            // Only allow numeric input
            const value = e.target.value.replace(/\D/g, '');
            setEstablishmentNumber(value);
          }}
          placeholder="Establishment Number"
          style={{ 
            ...inputStyle, 
            width: '100%'
          }}
          maxLength={7}
        />
      </div>
      
      {/* Extension */}
      <div style={{ flex: '1' }}>
        <input
          type="text"
          value={extension}
          onChange={(e) => {
            // Allow alphanumeric input, max 3 characters
            const value = e.target.value.substring(0, 3);
            setExtension(value || '000');
          }}
          placeholder="Extension (000)"
          style={{ 
            ...inputStyle, 
            width: '100%'
          }}
          maxLength={3}
        />
      </div>
    </div>
  );
}

export default EstaCodeInput;

