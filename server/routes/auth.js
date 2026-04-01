const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { DEFAULT_MATRIX } = require('../models/Settings');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const cache = require('../utils/cache');

// Initialize both caches on startup
setTimeout(cache.initCaches, 500);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15, // Slightly increased for mobile testing
  message: { message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// LOGIN (Extreme RAM-Only Performance + Audit)
router.post('/login', loginLimiter, async (req, res) => {
  const startTotal = Date.now();
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ message: 'PIN is required' });

  try {
    // 1. PIN Check (RAM-Only)
    const startBcrypt = Date.now();
    let usersToCheck = cache.getUserCache();
    if (usersToCheck.length === 0) {
      usersToCheck = await User.find().lean();
    }

    const matches = await Promise.all(usersToCheck.map(async (u) => {
      try {
        const match = await bcrypt.compare(pin, u.pin);
        return match ? u : null;
      } catch (e) {
        return null; 
      }
    }));

    const matchedUser = matches.find(u => u !== null);
    const bcryptTime = Date.now() - startBcrypt;

    if (matchedUser) {
      // 2. Settings Load (RAM-Only)
      const startSettings = Date.now();
      let settings = cache.getSettingsCache();
      if (!settings) {
         settings = await Settings.findOne().lean();
      }
      const rawMatrix = (settings && settings.permissionMatrix) ? settings.permissionMatrix : DEFAULT_MATRIX;
      
      const mergePermissions = (defaults, saved) => {
        const result = { ...defaults };
        if (!saved || typeof saved !== 'object') return result;
        Object.keys(defaults).forEach(role => {
          if (!saved[role]) {
            result[role] = defaults[role];
          } else {
            result[role] = { ...defaults[role] };
            Object.keys(defaults[role]).forEach(page => {
              if (!saved[role][page]) {
                result[role][page] = defaults[role][page];
              } else {
                result[role][page] = { ...defaults[role][page], ...saved[role][page] };
              }
            });
          }
        });
        return result;
      };

      const permissionMatrix = mergePermissions(DEFAULT_MATRIX, rawMatrix);
      const settingsTime = Date.now() - startSettings;

      // 3. Token Gen
      const startToken = Date.now();
      const payload = {
        user: {
          id: matchedUser._id,
          role: matchedUser.role,
          church: matchedUser.church
        }
      };

      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || 'lakbay_secret_key',
        { expiresIn: '1d' }
      );

      res.cookie('lakbay_auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        maxAge: 24 * 60 * 60 * 1000 
      });
      const tokenTime = Date.now() - startToken;

      const totalTime = Date.now() - startTotal;

      return res.json({ 
        role: matchedUser.role, 
        church: matchedUser.church, 
        permissionMatrix: permissionMatrix,
        _id: matchedUser._id,
        token: token  // also return token in body for cross-origin Bearer auth (mobile)
      });
    }

    res.status(401).json({ message: 'Invalid PIN' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: err.message });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('lakbay_auth_token');
  res.json({ message: 'Logged out successfully' });
});

// GET USERS
router.get('/users', auth, async (req, res) => {
  if (req.user.role?.toLowerCase().trim() !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const users = await User.find().select('-pin');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// REGISTER (Admin only)
router.post('/register', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { church, pin, role } = req.body;

  try {
    const user = new User({ church, pin, role });
    await user.save();
    
    await cache.refreshUserCache();

    const userData = user.toObject();
    delete userData.pin;

    req.io.emit('DATA_UPDATED', { 
      type: 'users', 
      action: 'added', 
      user: req.user.role,
      userId: req.user.id,
      data: userData
    });

    res.status(201).json({ message: 'User registered successfully', _id: user._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE USER (Admin only)
router.put('/users/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  const { church, pin, role } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (church) user.church = church;
    if (role) user.role = role;
    if (pin) user.pin = pin; 

    await user.save();
    await cache.refreshUserCache();

    const userData = user.toObject();
    delete userData.pin;

    req.io.emit('DATA_UPDATED', { 
      type: 'users', 
      action: 'updated', 
      user: req.user.role,
      userId: req.user.id,
      data: userData
    });

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE USER (Admin only)
router.delete('/users/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the only administrative account.' });
      }
    }

    await User.findByIdAndDelete(req.params.id);
    await cache.refreshUserCache();

    req.io.emit('DATA_UPDATED', { 
      type: 'users', 
      action: 'deleted', 
      user: req.user.role,
      userId: req.user.id,
      data: { _id: req.params.id }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET CURRENT USER
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-pin');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE PROFILE (Self)
router.put('/profile', auth, async (req, res) => {
  const { eSignatureUrl } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (eSignatureUrl !== undefined) user.eSignatureUrl = eSignatureUrl;

    await user.save();
    await cache.refreshUserCache();

    const userData = user.toObject();
    delete userData.pin;

    res.json({ message: 'Profile updated successfully', user: userData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;