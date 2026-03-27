const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Temporarily increased to unblock user testing
  message: { message: 'Too many login attempts, please try again after 15 minutes' }
});

// LOGIN
router.post('/login', loginLimiter, async (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ message: 'PIN is required' });

  try {
    const users = await User.find();
    
    // Fetch settings to get permissionMatrix
    const Settings = require('../models/Settings');
    const { DEFAULT_MATRIX } = require('../models/Settings');
    
    // Extracted merge function to ensure auth login ALWAYS has valid fallback matrix keys
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

    const settings = await Settings.findOne().lean();
    const rawMatrix = (settings && settings.permissionMatrix) ? settings.permissionMatrix : DEFAULT_MATRIX;
    const permissionMatrix = mergePermissions(DEFAULT_MATRIX, rawMatrix);


    for (const user of users) {
      const match = await bcrypt.compare(pin, user.pin);
      if (match) {
        // Admin gets full pass, but we can pass their matrix if they had one (none needed).
        // Let's attach role's matrix or null for admin.
        const userMatrix = user.role === 'admin' ? null : permissionMatrix[user.role];

        const payload = {
          user: {
            id: user._id,
            role: user.role,
            church: user.church
          }
        };

        jwt.sign(
          payload,
          process.env.JWT_SECRET || 'lakbay_secret_key',
          { expiresIn: '1d' },
          (err, token) => {
            if (err) throw err;
            return res.json({ 
              token, 
              role: user.role, 
              church: user.church, 
              permissionMatrix: permissionMatrix, // Send the full matrix to the frontend store
              _id: user._id 
            });
          }
        );
        return;
      }
    }

    res.status(401).json({ message: 'Invalid PIN' });
  } catch (err) {
    console.error('Login error precisely:', err);
    res.status(500).json({ message: err.message });
  }
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
    let user = new User({ church, pin, role });
    await user.save();
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
    if (pin) user.pin = pin; // Will be hashed by pre-save hook

    await user.save();
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

    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the only administrative account.' });
      }
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;