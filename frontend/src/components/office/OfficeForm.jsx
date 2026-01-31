/**
 * OfficeForm Component
 * Handles office details form
 */

import React from 'react';

function OfficeForm({
  officeFormData,
  dispatchNoError,
  loading,
  setOfficeFormData,
  handleOfficeSubmit,
  handleAddOfficer,
  handleRemoveOfficer,
  handleOfficerChange,
  handleDispatchNoChange,
}) {
  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
      <h2>Office Details</h2>
      <form onSubmit={handleOfficeSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Regional Office Code: <span style={{ color: '#666', fontSize: '12px' }}>(Exactly 5 characters)</span>
          </label>
          <input
            type="text"
            value={officeFormData.regional_office_code || ''}
            onChange={(e) => {
              const value = e.target.value;
              // Limit to 5 characters
              if (value.length <= 5) {
                setOfficeFormData({ ...officeFormData, regional_office_code: value });
              }
            }}
            placeholder="e.g., PUPUN"
            required
            maxLength={5}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Regional Office Name: <span style={{ color: '#666', fontSize: '12px' }}>(Max 20 characters)</span>
          </label>
          <input
            type="text"
            value={officeFormData.regional_office_name}
            onChange={(e) => {
              const value = e.target.value;
              // Limit to 20 characters
              if (value.length <= 20) {
                setOfficeFormData({ ...officeFormData, regional_office_name: value });
              }
            }}
            required
            maxLength={20}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Address: <span style={{ color: '#666', fontSize: '12px' }}>(Max 150 characters)</span>
          </label>
          <textarea
            value={officeFormData.regional_office_address}
            onChange={(e) => {
              const value = e.target.value;
              // Limit to 150 characters
              if (value.length <= 150) {
                setOfficeFormData({ ...officeFormData, regional_office_address: value });
              }
            }}
            required
            maxLength={150}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', minHeight: '80px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input
            type="email"
            value={officeFormData.regional_office_email}
            onChange={(e) => setOfficeFormData({ ...officeFormData, regional_office_email: e.target.value })}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Phone: <span style={{ color: '#666', fontSize: '12px' }}>(Max 30 characters)</span>
          </label>
          <input
            type="text"
            value={officeFormData.regional_office_phone}
            onChange={(e) => {
              const value = e.target.value;
              // Limit to 30 characters
              if (value.length <= 30) {
                setOfficeFormData({ ...officeFormData, regional_office_phone: value });
              }
            }}
            required
            maxLength={30}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Recovery Officer Names: <span style={{ color: '#666', fontSize: '12px' }}>(Max 25 characters each)</span>
          </label>
          {officeFormData.recovery_officer_names.map((officer, index) => (
            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                value={officer}
                onChange={(e) => handleOfficerChange(index, e.target.value)}
                maxLength={25}
                style={{ flex: 1, padding: '8px' }}
              />
              {officeFormData.recovery_officer_names.length > 1 && (
                <button type="button" onClick={() => handleRemoveOfficer(index)}>Remove</button>
              )}
            </div>
          ))}
          <button type="button" onClick={handleAddOfficer} style={{ marginTop: '5px' }}>
            Add Officer
          </button>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Officer Designation: <span style={{ color: '#666', fontSize: '12px' }}>(Max 25 characters)</span>
          </label>
          <input
            type="text"
            value={officeFormData.officer_designation}
            onChange={(e) => {
              const value = e.target.value;
              // Limit to 25 characters
              if (value.length <= 25) {
                setOfficeFormData({ ...officeFormData, officer_designation: value });
              }
            }}
            maxLength={25}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            DISPATCH NO. for LETTERs/CPs: <span style={{ color: '#666', fontSize: '12px' }}>(Max 15 characters)</span>
          </label>
          <input
            type="text"
            value={officeFormData.dispatch_no_for_letters_cps || ''}
            onChange={(e) => {
              const value = e.target.value;
              // Limit to 15 characters
              if (value.length <= 15) {
                handleDispatchNoChange(value);
              }
            }}
            maxLength={15}
            style={{ 
              width: '100%', 
              padding: '8px', 
              boxSizing: 'border-box',
              borderColor: dispatchNoError ? '#dc3545' : undefined
            }}
          />
          {dispatchNoError && (
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#dc3545' }}>
              {dispatchNoError}
            </div>
          )}
        </div>
        <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer' }}>
          {loading ? 'Saving...' : 'Save Office Details'}
        </button>
      </form>
    </div>
  );
}

export default OfficeForm;

