const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Registrant = require('../models/Registrant');
const Expense = require('../models/Expense');
const Solicitation = require('../models/Solicitation');
const Settings = require('../models/Settings');
const { DEFAULT_MATRIX } = require('../models/Settings');

// Helper to reliably merge permission matrix exactly as it appears in settings route
const mergePermissions = (defaults, saved) => {
  const result = JSON.parse(JSON.stringify(defaults));
  if (!saved || typeof saved !== 'object') return result;
  
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
  return result;
};

router.get('/', auth, async (req, res) => {
  try {
    const [registrants, expenses, solicitations, rawSettings] = await Promise.all([
      Registrant.find(),
      Expense.find(),
      Solicitation.find(),
      Settings.findOne({}, null, { strict: false }).lean()
    ]);

    let settings = rawSettings;
    if (!settings) {
      settings = { churchList: [], merchCosts: {} };
    }
    settings.permissionMatrix = mergePermissions(DEFAULT_MATRIX, settings.permissionMatrix);

    res.json({ registrants, expenses, solicitations, settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
