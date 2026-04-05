const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const jwt = require('jsonwebtoken');
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

// POST /api/activity-logs/visit
// Public/Hybrid endpoint to log visits
router.post('/visit', async (req, res) => {
  try {
    let userData = { role: 'anonymous', userId: null, church: null };
    
    // Attempt soft auth
    let token = null;
    if (req.cookies && req.cookies.lakbay_auth_token) {
      token = req.cookies.lakbay_auth_token;
    } else if (req.header('Authorization')) {
      token = req.header('Authorization').split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lakbay_secret_key');
        if (decoded && decoded.user) {
          userData.userId = decoded.user.id;
          userData.role = decoded.user.role;
          userData.church = decoded.user.church;
        }
      } catch (e) {
        // Ignore invalid tokens for visit tracking — stay anonymous
      }
    }

    const log = new ActivityLog({
      userId: userData.userId,
      userRole: userData.role,
      userChurch: userData.church,
      action: 'VISIT',
      entityType: 'Visit',
      details: { 
        userAgent: req.get('User-Agent'),
        referrer: req.get('Referrer') || 'Direct',
        path: req.body.path || '/'
      }
    });

    await log.save();
    res.status(201).json({ message: 'Visit logged' });
  } catch (err) {
    console.error('Visit log error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
