const express = require('express');
const router = express.Router();
const PointLog = require('../models/PointLog');
const CampGroup = require('../models/CampGroup');
const { requirePermission, attachPermissions } = require('../middleware/permissions');
const auth = require('../middleware/auth');

// Apply auth and attachPermissions to all routes
router.use(auth);
router.use(attachPermissions);

// Get all point logs
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
    // 1. Quota Check for Coordinators (Merit only)
    if (type === 'merit' && !isAdmin) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayMerit = await PointLog.find({
        createdBy: req.user._id,
        type: 'merit',
        createdAt: { $gte: today }
      });

      const totalGivenToday = todayMerit.reduce((sum, log) => sum + log.points, 0);
      const DAILY_QUOTA = 50; // Merit points per day

      if (totalGivenToday + pointValue > DAILY_QUOTA) {
        return res.status(403).json({ 
          message: `Daily merit quota exceeded manually. You have ${DAILY_QUOTA - totalGivenToday} points left for today.` 
        });
      }
    }

    // 2. Create the log
    const finalPoints = type === 'merit' ? pointValue : -pointValue;
    
    const newLog = new PointLog({
      groupId,
      type,
      points: finalPoints,
      reason,
      createdBy: req.user._id,
      verified: isAdmin, // Admins auto-verify their only entries
      verifiedBy: isAdmin ? req.user._id : undefined,
      verifiedAt: isAdmin ? new Date() : undefined
    });

    const saved = await newLog.save();
    
    // Populate for response
    const populated = await PointLog.findById(saved._id)
      .populate('groupId', 'name')
      .populate('createdBy', 'church role');

    res.status(201).json(populated);
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
    log.verifiedBy = req.user._id;
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
