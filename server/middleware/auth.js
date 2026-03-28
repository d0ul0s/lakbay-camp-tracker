const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  let token = null;

  // 1. Check Cookies (Primary)
  if (req.cookies && req.cookies.lakbay_auth_token) {
    token = req.cookies.lakbay_auth_token;
  } 
  // 2. Check Authorization Header (Fallback)
  else if (req.header('Authorization')) {
    const authHeader = req.header('Authorization');
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lakbay_secret_key');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};