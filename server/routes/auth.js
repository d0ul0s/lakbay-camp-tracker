const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts, please try again after 15 minutes' }
});

// LOGIN
router.post('/login', loginLimiter, async (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ message: 'PIN is required' });

  try {
    const users = await User.find();

    for (const user of users) {
      const match = await bcrypt.compare(pin, user.pin);
      if (match) {
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
            return res.json({ token, role: user.role, church: user.church, _id: user._id });
          }
        );
        return;
      }
    }

    res.status(401).json({ message: 'Invalid PIN' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET USERS
router.get('/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const users = await User.find().select('-pin');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;