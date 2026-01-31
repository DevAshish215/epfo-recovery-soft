/**
 * RRCSelector Component
 * Handles RRC number selection dropdown
 */

import React from 'react';

function RRCSelector({
  editMode,
  rrcNo,
  setRrcNo,
  rrcOptions,
  loadingRrcs,
  inputStyle,
}) {
  return (
    <select
      value={rrcNo}
      onChange={(e) => setRrcNo(e.target.value)}
      required
      disabled={editMode || loadingRrcs || rrcOptions.length === 0}
      style={{ ...inputStyle, ...(editMode ? { background: '#e9ecef', cursor: 'not-allowed' } : {}) }}
    >
      <option value="">{loadingRrcs ? 'Loading...' : rrcOptions.length === 0 ? 'Select ESTA_CODE first' : 'Select RRC Number'}</option>
      {rrcOptions.map((rrc, index) => (
        <option key={index} value={rrc.RRC_NO}>
          {rrc.RRC_NO} - {rrc.RRC_DATE ? new Date(rrc.RRC_DATE).toLocaleDateString() : ''}
        </option>
      ))}
    </select>
  );
}

export default RRCSelector;

