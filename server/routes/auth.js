const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { message: 'Too many login attempts, please try again after 15 minutes' }
});

router.post('/login', loginLimiter, async (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ message: 'PIN is required' });
  }

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

router.post('/register', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    if (req.body.role === 'treasurer') {
      const existingTreasurer = await User.findOne({ role: 'treasurer' });
      if (existingTreasurer) {
        return res.status(400).json({ message: 'A Treasurer account already exists. Only one is allowed.' });
      }
    }
    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json({ message: 'User created' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get('/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const users = await User.find().select('-pin'); // Exclude pin from results
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/users/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/users/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (req.body.role === 'treasurer' && user.role !== 'treasurer') {
      const existingTreasurer = await User.findOne({ role: 'treasurer' });
      if (existingTreasurer) {
        return res.status(400).json({ message: 'A Treasurer account already exists. Only one is allowed.' });
      }
    }

    if (req.body.church) user.church = req.body.church;
    if (req.body.pin) user.pin = req.body.pin;
    if (req.body.role) user.role = req.body.role;
    
    await user.save();
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
