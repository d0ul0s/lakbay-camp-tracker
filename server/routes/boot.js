const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Registrant = require('../models/Registrant');
const Expense = require('../models/Expense');
const Solicitation = require('../models/Solicitation');
const Announcement = require('../models/Announcement');
const WorshipSession = require('../models/WorshipSession');
const PointLog = require('../models/PointLog');
const Award = require('../models/Award');
const Settings = require('../models/Settings');
const CampGroup = require('../models/CampGroup');
const { DEFAULT_MATRIX } = require('../models/Settings');

// Helper to reliably merge permission matrix exactly as it appears in settings route
const mergePermissions = (defaults, saved) => {
  const result = JSON.parse(JSON.stringify(defaults));
  if (!saved || typeof saved !== 'object') return result;
  
  // Merge defaults with saved settings
  Object.keys(defaults).forEach(role => {
    if (!saved[role] || typeof saved[role] !== 'object') {
      result[role] = defaults[role];
    } else {
      Object.keys(defaults[role]).forEach(page => {
        if (!saved[role][page] || typeof saved[role][page] !== 'object') {
          result[role][page] = defaults[role][page];
        } else {
          result[role][page] = { ...defaults[role][page], ...saved[role][page] };
        }
      });
    }
  });

  // Preserve any roles from DB not in defaults (e.g. dynamic roles if they existed)
  Object.keys(saved).forEach(role => {
    if (!result[role]) {
      result[role] = saved[role];
    }
  });

  return result;
};

router.get('/', auth, async (req, res) => {
  try {
    const [registrants, expenses, solicitations, announcements, points, worshipSessions, awards, groups, rawSettings] = await Promise.all([
      Registrant.find(),
      Expense.find(),
      Solicitation.find(),
      Announcement.find().sort({ priority: -1, createdAt: -1 }),
      PointLog.find()
        .populate('groupId', 'name')
        .populate('createdBy', 'church role')
        .populate('verifiedBy', 'role')
        .sort({ createdAt: -1 }),
      WorshipSession.find({ isActive: true }).sort({ sessionDate: 1, order: 1 }),
      Award.find()
        .populate('nominations.camperId', 'fullName church sex age')
        .populate('nominations.groupId', 'name color')
        .populate('nominations.nominatedBy', 'church role')
        .sort({ createdAt: -1 }),
      CampGroup.find(),
      Settings.findOne({}, null, { strict: false }).lean()
    ]);

    let settings = rawSettings;
    if (!settings) {
      settings = { churchList: [], merchCosts: {} };
    }
    settings.permissionMatrix = mergePermissions(DEFAULT_MATRIX, settings.permissionMatrix);

    res.json({ registrants, expenses, solicitations, announcements, points, worship: worshipSessions, awards, groups, settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
