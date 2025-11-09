const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Password hashing configuration
const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} - True if passwords match
 */
const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('Error comparing password:', error);
    return false;
  }
};

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 12)
 * @returns {string} - Generated password
 */
const generateSecurePassword = (length = 12) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one character from each required category
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
  password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Special character
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} - Generated token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate a session ID
 * @returns {string} - Generated session ID
 */
const generateSessionId = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result
 */
const validatePasswordStrength = (password) => {
  const result = {
    isValid: true,
    errors: [],
    score: 0
  };
  
  if (password.length < 8) {
    result.errors.push('Password must be at least 8 characters long');
    result.isValid = false;
  }
  
  if (!/[a-z]/.test(password)) {
    result.errors.push('Password must contain at least one lowercase letter');
    result.isValid = false;
  }
  
  if (!/[A-Z]/.test(password)) {
    result.errors.push('Password must contain at least one uppercase letter');
    result.isValid = false;
  }
  
  if (!/\d/.test(password)) {
    result.errors.push('Password must contain at least one number');
    result.isValid = false;
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    result.errors.push('Password must contain at least one special character (@$!%*?&)');
    result.isValid = false;
  }
  
  // Calculate strength score
  if (password.length >= 8) result.score += 1;
  if (password.length >= 12) result.score += 1;
  if (/[a-z]/.test(password)) result.score += 1;
  if (/[A-Z]/.test(password)) result.score += 1;
  if (/\d/.test(password)) result.score += 1;
  if (/[@$!%*?&]/.test(password)) result.score += 1;
  if (password.length >= 16) result.score += 1;
  if (/[^a-zA-Z0-9@$!%*?&]/.test(password)) result.score += 1; // Additional special chars
  
  return result;
};

module.exports = {
  hashPassword,
  comparePassword,
  generateSecurePassword,
  generateSecureToken,
  generateSessionId,
  validatePasswordStrength
};





