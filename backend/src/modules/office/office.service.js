/**
 * Office Service
 * Business logic for Office operations
 */

import Office from './office.model.js';

/**
 * Create or update office by username
 * Each user has their own office details
 */
export async function createOffice(officeData) {
  const { username } = officeData;
  
  if (!username) {
    throw new Error('Username is required');
  }
  
  // Upsert: Update if exists, create if new
  // Data isolation by username - each user has their own office
  const office = await Office.findOneAndUpdate(
    { username },
    officeData,
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  );

  return office;
}

/**
 * Get office by username
 * Each user has their own office details
 */
export async function getOfficeByUsername(username) {
  if (!username) {
    throw new Error('Username is required');
  }
  return await Office.findOne({ username });
}

