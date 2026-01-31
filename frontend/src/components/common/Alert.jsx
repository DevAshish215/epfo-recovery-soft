import React, { memo } from 'react';

/**
 * Reusable Alert Component - Government Style
 * Prevents duplicate code and improves performance
 */
const Alert = memo(({ type = 'info', message, onClose }) => {
  const alertClasses = {
    success: 'gov-alert gov-alert-success',
    error: 'gov-alert gov-alert-error',
    warning: 'gov-alert gov-alert-warning',
    info: 'gov-alert gov-alert-info'
  };

  return (
    <div 
      className={alertClasses[type] || alertClasses.info}
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        minWidth: '300px',
        maxWidth: '90%',
        textAlign: 'center',
        animation: 'slideDown 0.3s ease-out'
      }}
    >
      {type === 'success' && '✓ '}
      {message}
      {onClose && (
        <button 
          onClick={onClose}
          style={{ 
            marginLeft: '10px', 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold'
          }}
        >
          ×
        </button>
      )}
    </div>
  );
});

Alert.displayName = 'Alert';

export default Alert;

