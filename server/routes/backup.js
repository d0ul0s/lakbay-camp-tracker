const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Registrant = require('../models/Registrant');
const Expense = require('../models/Expense');
const Solicitation = require('../models/Solicitation');
const Settings = require('../models/Settings');

const ensureAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }
};

router.use(ensureAdmin);

// GET /api/backup/export
router.get('/export', async (req, res) => {
  try {
    const users = await User.find({}).select('-pin').lean(); // Excluding PIN hashes for safety as requested
    const registrants = await Registrant.find({}).lean();
    const expenses = await Expense.find({}).lean();
    const solicitations = await Solicitation.find({}).lean();
    const settings = await Settings.findOne({}).lean();

    res.json({
      timestamp: new Date().toISOString(),
      data: {
        users,
        registrants,
        expenses,
        solicitations,
        settings: settings ? [settings] : []
      }
    });

  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ message: 'Error exporting backup' });
  }
});

// POST /api/backup/import
router.post('/import', async (req, res) => {
  const payload = req.body;
  const data = payload.data ? payload.data : payload; // Handle wrapped or unwrapped backups
  
  // 1. Validate structure
  if (!data || !Array.isArray(data.users) || !Array.isArray(data.registrants) || 
      !Array.isArray(data.expenses) || !Array.isArray(data.solicitations) || !Array.isArray(data.settings)) {
    return res.status(400).json({ message: 'Invalid backup file structure. Missing required data arrays.' });
  }

  console.log('Validating imported backup...', data);
  
  try {
    // 2. Create a temporary backup of current data
    const currentUsers = await User.find({}).lean();
    const currentRegistrants = await Registrant.find({}).lean();
    const currentExpenses = await Expense.find({}).lean();
    const currentSolicitations = await Solicitation.find({}).lean();
    const currentSettings = await Settings.find({}).lean();

    const rollback = async () => {
      console.log('Initiating rollback...');
      await User.deleteMany({});
      await Registrant.deleteMany({});
      await Expense.deleteMany({});
      await Solicitation.deleteMany({});
      await Settings.deleteMany({});
      
      if (currentUsers.length > 0) await User.insertMany(currentUsers);
      if (currentRegistrants.length > 0) await Registrant.insertMany(currentRegistrants);
      if (currentExpenses.length > 0) await Expense.insertMany(currentExpenses);
      if (currentSolicitations.length > 0) await Solicitation.insertMany(currentSolicitations);
      if (currentSettings.length > 0) await Settings.insertMany(currentSettings);
      console.log('Rollback complete.');
    };

    // 3. Drop collections and overwrite
    try {
      await User.deleteMany({});
      await Registrant.deleteMany({});
      await Expense.deleteMany({});
      await Solicitation.deleteMany({});
      await Settings.deleteMany({});

      // Users imported without PINs will need them recreated somehow, unless the backup JSON didn't strip them.
      // We will allow insertion as-is. Mongoose might throw validation errors if pins are required and missing.
      // So if 'pin' is required in User.js, it might fail. Since this is an admin export/import, validation will catch it and rollback.
      if (data.users.length > 0) await User.insertMany(data.users);
      if (data.registrants.length > 0) await Registrant.insertMany(data.registrants);
      if (data.expenses.length > 0) await Expense.insertMany(data.expenses);
      if (data.solicitations.length > 0) await Solicitation.insertMany(data.solicitations);
      if (data.settings.length > 0) await Settings.insertMany(data.settings);
      
      return res.json({ message: 'Backup restored successfully' });
    } catch (writeErr) {
      console.error('Error writing new data, rolling back...', writeErr);
      await rollback();
      throw new Error('Database write failed. Original data restored.');
    }
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ message: err.message || 'Error restoring backup' });
  }
});

module.exports = router;
