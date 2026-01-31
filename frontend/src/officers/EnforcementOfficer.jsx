/**
 * AREA E.O. PIN CODES Component
 * Manage enforcement officers by PIN Code
 */

import { useState, useEffect } from 'react';
import api from '../api/api.js';
import logger from '../utils/logger.js';

function EnforcementOfficer({ user }) {
  const [pinCodes, setPinCodes] = useState([]);
  const [selectedPinCodes, setSelectedPinCodes] = useState([]); // Changed to array for multiple selection
  const [enforcementOfficer, setEnforcementOfficer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pinCodesLoading, setPinCodesLoading] = useState(false);
  const [pinCodeEOMap, setPinCodeEOMap] = useState({}); // Map PIN code to Area E.O. Name

  // Load unique PIN codes
  useEffect(() => {
    if (user && user.username) {
      loadPinCodes();
    }
  }, [user]);

  // Load enforcement officer when PIN codes are selected (for display)
  useEffect(() => {
    if (selectedPinCodes.length === 1 && pinCodes.length > 0) {
      // If only one is selected, load its current Area E.O. name
      loadEnforcementOfficer(selectedPinCodes[0]);
    } else if (selectedPinCodes.length > 1 && pinCodes.length > 0) {
      // If multiple are selected, check if they all have the same Area E.O. name
      loadEnforcementOfficerForMultiple(selectedPinCodes);
    } else if (selectedPinCodes.length === 0) {
      setEnforcementOfficer('');
    }
  }, [selectedPinCodes, pinCodes]);

  const loadPinCodes = async () => {
    try {
      setPinCodesLoading(true);
      setError('');
      const response = await api.get('/rrc/pin-codes', {
        params: { username: user.username }
      });
      
      if (response.data.success) {
        const pins = response.data.data || [];
        setPinCodes(pins);
        
        // Load Area E.O. Names for all PIN codes
        await loadEONamesForPinCodes(pins);
      }
    } catch (err) {
      logger.error('Error loading PIN codes:', err);
      setError('Failed to load PIN codes');
    } finally {
      setPinCodesLoading(false);
    }
  };

  const loadEONamesForPinCodes = async (pins) => {
    try {
      // Fetch all RRC data to get Area E.O. Names for each PIN code
      const rrcResponse = await api.get('/rrc', {
        params: { username: user.username }
      });
      
      if (rrcResponse.data.success) {
        const rrcs = rrcResponse.data.data || [];
        const eoMap = {};
        
        // For each PIN code, find the Area E.O. Name from RRC data
        pins.forEach(pinCode => {
          const rrcWithPin = rrcs.find(r => r.PIN_CD === pinCode);
          if (rrcWithPin && rrcWithPin.ENFORCEMENT_OFFICER) {
            eoMap[pinCode] = rrcWithPin.ENFORCEMENT_OFFICER;
          } else {
            eoMap[pinCode] = ''; // No Area E.O. Name set
          }
        });
        
        setPinCodeEOMap(eoMap);
      }
    } catch (err) {
      logger.error('Error loading Area E.O. Names:', err);
      // Don't show error, just leave map empty
    }
  };

  const loadEnforcementOfficer = async (pinCode) => {
    try {
      // Find the enforcement officer for this PIN code from RRC data
      const rrcResponse = await api.get('/rrc', {
        params: { username: user.username }
      });
      
      if (rrcResponse.data.success) {
        const rrcs = rrcResponse.data.data || [];
        const rrcWithPin = rrcs.find(r => r.PIN_CD === pinCode);
        if (rrcWithPin) {
          setEnforcementOfficer(rrcWithPin.ENFORCEMENT_OFFICER || '');
        } else {
          setEnforcementOfficer('');
        }
      }
    } catch (err) {
      logger.error('Error loading enforcement officer:', err);
      // Don't show error, just set empty
      setEnforcementOfficer('');
    }
  };

  const loadEnforcementOfficerForMultiple = async (pinCodesArray) => {
    try {
      // Find the enforcement officer for all selected PIN codes from RRC data
      const rrcResponse = await api.get('/rrc', {
        params: { username: user.username }
      });
      
      if (rrcResponse.data.success) {
        const rrcs = rrcResponse.data.data || [];
        const eoNames = pinCodesArray.map(pinCode => {
          const rrcWithPin = rrcs.find(r => r.PIN_CD === pinCode);
          return rrcWithPin?.ENFORCEMENT_OFFICER || '';
        }).filter(eo => eo !== '');
        
        // If all selected PIN codes have the same Area E.O. name, show it
        // Otherwise, leave empty so user can enter a new common name
        const uniqueEoNames = [...new Set(eoNames)];
        if (uniqueEoNames.length === 1) {
          setEnforcementOfficer(uniqueEoNames[0]);
        } else {
          setEnforcementOfficer(''); // Different names, leave empty for user to enter
        }
      }
    } catch (err) {
      logger.error('Error loading enforcement officer:', err);
      setEnforcementOfficer('');
    }
  };

  const handlePinCodeToggle = (pinCode) => {
    setSelectedPinCodes(prev => {
      if (prev.includes(pinCode)) {
        // Remove from selection
        const newSelection = prev.filter(p => p !== pinCode);
        // If only one was selected and we're removing it, clear the input
        if (prev.length === 1) {
          setEnforcementOfficer('');
        }
        return newSelection;
      } else {
        // Add to selection
        return [...prev, pinCode];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPinCodes.length === pinCodes.length) {
      // Deselect all
      setSelectedPinCodes([]);
      setEnforcementOfficer('');
    } else {
      // Select all
      setSelectedPinCodes([...pinCodes]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (selectedPinCodes.length === 0) {
      setError('Please select at least one PIN Code');
      setLoading(false);
      return;
    }

    try {
      // Update all selected PIN codes
      let totalModified = 0;
      const updatePromises = selectedPinCodes.map(pinCode =>
        api.put('/rrc/update-enforcement-officer', {
          username: user.username,
          pinCode: pinCode,
          enforcementOfficer: enforcementOfficer.trim()
        })
      );

      const results = await Promise.all(updatePromises);
      
      results.forEach(result => {
        if (result.data.success) {
          totalModified += result.data.data.modifiedCount || 0;
        }
      });

      setSuccess(`Area E.O. Name updated successfully for ${selectedPinCodes.length} PIN Code(s). ${totalModified} RRC record(s) updated.`);
      setEnforcementOfficer('');
      setSelectedPinCodes([]);
      // Reload PIN codes and Area E.O. Names to refresh data
      await loadPinCodes();
    } catch (err) {
      logger.error('Error updating enforcement officer:', err);
      setError(err.response?.data?.message || 'Failed to update Area E.O. Name');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#fff' }}>
      <div style={{ 
        marginBottom: '20px', 
        paddingBottom: '15px', 
        borderBottom: '2px solid #e0e0e0' 
      }}>
        <h2 style={{ 
          margin: 0, 
          color: '#333', 
          fontSize: '24px',
          fontWeight: '600'
        }}>
          AREA E.O. PIN CODES
        </h2>
        <p style={{ 
          margin: '5px 0 0 0', 
          color: '#666', 
          fontSize: '14px' 
        }}>
          Update enforcement officer name for all RRCs with a specific PIN Code
        </p>
      </div>

      {error && (
        <div style={{
          marginBottom: '15px',
          padding: '12px',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          color: '#c33',
          fontSize: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{
          marginBottom: '15px',
          padding: '12px',
          background: '#efe',
          border: '1px solid #cfc',
          borderRadius: '6px',
          color: '#3c3',
          fontSize: '14px'
        }}>
          ✓ {success}
        </div>
      )}

      {pinCodesLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Loading PIN codes...
        </div>
      ) : pinCodes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          No PIN codes found. Upload RRC data first.
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '20px',
          marginTop: '20px'
        }}>
          {/* Left Column: PIN Codes List */}
          <div style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
            background: '#fff'
          }}>
            <div style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: '600',
              fontSize: '16px',
              borderBottom: '2px solid #ddd',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>PIN Codes ({pinCodes.length})</span>
              <button
                onClick={handleSelectAll}
                style={{
                  padding: '4px 12px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                {selectedPinCodes.length === pinCodes.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div style={{
              maxHeight: '600px',
              overflowY: 'auto',
              padding: '10px'
            }}>
              {pinCodes.map((pin) => {
                const isSelected = selectedPinCodes.includes(pin);
                const eoName = pinCodeEOMap[pin] || '';
                return (
                  <div
                    key={pin}
                    onClick={() => handlePinCodeToggle(pin)}
                    style={{
                      padding: '12px 16px',
                      marginBottom: '8px',
                      background: isSelected 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                        : '#f9f9f9',
                      color: isSelected ? '#fff' : '#333',
                      border: `2px solid ${isSelected ? '#667eea' : '#e0e0e0'}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: isSelected ? '600' : '400',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#f0f0f0';
                        e.currentTarget.style.borderColor = '#667eea';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#f9f9f9';
                        e.currentTarget.style.borderColor = '#e0e0e0';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handlePinCodeToggle(pin)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: isSelected ? '#fff' : '#667eea'
                          }}
                        />
                        <span style={{ fontWeight: '600', fontSize: '15px' }}>{pin}</span>
                      </div>
                      {eoName && (
                        <div style={{ 
                          marginLeft: '28px', 
                          fontSize: '12px', 
                          color: isSelected ? 'rgba(255, 255, 255, 0.9)' : '#666',
                          fontStyle: 'italic'
                        }}>
                          Area E.O.: {eoName}
                        </div>
                      )}
                      {!eoName && (
                        <div style={{ 
                          marginLeft: '28px', 
                          fontSize: '12px', 
                          color: isSelected ? 'rgba(255, 255, 255, 0.7)' : '#999',
                          fontStyle: 'italic'
                        }}>
                          No Area E.O. assigned
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <span style={{ fontSize: '18px', marginLeft: '10px' }}>✓</span>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedPinCodes.length > 0 && (
              <div style={{
                padding: '10px 16px',
                background: '#f0f0f0',
                borderTop: '1px solid #ddd',
                fontSize: '13px',
                color: '#666',
                fontWeight: '500'
              }}>
                {selectedPinCodes.length} PIN Code(s) selected
              </div>
            )}
          </div>

          {/* Right Column: Area E.O. Name Input */}
          <div style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
            background: '#fff',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: '600',
              fontSize: '16px',
              borderBottom: '2px solid #ddd'
            }}>
              Area E.O. Name
            </div>
            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              {selectedPinCodes.length > 0 ? (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500',
                      color: '#333',
                      fontSize: '14px'
                    }}>
                      Selected PIN Code(s): ({selectedPinCodes.length})
                    </label>
                    <div style={{
                      padding: '12px',
                      background: '#f0f0f0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#667eea',
                      border: '2px solid #667eea',
                      maxHeight: '120px',
                      overflowY: 'auto'
                    }}>
                      {selectedPinCodes.map((pin, index) => (
                        <span key={pin} style={{ 
                          display: 'inline-block',
                          marginRight: '8px',
                          marginBottom: '4px',
                          padding: '4px 8px',
                          background: '#fff',
                          borderRadius: '4px',
                          border: '1px solid #667eea'
                        }}>
                          {pin}{index < selectedPinCodes.length - 1 ? ',' : ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px', flex: 1 }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500',
                      color: '#333',
                      fontSize: '14px'
                    }}>
                      Area E.O. Name:
                    </label>
                    <input
                      type="text"
                      value={enforcementOfficer}
                      onChange={(e) => setEnforcementOfficer(e.target.value)}
                      disabled={loading}
                      placeholder="Enter Area E.O. Name"
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '14px',
                        border: '2px solid #ddd',
                        borderRadius: '8px',
                        boxSizing: 'border-box',
                        background: '#fff',
                        transition: 'border-color 0.3s',
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#ddd'}
                    />
                    <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '12px' }}>
                      Leave empty to clear the Area E.O. name for this PIN code
                    </p>
                  </div>

                    <button
                    type="submit"
                    disabled={loading || selectedPinCodes.length === 0}
                    style={{
                      padding: '12px 30px',
                      fontSize: '16px',
                      fontWeight: '500',
                      color: '#fff',
                      background: (loading || selectedPinCodes.length === 0)
                        ? '#ccc' 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: (loading || selectedPinCodes.length === 0) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s',
                      boxShadow: (loading || selectedPinCodes.length === 0)
                        ? 'none' 
                        : '0 4px 15px rgba(102, 126, 234, 0.4)',
                      alignSelf: 'flex-start'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading && selectedPinCodes.length > 0) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading && selectedPinCodes.length > 0) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                      }
                    }}
                  >
                    {loading ? 'Updating...' : `Update ${selectedPinCodes.length} PIN Code(s)`}
                  </button>
                </form>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#999',
                  fontSize: '14px',
                  textAlign: 'center',
                  padding: '40px'
                }}>
                  Select a PIN Code from the left to update Area E.O. Name
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnforcementOfficer;

