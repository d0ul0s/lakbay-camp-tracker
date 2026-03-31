const express = require('express');
const router = express.Router();
const PointLog = require('../models/PointLog');
const CampGroup = require('../models/CampGroup');
const { requirePermission, attachPermissions } = require('../middleware/permissions');
const auth = require('../middleware/auth');

// PUBLIC ROUTE (No Auth Required)
router.get('/public', async (req, res) => {
  try {
    const logs = await PointLog.find({ verified: true })
      .populate('groupId', 'name')
      .populate('createdBy', 'church role')
      .sort({ createdAt: -1 })
      .limit(30);

    const groups = await CampGroup.find({}, 'name');
    const scores = {};
    
    // In-memory score calc to avoid complex aggregation for simple pulse
    const allVerified = await PointLog.find({ verified: true });
    allVerified.forEach(p => {
      scores[p.groupId] = (scores[p.groupId] || 0) + p.points;
    });

    const scoreboard = groups.map(g => ({
      id: g._id,
      name: g.name,
      score: scores[g._id.toString()] || 0
    })).sort((a, b) => b.score - a.score);

    res.json({ logs, scoreboard });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Apply auth and attachPermissions to all OTHER routes
router.use(auth);
router.use(attachPermissions);

// Get all point logs (Authenticated)
router.get('/', requirePermission('points', 'view'), async (req, res) => {
  try {
    const logs = await PointLog.find()
      .populate('groupId', 'name')
      .populate('createdBy', 'church role')
      .populate('verifiedBy', 'role')
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Submit points (Merit/Demerit)
router.post('/', requirePermission('points', 'add'), async (req, res) => {
  const { groupId, type, points, reason } = req.body;
  const isAdmin = req.user.role === 'admin';
  const pointValue = Math.abs(points); // Ensure positive input, we'll assign the sign based on type

  try {
    // Logic updated: No more quota limits for coordinators as per user request.
    
    // Create the log
    const finalPoints = type === 'merit' ? pointValue : -pointValue;
    
    const newLog = new PointLog({
      groupId,
      type,
      points: finalPoints,
      reason,
      createdBy: req.user.id,
      verified: isAdmin, // Admins auto-verify their only entries
      verifiedBy: isAdmin ? req.user.id : undefined,
      verifiedAt: isAdmin ? new Date() : undefined
    });

    const saved = await newLog.save();
    
    const populated = await PointLog.findById(saved._id)
      .populate('groupId', 'name')
      .populate('createdBy', 'church role');

    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update Point Log Reason (Creator or Admin)
router.put('/:id', async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ message: 'Reason is required' });

  try {
    const log = await PointLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log entry not found' });

    // Permission check: Must be the creator OR an admin
    const isAdmin = req.user.role === 'admin';
    const isCreator = log.createdBy.toString() === req.user.id;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ message: 'You do not have permission to edit this entry' });
    }

    log.reason = reason;
    const saved = await log.save();
    
    const populated = await PointLog.findById(saved._id)
      .populate('groupId', 'name')
      .populate('createdBy', 'church role')
      .populate('verifiedBy', 'role');

    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Verify Points (Admin Only in Matrix)
router.put('/:id/verify', requirePermission('points', 'verify'), async (req, res) => {
  try {
    const log = await PointLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log entry not found' });

    log.verified = true;
    log.verifiedBy = req.user.id;
    log.verifiedAt = new Date();

    const saved = await log.save();
    const populated = await PointLog.findById(saved._id)
      .populate('groupId', 'name')
      .populate('createdBy', 'church role')
      .populate('verifiedBy', 'role');

    res.json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete Log (Admin Only in Matrix)
router.delete('/:id', requirePermission('points', 'delete'), async (req, res) => {
  try {
    const log = await PointLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log entry not found' });

    await log.deleteOne();
    res.json({ message: 'Point log deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
