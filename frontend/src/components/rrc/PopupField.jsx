import React, { memo } from 'react';
import DebouncedInput from '../common/DebouncedInput';

const PopupField = memo(({ field, value, onChange, isDate, editable, formatDateForInput }) => {
  const displayValue = isDate ? formatDateForInput(value) : (value || '');
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ 
        fontSize: '0.75rem', 
        fontWeight: 600, 
        color: '#4a5568',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {field.label}
      </label>
      {isDate ? (
        <input
          className="popup-input"
          type="date"
          value={displayValue || ''}
          onChange={(e) => onChange(field.key, e.target.value)}
          disabled={!editable}
          style={{
            fontSize: '0.875rem',
            padding: '10px 14px',
            fontWeight: editable ? 500 : 400
          }}
        />
      ) : field.key === 'REMARKS' ? (
        <textarea
          className="popup-input"
          value={displayValue}
          onChange={(e) => onChange(field.key, e.target.value)}
          disabled={!editable}
          style={{
            fontSize: '0.875rem',
            padding: '10px 14px',
            fontWeight: editable ? 500 : 400,
            minHeight: '150px',
            resize: 'vertical',
            fontFamily: 'inherit',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}
          rows={Math.max(5, (displayValue || '').split('\n').length)}
        />
      ) : (
        <DebouncedInput
          className="popup-input"
          type="text"
          value={displayValue}
          onChange={(val) => onChange(field.key, val)}
          disabled={!editable}
          debounce={150}
          style={{
            fontSize: '0.875rem',
            padding: '10px 14px',
            fontWeight: editable ? 500 : 400
          }}
        />
      )}
    </div>
  );
});

PopupField.displayName = 'PopupField';

export default PopupField;

