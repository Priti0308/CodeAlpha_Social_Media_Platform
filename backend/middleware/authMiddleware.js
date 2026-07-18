const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protected view check middleware
const protect = async (req, res, next) => {
  let token;

  // Check headers for Authorization Bearer token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access denied. No authentication token provided.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by ID and attach to request
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User associated with this token no longer exists.' });
    }
    
    next();
  } catch (err) {
    console.error('JWT Verification error:', err);
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
};

module.exports = { protect };
