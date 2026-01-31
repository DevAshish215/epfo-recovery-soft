/**
 * ReportsSection Component
 * Handles reports display and export
 */

import React from 'react';
import * as XLSX from 'xlsx';
import { formatNumber } from '../../utils/number.util.js';
import logger from '../../utils/logger.js';

function ReportsSection({
  activeReport,
  setActiveReport,
  rrcData,
  setError,
  setSuccess,
}) {
  // Step 1: Group by (ESTA_CODE, IR_NIR) composite key
  const grouped = {};
  (rrcData || []).forEach(rrc => {
    const estaCode = rrc.ESTA_CODE;
    const irNir = (rrc.IR_NIR || '').toString().trim().toUpperCase();
    
    if (!estaCode) return; // Skip if ESTA_CODE is missing
    
    const key = `${estaCode}_${irNir}`;
    
    if (!grouped[key]) {
      grouped[key] = {
        ESTA_CODE: estaCode,
        IR_NIR: irNir,
        rrcs: []
      };
    }
    grouped[key].rrcs.push(rrc);
  });

  // Step 2: Filter by IR_NIR status based on active report
  let filteredGroups = Object.values(grouped);
  
  if (activeReport === 'top10NIR') {
    filteredGroups = filteredGroups.filter(group => group.IR_NIR === 'NIR');
  } else if (activeReport === 'top25IR' || activeReport === 'irAbove25Lakhs') {
    filteredGroups = filteredGroups.filter(group => group.IR_NIR === 'IR');
  }

  // Step 3: Calculate aggregations for each group
  const aggregated = filteredGroups.map(group => {
    const firstRrc = group.rrcs[0];
    
    // Financial aggregations (sum from all RRCs in this group)
    const financialTotals = group.rrcs.reduce((acc, rrc) => {
      acc.DEMAND_TOTAL_RRC += parseFloat(rrc.DEMAND_TOTAL || 0);
      acc.RECOVERY_TOTAL_RRC += parseFloat(rrc.RECOVERY_TOTAL || 0);
      acc.OUTSTAND_TOTAL_RRC += parseFloat(rrc.OUTSTAND_TOTAL || 0);
      acc.OUTSTAND_TOT_WITH_REC_RRC += parseFloat(rrc.OUTSTAND_TOT_WITH_REC || 0);
      return acc;
    }, {
      DEMAND_TOTAL_RRC: 0,
      RECOVERY_TOTAL_RRC: 0,
      OUTSTAND_TOTAL_RRC: 0,
      OUTSTAND_TOT_WITH_REC_RRC: 0
    });
    
    // Only ESTA-level fields needed: ESTA_CODE, ESTA_NAME, IR_NIR, REMARKS
    return {
      ESTA_CODE: firstRrc.ESTA_CODE,
      ESTA_NAME: firstRrc.ESTA_NAME || '',
      IR_NIR: firstRrc.IR_NIR || '',
      REMARKS: firstRrc.REMARKS || '',
      ...financialTotals
    };
  });

  // Step 4: Filter by amount threshold for "IR above 25 lakhs"
  let finalData = aggregated;
  if (activeReport === 'irAbove25Lakhs') {
    finalData = aggregated.filter(item => item.OUTSTAND_TOT_WITH_REC_RRC >= 2500000);
  }

  // Step 5: Sort by OUTSTAND_TOT_WITH_REC_RRC descending
  finalData.sort((a, b) => b.OUTSTAND_TOT_WITH_REC_RRC - a.OUTSTAND_TOT_WITH_REC_RRC);

  // Step 6: Limit results
  let displayData = finalData;
  if (activeReport === 'top10NIR') {
    displayData = finalData.slice(0, 10);
  } else if (activeReport === 'top25IR') {
    displayData = finalData.slice(0, 25);
  }

  // Get report title
  const reportTitle = activeReport === 'top10NIR' ? 'Top 10 NIR Cases' :
                      activeReport === 'top25IR' ? 'Top 25 IR Cases' :
                      'IR Cases Above 25 Lakhs';

  // Export function for reports
  const exportReportToExcel = () => {
    try {
      if (displayData.length === 0) {
        setError('No data to export. Please select a report first.');
        return;
      }

      // Prepare data for export - exact same fields and order as table
      const exportData = displayData.map((item, index) => {
        return {
          'SN': index + 1,
          'ESTA CODE': item.ESTA_CODE || '-',
          'ESTA NAME': item.ESTA_NAME || '-',
          'IR/NIR': item.IR_NIR || '-',
          'REMARKS': item.REMARKS || '-',
          'DEMAND TOTAL RRC': formatNumber(item.DEMAND_TOTAL_RRC),
          'RECOVERY TOTAL RRC': formatNumber(item.RECOVERY_TOTAL_RRC),
          'OUTSTAND TOTAL RRC': formatNumber(item.OUTSTAND_TOTAL_RRC),
          'OUTSTAND TOT WITH REC RRC': formatNumber(item.OUTSTAND_TOT_WITH_REC_RRC)
        };
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report Data');

      // Generate filename based on report type
      let filename = reportTitle.replace(/\s+/g, '_');
      filename += `_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Write and download
      XLSX.writeFile(wb, filename);
      
      setSuccess(`Report exported successfully! ${displayData.length} record(s) exported.`);
    } catch (err) {
      logger.error('Export error:', err);
      setError('Failed to export report to Excel. Please try again.');
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '4px', width: '100%', boxSizing: 'border-box', background: '#fff', padding: '20px' }}>
      <h2 style={{ marginBottom: '20px' }}>Reports</h2>
      
      {/* Report Selection Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveReport(activeReport === 'top10NIR' ? null : 'top10NIR')}
          style={{
            padding: '12px 24px',
            background: activeReport === 'top10NIR' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeReport === 'top10NIR' ? 'bold' : 'normal'
          }}
        >
          Top 10 NIR
        </button>
        <button
          onClick={() => setActiveReport(activeReport === 'top25IR' ? null : 'top25IR')}
          style={{
            padding: '12px 24px',
            background: activeReport === 'top25IR' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeReport === 'top25IR' ? 'bold' : 'normal'
          }}
        >
          Top 25 IR
        </button>
        <button
          onClick={() => setActiveReport(activeReport === 'irAbove25Lakhs' ? null : 'irAbove25Lakhs')}
          style={{
            padding: '12px 24px',
            background: activeReport === 'irAbove25Lakhs' ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeReport === 'irAbove25Lakhs' ? 'bold' : 'normal'
          }}
        >
          IR above 25 lakhs
        </button>
      </div>

      {/* Report Display */}
      {activeReport && (
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
              {reportTitle} ({displayData.length} {displayData.length === 1 ? 'record' : 'records'})
            </h3>
            {displayData.length > 0 && (
              <button
                onClick={exportReportToExcel}
                style={{ 
                  padding: '8px 16px', 
                  background: '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  cursor: 'pointer',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                title="Export report to Excel"
              >
                Export to Excel
              </button>
            )}
          </div>
          
          {displayData.length === 0 ? (
            <p style={{ padding: '20px', color: '#666', textAlign: 'center' }}>
              No records found matching the criteria.
            </p>
          ) : (
            <div style={{ width: '100%', overflowX: 'auto', boxSizing: 'border-box' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '800px' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold' }}>ESTA CODE</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold' }}>ESTA NAME</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>IR/NIR</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left', fontWeight: 'bold' }}>REMARKS</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>DEMAND TOTAL RRC</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>RECOVERY TOTAL RRC</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>OUTSTAND TOTAL RRC</th>
                    <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>OUTSTAND TOT WITH REC RRC</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.map((item, index) => (
                    <tr key={`${item.ESTA_CODE}_${item.IR_NIR}_${index}`} style={{ background: index % 2 === 0 ? 'white' : '#f9f9f9' }}>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.ESTA_CODE || '-'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.ESTA_NAME || '-'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'center' }}>{item.IR_NIR || '-'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', whiteSpace: 'pre-line', wordWrap: 'break-word' }}>{item.REMARKS || '-'}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>₹{formatNumber(item.DEMAND_TOTAL_RRC)}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>₹{formatNumber(item.RECOVERY_TOTAL_RRC)}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right' }}>₹{formatNumber(item.OUTSTAND_TOTAL_RRC)}</td>
                      <td style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>₹{formatNumber(item.OUTSTAND_TOT_WITH_REC_RRC)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportsSection;

