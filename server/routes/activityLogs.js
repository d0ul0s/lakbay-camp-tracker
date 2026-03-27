const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { attachPermissions, requirePermission } = require('../middleware/permissions');

router.use(attachPermissions);

// GET /api/activity-logs
router.get('/', requirePermission('activitylogs', 'view'), async (req, res) => {
  try {

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

    const logs = await ActivityLog.find(query)
      .populate('userId', 'fullName pin') // Populate required fields if needed, but we mainly need name. Since User model doesn't have fullName, it has pin/role. Let's just rely on userRole and userChurch.
      .sort({ timestamp: -1 })
      .limit(500); // Limit to top 500 logs to prevent massive payloads

    res.json(logs);
  } catch (err) {
    console.error('Activity logs error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
