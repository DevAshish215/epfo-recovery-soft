/**
 * Employer Address Service
 * Business logic for managing employer addresses
 */

import EmployerAddress from './employer-address.model.js';
import logger from '../../utils/logger.js';

/**
 * Get all saved employer addresses for an ESTA_CODE
 */
export async function getEmployerAddressesByEstaCode(username, estaCode) {
  try {
    const addresses = await EmployerAddress.find({
      username,
      ESTA_CODE: estaCode,
    }).sort({ createdAt: -1 });

    return addresses;
  } catch (error) {
    logger.error('Error fetching employer addresses:', error);
    throw error;
  }
}

/**
 * Save a new employer address
 * Can save employer name only, address only, or both
 */
export async function saveEmployerAddress(username, estaCode, employerName, address, pinCode) {
  try {
    // Ensure only ONE field is provided (name OR address, not both)
    const hasName = employerName && employerName.trim();
    const hasAddress = address && address.trim();
    
    if (hasName && hasAddress) {
      throw new Error('Cannot save employer name and address together. Please save them separately.');
    }
    
    if (!hasName && !hasAddress) {
      throw new Error('Either employer name or address is required');
    }

    const newAddress = new EmployerAddress({
      username,
      ESTA_CODE: estaCode,
      employerName: hasName ? employerName.trim() : '',
      address: hasAddress ? address.trim() : '',
      pinCode: pinCode ? pinCode.trim() : '',
    });

    const saved = await newAddress.save();
    return saved;
  } catch (error) {
    logger.error('Error saving employer address:', error);
    throw error;
  }
}

/**
 * Get all unique employer names for an ESTA_CODE
 */
export async function getEmployerNamesByEstaCode(username, estaCode) {
  try {
    const addresses = await EmployerAddress.find({
      username,
      ESTA_CODE: estaCode,
      employerName: { $ne: '', $exists: true },
    })
    .distinct('employerName')
    .sort();

    return addresses;
  } catch (error) {
    logger.error('Error fetching employer names:', error);
    throw error;
  }
}

/**
 * Update an employer address
 */
export async function updateEmployerAddress(username, addressId, employerName, address, pinCode) {
  try {
    // Ensure only ONE field is provided (name OR address, not both)
    const hasName = employerName && employerName.trim();
    const hasAddress = address && address.trim();
    
    if (hasName && hasAddress) {
      throw new Error('Cannot save employer name and address together. Please save them separately.');
    }
    
    if (!hasName && !hasAddress) {
      throw new Error('Either employer name or address is required');
    }

    const updated = await EmployerAddress.findOneAndUpdate(
      {
        _id: addressId,
        username, // Ensure user can only update their own addresses
      },
      {
        employerName: hasName ? employerName.trim() : '',
        address: hasAddress ? address.trim() : '',
        pinCode: pinCode ? pinCode.trim() : '',
        updatedAt: new Date(),
      },
      {
        new: true, // Return updated document
        runValidators: true,
      }
    );

    if (!updated) {
      throw new Error('Employer address not found or access denied');
    }

    return updated;
  } catch (error) {
    logger.error('Error updating employer address:', error);
    throw error;
  }
}

/**
 * Delete an employer address
 */
export async function deleteEmployerAddress(username, addressId) {
  try {
    const deleted = await EmployerAddress.findOneAndDelete({
      _id: addressId,
      username, // Ensure user can only delete their own addresses
    });

    if (!deleted) {
      throw new Error('Employer address not found or access denied');
    }

    return deleted;
  } catch (error) {
    logger.error('Error deleting employer address:', error);
    throw error;
  }
}

