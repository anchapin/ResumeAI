/**
 * Authentication middleware for ResumeAI API
 */

const jwt = require('jsonwebtoken');
const { validateJWT } = require('../utils/security');

// JWT secret key (should be stored securely in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Middleware to authenticate JWT tokens
const authenticateJWT = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      message: 'Authorization header missing or malformed'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attach user info to request
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please refresh your authentication token'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        error: 'Invalid token',
        message: 'The provided token is not valid'
      });
    } else {
      return res.status(500).json({
        error: 'Authentication error',
        message: 'An error occurred during authentication'
      });
    }
  }
};

// Role-based access control middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated to access this resource'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: 'User does not have required role to access this resource'
      });
    }

    next();
  };
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'User must be authenticated to access this resource'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      message: 'Only administrators can access this resource'
    });
  }

  next();
};

// Middleware to check if user is authenticated (any role)
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'User must be authenticated to access this resource'
    });
  }

  next();
};

// Session management utilities
const createSession = (userId, userData) => {
  // In a real implementation, you'd store session data in a database
  // This is a simplified version for demonstration
  const sessionData = {
    userId,
    createdAt: new Date(),
    lastAccessed: new Date(),
    ...userData
  };

  // Create a signed JWT token for the session
  const token = jwt.sign(sessionData, JWT_SECRET, { expiresIn: '24h' });
  return token;
};

// Middleware to refresh session
const refreshSession = (req, res, next) => {
  if (req.user) {
    // Update last accessed time in a real implementation
    // For now, we'll just continue
    next();
  } else {
    next(); // Continue even if not authenticated, but don't refresh
  }
};

module.exports = {
  authenticateJWT,
  requireRole,
  requireAdmin,
  isAuthenticated,
  createSession,
  refreshSession
};