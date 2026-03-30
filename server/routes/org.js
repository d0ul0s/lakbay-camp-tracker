const express = require('express');
const router = express.Router();
const CampLeader = require('../models/CampLeader');
const CampGroup = require('../models/CampGroup');
const Registrant = require('../models/Registrant');
const auth = require('../middleware/auth');
const logActivity = require('../utils/logger');

// Middleware to strictly enforce admin role for destructive actions
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only Admins can modify Organization data.' });
  }
  next();
};

// ===============================
// REGISTRANTS (Participants)
// ===============================

// GET all registrant names for group sorting (Authenticated only)
router.get('/registrants', auth, async (req, res) => {
  try {
    const registrants = await Registrant.find({}, 'fullName church').sort({ fullName: 1 });
    res.json(registrants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===============================
// LEADERS/STAFF ROUTES
// ===============================

// GET all leaders & staff (Public access)
router.get('/leaders', async (req, res) => {
  try {
    const leaders = await CampLeader.find({}).sort({ name: 1 });
    // Normalize legacy docs: populate `categories` from old single `category` field
    const normalized = leaders.map(l => {
      const obj = l.toJSON();
      if (!obj.categories || obj.categories.length === 0) {
        obj.categories = obj.category ? [obj.category] : [];
      }
      return obj;
    });
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new leader
router.post('/leaders', auth, requireAdmin, async (req, res) => {
  try {
    const { name, churchRef, categories, category, image, socialLink } = req.body;
    // Normalize: build a clean categories array
    let cats = Array.isArray(categories) && categories.length > 0
      ? categories
      : (category ? [category] : []);

    const newLeader = new CampLeader({
      name,
      churchRef: churchRef || null,
      categories: cats,
      category: cats[0] || null,
      image: image || '',
      socialLink: socialLink || '',
    });
    await newLeader.save();
    
    await logActivity(
      req.user.id,
      req.user.role,
      'Added Organization Role',
      `Added ${name} to: ${cats.join(', ')}`,
      req.ip
    );
    
    res.json(newLeader);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update leader
router.put('/leaders/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { name, churchRef, categories, category, image, socialLink } = req.body;
    // Build clean categories array — this is the source of truth
    let cats = Array.isArray(categories) && categories.length > 0
      ? categories
      : (category ? [category] : []);

    // Use $set with explicit fields to avoid Mongoose enum/id conflicts
    const updatePayload = {
      $set: {
        name,
        churchRef: churchRef || null,
        categories: cats,
        category: cats[0] || null,   // keep legacy field in sync
        image: image || '',
        socialLink: socialLink || '',
      }
    };

    const leader = await CampLeader.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: false } // skip enum validation on legacy field
    );
    
    await logActivity(
      req.user.id,
      req.user.role,
      'Updated Organization Role',
      `Updated role details for ${leader.name} (${cats.join(', ')})`,
      req.ip
    );
    
    res.json(leader);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE leader
router.delete('/leaders/:id', auth, requireAdmin, async (req, res) => {
  try {
    const leader = await CampLeader.findByIdAndDelete(req.params.id);
    if (!leader) return res.status(404).json({ message: 'Leader not found' });
    
    await logActivity(
      req.user.id,
      req.user.role,
      'Deleted Organization Role',
      `Removed role: ${leader.name}`,
      req.ip
    );
    
    res.json({ message: 'Leader removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===============================
// GROUPS ROUTES
// ===============================

// GET all groups (Public access)
router.get('/groups', async (req, res) => {
  try {
    const groups = await CampGroup.find({}).sort({ name: 1 });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new group
router.post('/groups', auth, requireAdmin, async (req, res) => {
  try {
    const newGroup = new CampGroup(req.body);
    await newGroup.save();
    
    await logActivity(
      req.user.id,
      req.user.role,
      'Created Camp Group',
      `Created group: ${req.body.name}`,
      req.ip
    );
    
    res.json(newGroup);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update group
router.put('/groups/:id', auth, requireAdmin, async (req, res) => {
  try {
    const group = await CampGroup.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    await logActivity(
      req.user.id,
      req.user.role,
      'Updated Camp Group',
      `Updated structure of ${group.name}`,
      req.ip
    );
    
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE group
router.delete('/groups/:id', auth, requireAdmin, async (req, res) => {
  try {
    const group = await CampGroup.findByIdAndDelete(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    
    await logActivity(
      req.user.id,
      req.user.role,
      'Deleted Camp Group',
      `Removed group: ${group.name}`,
      req.ip
    );
    
    res.json({ message: 'Group removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
