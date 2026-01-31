/**
 * User Model
 * Authentication model for EPFO Recovery Soft
 */

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Username for login (must be unique)
  username: {
    type: String,
    required: true,
    unique: true,
  },
  
  // Password (will be hashed later)
  password: {
    type: String,
    required: true,
  },
  
  // Regional office code (optional - can be set later in office details)
  regional_office_code: {
    type: String,
    default: '',
  },
  
  // Timestamp when user was created
  created_at: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model('User', userSchema);

export default User;

