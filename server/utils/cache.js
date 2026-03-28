const User = require('../models/User');
const Settings = require('../models/Settings');

let userCache = [];
let settingsCache = null;

const refreshUserCache = async () => {
  try {
    userCache = await User.find().lean();
  } catch (err) {
    console.error('[CACHE] User Cache Error:', err);
  }
};

const refreshSettingsCache = async () => {
  try {
    settingsCache = await Settings.findOne().lean();
  } catch (err) {
    console.error('[CACHE] Settings Cache Error:', err);
  }
};

const initCaches = async () => {
  await Promise.all([refreshUserCache(), refreshSettingsCache()]);
};

module.exports = {
  getUserCache: () => userCache,
  getSettingsCache: () => settingsCache,
  refreshUserCache,
  refreshSettingsCache,
  initCaches
};
