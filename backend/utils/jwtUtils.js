const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate JWT access token
 * @param {object} payload - Token payload
 * @returns {string} - JWT token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'solar-plant-monitor',
    audience: 'solar-plant-users'
  });
};

/**
 * Generate JWT refresh token
 * @param {object} payload - Token payload
 * @returns {string} - JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'solar-plant-monitor',
    audience: 'solar-plant-users'
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object} - Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'solar-plant-monitor',
      audience: 'solar-plant-users'
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Decode JWT token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {object} - Decoded token payload
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Generate token pair (access + refresh)
 * @param {object} user - User object
 * @returns {object} - Token pair
 */
const generateTokenPair = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    companyName: user.companyName
  };
  
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
    expiresIn: JWT_EXPIRES_IN
  };
};

/**
 * Middleware to authenticate JWT tokens
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Next middleware function
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      code: 'MISSING_TOKEN'
    });
  }
  
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * Middleware to check user roles
 * @param {array} allowedRoles - Array of allowed roles
 * @returns {function} - Middleware function
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Middleware to check company access
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Next middleware function
 */
const requireCompanyAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  const requestedCompanyId = req.params.companyId || req.body.companyId;
  
  // Super admin can access all companies
  if (req.user.role === 'super_admin') {
    return next();
  }
  
  // Other users can only access their own company
  if (req.user.companyId !== requestedCompanyId) {
    return res.status(403).json({
      error: 'Access denied to this company',
      code: 'COMPANY_ACCESS_DENIED'
    });
  }
  
  next();
};

/**
 * Generate secure session data
 * @param {object} user - User object
 * @returns {object} - Session data
 */
const generateSessionData = (user) => {
  const sessionId = crypto.randomBytes(16).toString('hex');
  const tokens = generateTokenPair(user);
  
  return {
    sessionId,
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    companyName: user.companyName,
    ...tokens,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  generateTokenPair,
  authenticateToken,
  requireRole,
  requireCompanyAccess,
  generateSessionData,
  JWT_SECRET
};





