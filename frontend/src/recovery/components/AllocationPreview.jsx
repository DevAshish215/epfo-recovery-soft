/**
 * AllocationPreview Component
 * Displays allocation preview with editable manual allocation fields
 */

import React from 'react';
import { formatNumber } from '../../utils/number.util.js';

function AllocationPreview({
  previewLoading,
  allocationPreview,
  manualAllocation,
  selectedRRC,
  sectionsToShow,
  updateAllocation,
  formData,
  setFormData,
  error,
}) {
  if (previewLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: '#f8f9fa', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}>
        Loading allocation preview...
      </div>
    );
  }

  if (!allocationPreview || !manualAllocation) {
    return null;
  }

  return (
    <div style={{ 
      width: '100%', 
      boxSizing: 'border-box',
      border: '1px solid #ddd', 
      borderRadius: '4px', 
      padding: '15px',
      background: '#fff',
      display: 'block',
      overflowX: 'auto',
      overflowY: 'auto',
      maxHeight: '600px'
    }}>
      {/* Section 7A Table */}
      {sectionsToShow.show7A && (
        <div style={{ marginBottom: '25px', width: '100%', boxSizing: 'border-box' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 'bold', color: '#333' }}>Section 7A</h4>
          <div style={{ width: '100%', boxSizing: 'border-box', display: 'block' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #ddd', tableLayout: 'fixed', display: 'table' }}>
              <thead>
                <tr style={{ background: '#e9ecef' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold', width: '12%' }}>U/S</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '14.7%' }}>A/C 1_EE</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '14.7%' }}>A/C 1_ER</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '14.7%' }}>A/C 2</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '14.7%' }}>A/C 10</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '14.7%' }}>A/C 21</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '14.7%' }}>A/C 22</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>DEMAND 7A</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_1_EE)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_1_ER)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_2)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_10)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_21)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_7A_ACCOUNT_22)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>RECOVERY 7A</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_7A_ACCOUNT_1_EE)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_7A_ACCOUNT_1_ER)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_7A_ACCOUNT_2)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_7A_ACCOUNT_10)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_7A_ACCOUNT_21)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_7A_ACCOUNT_22)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>OUTSTAND 7A</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_7A_ACCOUNT_1_EE)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_7A_ACCOUNT_1_ER)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_7A_ACCOUNT_2)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_7A_ACCOUNT_10)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_7A_ACCOUNT_21)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_7A_ACCOUNT_22)}</td>
                </tr>
                <tr style={{ background: '#fff3cd' }}>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>ALLOCATED 7A</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_7A_ACCOUNT_1_EE || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_7A_ACCOUNT_1_EE', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_7A_ACCOUNT_1_ER || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_7A_ACCOUNT_1_ER', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_7A_ACCOUNT_2 || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_7A_ACCOUNT_2', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_7A_ACCOUNT_10 || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_7A_ACCOUNT_10', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_7A_ACCOUNT_21 || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_7A_ACCOUNT_21', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_7A_ACCOUNT_22 || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_7A_ACCOUNT_22', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 7Q Table */}
      {sectionsToShow.show7Q && (
        <div style={{ marginBottom: '25px', width: '100%', boxSizing: 'border-box' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 'bold', color: '#333' }}>Section 7Q</h4>
          <div style={{ width: '100%', boxSizing: 'border-box', display: 'block' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #ddd', tableLayout: 'fixed', display: 'table' }}>
              <thead>
                <tr style={{ background: '#e9ecef' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold', width: '15%' }}>U/S</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '17%' }}>A/C 1</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '17%' }}>A/C 2</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '17%' }}>A/C 10</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '17%' }}>A/C 21</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '17%' }}>A/C 22</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>DEMAND 7Q</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_7Q_ACCOUNT_1)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_7Q_ACCOUNT_2)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_7Q_ACCOUNT_10)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_7Q_ACCOUNT_21)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_7Q_ACCOUNT_22)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>RECOVERY 7Q</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_7Q_ACCOUNT_1)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_7Q_ACCOUNT_2)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_7Q_ACCOUNT_10)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_7Q_ACCOUNT_21)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_7Q_ACCOUNT_22)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>OUTSTAND 7Q</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_7Q_ACCOUNT_1)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_7Q_ACCOUNT_2)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_7Q_ACCOUNT_10)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_7Q_ACCOUNT_21)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_7Q_ACCOUNT_22)}</td>
                </tr>
                <tr style={{ background: '#fff3cd' }}>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>ALLOCATED 7Q</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_7Q_ACCOUNT_1 || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_7Q_ACCOUNT_1', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_7Q_ACCOUNT_2 || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_7Q_ACCOUNT_2', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_7Q_ACCOUNT_10 || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_7Q_ACCOUNT_10', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_7Q_ACCOUNT_21 || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_7Q_ACCOUNT_21', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_7Q_ACCOUNT_22 || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_7Q_ACCOUNT_22', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 14B Table */}
      {sectionsToShow.show14B && (
        <div style={{ marginBottom: '25px', width: '100%', boxSizing: 'border-box' }}>
          <h4 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 'bold', color: '#333' }}>Section 14B</h4>
          <div style={{ width: '100%', boxSizing: 'border-box', display: 'block' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #ddd', tableLayout: 'fixed', display: 'table' }}>
              <thead>
                <tr style={{ background: '#e9ecef' }}>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold', width: '15%' }}>U/S</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '17%' }}>A/C 1</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '17%' }}>A/C 2</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '17%' }}>A/C 10</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '17%' }}>A/C 21</th>
                  <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', width: '17%' }}>A/C 22</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>DEMAND 14B</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_14B_ACCOUNT_1)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_14B_ACCOUNT_2)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_14B_ACCOUNT_10)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_14B_ACCOUNT_21)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.DEMAND_14B_ACCOUNT_22)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>RECOVERY 14B</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_14B_ACCOUNT_1)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_14B_ACCOUNT_2)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_14B_ACCOUNT_10)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_14B_ACCOUNT_21)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.RECOVERY_14B_ACCOUNT_22)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>OUTSTAND 14B</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_14B_ACCOUNT_1)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_14B_ACCOUNT_2)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_14B_ACCOUNT_10)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_14B_ACCOUNT_21)}</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>{formatNumber(selectedRRC.OUTSTAND_14B_ACCOUNT_22)}</td>
                </tr>
                <tr style={{ background: '#fff3cd' }}>
                  <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>ALLOCATED 14B</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_14B_ACCOUNT_1 || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_14B_ACCOUNT_1', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_14B_ACCOUNT_2 || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_14B_ACCOUNT_2', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_14B_ACCOUNT_10 || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_14B_ACCOUNT_10', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_14B_ACCOUNT_21 || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_14B_ACCOUNT_21', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={manualAllocation.ALLOCATED_14B_ACCOUNT_22 || 0}
                      onChange={(e) => updateAllocation('ALLOCATED_14B_ACCOUNT_22', e.target.value)}
                      style={{ width: '100%', padding: '6px', textAlign: 'right', border: '1px solid #ccc', borderRadius: '3px', boxSizing: 'border-box' }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recovery Cost Field */}
      <div style={{ marginTop: '20px', marginBottom: '15px', padding: '15px', background: '#fff3cd', border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
          Recovery Cost (ESTA-level):
        </label>
        <input
          type="number"
          step="0.01"
          value={formData.RECOVERY_COST}
          onChange={(e) => setFormData({ ...formData, RECOVERY_COST: e.target.value })}
          placeholder="Enter recovery cost amount"
          style={{ 
            width: '100%', 
            padding: '10px', 
            boxSizing: 'border-box',
            fontSize: '14px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
          This amount will be added to RECEVIED_REC_COST for all RRCs with ESTA_CODE: {formData.ESTA_CODE}
        </div>
      </div>

      {/* Total Allocated Summary */}
      <div style={{ marginTop: '15px', padding: '15px', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box' }}>
        <strong style={{ fontSize: '14px' }}>Total Allocated: </strong>
        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#28a745' }}>
          ₹{formatNumber(
            (manualAllocation.ALLOCATED_7A_ACCOUNT_1_EE || 0) +
            (manualAllocation.ALLOCATED_7A_ACCOUNT_1_ER || 0) +
            (manualAllocation.ALLOCATED_7A_ACCOUNT_2 || 0) +
            (manualAllocation.ALLOCATED_7A_ACCOUNT_10 || 0) +
            (manualAllocation.ALLOCATED_7A_ACCOUNT_21 || 0) +
            (manualAllocation.ALLOCATED_7A_ACCOUNT_22 || 0) +
            (manualAllocation.ALLOCATED_7Q_ACCOUNT_1 || 0) +
            (manualAllocation.ALLOCATED_7Q_ACCOUNT_2 || 0) +
            (manualAllocation.ALLOCATED_7Q_ACCOUNT_10 || 0) +
            (manualAllocation.ALLOCATED_7Q_ACCOUNT_21 || 0) +
            (manualAllocation.ALLOCATED_7Q_ACCOUNT_22 || 0) +
            (manualAllocation.ALLOCATED_14B_ACCOUNT_1 || 0) +
            (manualAllocation.ALLOCATED_14B_ACCOUNT_2 || 0) +
            (manualAllocation.ALLOCATED_14B_ACCOUNT_10 || 0) +
            (manualAllocation.ALLOCATED_14B_ACCOUNT_21 || 0) +
            (manualAllocation.ALLOCATED_14B_ACCOUNT_22 || 0)
          )}
        </span>
      </div>
      
      {/* Show error if allocation doesn't match recovery amount */}
      {error && (
        <div style={{ marginTop: '10px', padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '14px' }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default AllocationPreview;

