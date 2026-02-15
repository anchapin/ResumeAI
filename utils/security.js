/**
 * Security utilities for ResumeAI application
 */

// Input validation functions
const validateInput = (input, type = 'string', options = {}) => {
  if (input === null || input === undefined) {
    throw new Error('Input cannot be null or undefined');
  }

  switch (type) {
    case 'string':
      if (typeof input !== 'string') {
        throw new Error('Input must be a string');
      }
      
      // Sanitize string input
      const sanitized = sanitizeString(input);
      
      // Apply length constraints
      if (options.maxLength && sanitized.length > options.maxLength) {
        throw new Error(`Input exceeds maximum length of ${options.maxLength}`);
      }
      
      if (options.minLength && sanitized.length < options.minLength) {
        throw new Error(`Input is shorter than minimum length of ${options.minLength}`);
      }
      
      // Check for malicious patterns
      if (!isValidString(sanitized, options.pattern)) {
        throw new Error('Input contains invalid characters or patterns');
      }
      
      return sanitized;
    
    case 'email':
      if (typeof input !== 'string') {
        throw new Error('Email must be a string');
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input)) {
        throw new Error('Invalid email format');
      }
      
      return sanitizeString(input);
    
    case 'number':
      if (typeof input === 'string') {
        input = parseFloat(input);
      }
      
      if (isNaN(input)) {
        throw new Error('Input must be a valid number');
      }
      
      if (options.min !== undefined && input < options.min) {
        throw new Error(`Number must be greater than or equal to ${options.min}`);
      }
      
      if (options.max !== undefined && input > options.max) {
        throw new Error(`Number must be less than or equal to ${options.max}`);
      }
      
      return input;
    
    case 'array':
      if (!Array.isArray(input)) {
        throw new Error('Input must be an array');
      }
      
      if (options.maxItems && input.length > options.maxItems) {
        throw new Error(`Array exceeds maximum items of ${options.maxItems}`);
      }
      
      if (options.minItems && input.length < options.minItems) {
        throw new Error(`Array has fewer items than minimum of ${options.minItems}`);
      }
      
      return input.map(item => validateInput(item, options.itemType, options.itemOptions));
    
    case 'object':
      if (typeof input !== 'object' || Array.isArray(input) || input === null) {
        throw new Error('Input must be an object');
      }
      
      return input;
    
    default:
      return input;
  }
};

// Sanitize string input to prevent injection attacks
const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    return str;
  }
  
  // Remove potentially dangerous characters/patterns
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
};

// Validate string against a pattern
const isValidString = (str, pattern) => {
  if (!pattern) return true;
  
  if (pattern instanceof RegExp) {
    return pattern.test(str);
  }
  
  return new RegExp(pattern).test(str);
};

// Generate secure random token
const generateSecureToken = (length = 32) => {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
};

// Hash sensitive data
const hashData = async (data, algorithm = 'sha256') => {
  const crypto = require('crypto');
  const hash = crypto.createHash(algorithm);
  hash.update(data);
  return hash.digest('hex');
};

// Encrypt sensitive data (simple implementation - in production, use proper encryption)
const encryptData = (data, secretKey) => {
  try {
    const crypto = require('crypto');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', secretKey);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    throw new Error('Encryption failed: ' + error.message);
  }
};

// Decrypt sensitive data
const decryptData = (encryptedData, secretKey) => {
  try {
    const crypto = require('crypto');
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipher('aes-256-cbc', secretKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: ' + error.message);
  }
};

// Validate JWT token (placeholder - would use a proper JWT library in production)
const validateJWT = (token, secret) => {
  if (!token) {
    throw new Error('No token provided');
  }
  
  try {
    // In a real implementation, you'd use a JWT library like jsonwebtoken
    // This is a simplified version for demonstration
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    // Decode payload (second part)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new Error('Token expired');
    }
    
    // In a real implementation, you'd verify the signature here
    
    return payload;
  } catch (error) {
    throw new Error('Invalid token: ' + error.message);
  }
};

// Generate JWT token (placeholder)
const generateJWT = (payload, secret, expiresIn = '1h') => {
  const crypto = require('crypto');
  
  // Calculate expiration timestamp
  const exp = Math.floor(Date.now() / 1000) + 
    (expiresIn.includes('h') ? parseInt(expiresIn) * 60 * 60 :
     expiresIn.includes('d') ? parseInt(expiresIn) * 24 * 60 * 60 :
     parseInt(expiresIn));
  
  // Add expiration to payload
  const tokenPayload = { ...payload, exp };
  
  // Encode header and payload
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payloadEncoded = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
  
  // In a real implementation, you'd sign with the secret
  // This is a simplified version for demonstration
  const signature = crypto.createHmac('sha256', secret)
    .update(header + '.' + payloadEncoded)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return `${header}.${payloadEncoded}.${signature}`;
};

module.exports = {
  validateInput,
  sanitizeString,
  isValidString,
  generateSecureToken,
  hashData,
  encryptData,
  decryptData,
  validateJWT,
  generateJWT
};