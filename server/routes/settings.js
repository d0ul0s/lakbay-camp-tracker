const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne({}, null, { strict: false }).lean();
    
    // Ensure defaults for branding fields even on leand objects
    if (settings) {
      const brandingFields = [
        'campName', 'churchName', 'campDate', 'campLocation', 'campSignatory',
        'waiverTemplate', 'solicitationTemplate'
      ];
      brandingFields.forEach(field => {
        if (settings[field] === undefined) {
          settings[field] = Settings.schema.path(field)?.defaultValue || '';
        }
      });
    }

    if (!settings) {
      const doc = await Settings.create({ 
        churchList: [], 
        merchCosts: {},
        campName: 'LAKBAY 2026',
        churchName: 'UNITED PENTECOSTAL CHURCH PHILIPPINES',
        campDate: 'MAY 20-23, 2026',
        campLocation: 'SUMMER CAMP VENUE',
        campSignatory: 'CAMP DIRECTOR'
      });
      settings = doc.toObject();
    }

    // Use pure JS object defaults to avoid Mongoose internal proxies breaking Object.keys()
    const { DEFAULT_MATRIX } = require('../models/Settings');
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

    settings.permissionMatrix = mergePermissions(DEFAULT_MATRIX, settings.permissionMatrix);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const update = {};
    const fields = [
      'churchList', 'churchColors', 'waivedAgeChurches', 'merchCosts', 'ministries', 
      'expenseCategories', 'paymentMethods', 
      'solicitationTypes', 'shirtSizePhoto', 'permissionMatrix',
      'campName', 'churchName', 'campDate', 'campLocation', 'campSignatory',
      'waiverTemplate', 'solicitationTemplate', 'logoUrl'
    ];
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    });

    const settings = await Settings.findOneAndUpdate(
      {}, 
      { $set: update },
      { new: true, upsert: true, runValidators: true, strict: false }
    );
    
    // Broadcast update for all clients
    req.io.emit('DATA_UPDATED', { 
      type: 'settings', 
      action: 'updated', 
      user: req.user.role,
      userId: req.user.id,
      data: settings
    });

    const cache = require('../utils/cache');
    await cache.refreshSettingsCache();

    res.json(settings);
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
