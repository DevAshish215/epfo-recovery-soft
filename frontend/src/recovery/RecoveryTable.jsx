/**
 * Recovery Table Component
 * Displays recovery transactions in a table format
 * Read-only table sorted by date descending
 */

import { useState, useEffect } from 'react';
import api from '../api/api.js';

function RecoveryTable({ user, estaCode }) {
  const [recoveries, setRecoveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.username && estaCode) {
      loadRecoveries();
    }
  }, [user, estaCode]);

  const loadRecoveries = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/recovery/by-esta/${estaCode}?username=${user.username}`);
      if (response.data && response.data.success) {
        setRecoveries(response.data.data || []);
      }
    } catch (err) {
      let errorMessage = 'Failed to load recovery data';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
      setRecoveries([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading recovery data...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        {error}
      </div>
    );
  }

  if (recoveries.length === 0) {
    return (
      <div style={{ padding: '20px', color: '#666' }}>
        No recovery transactions found for ESTA_CODE: {estaCode}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Recovery Transactions for ESTA_CODE: {estaCode}</h2>
      <div style={{ overflowX: 'auto', marginTop: '15px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>SN</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>ESTA_CODE</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>RRC_NO</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>DD/TRRN_NO</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>BANK_NAME</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>DD_DATED</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>RECOVERY_AMOUNT_RECEIVED</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>ALLOCATED_7A</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>ALLOCATED_7Q</th>
              <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>ALLOCATED_14B</th>
            </tr>
          </thead>
          <tbody>
            {recoveries.map((recovery, index) => (
              <tr key={index} style={{ background: index % 2 === 0 ? 'white' : '#f9f9f9' }}>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{index + 1}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{recovery.ESTA_CODE || '-'}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{recovery.RRC_NO || '-'}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{recovery.REFERENCE_NUMBER || '-'}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{recovery.BANK_NAME || '-'}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                  {recovery.RECOVERY_DATE ? new Date(recovery.RECOVERY_DATE).toLocaleDateString() : '-'}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                  ₹{(recovery.RECOVERY_AMOUNT || 0).toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                  ₹{(recovery.ALLOCATED_7A || 0).toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                  ₹{(recovery.ALLOCATED_7Q || 0).toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>
                  ₹{(recovery.ALLOCATED_14B || 0).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecoveryTable;

