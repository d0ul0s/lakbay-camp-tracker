const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { attachPermissions, requirePermission } = require('../middleware/permissions');

router.use(attachPermissions);

// GET /api/activity-logs
router.get('/', requirePermission('activitylogs', 'view'), async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.itemsPerPage) || 10;
    const skip = (page - 1) * limit;

    const { action, role, date } = req.query;
    let query = {};

    if (action && action !== 'All') {
      query.action = action;
    }
    
    if (role && role !== 'All') {
      query.userRole = role;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.timestamp = { $gte: startOfDay, $lte: endOfDay };
    }

    const total = await ActivityLog.countDocuments(query);
    const logs = await ActivityLog.find(query)
      .populate('userId', 'fullName pin') 
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Activity logs error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
