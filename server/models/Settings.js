const mongoose = require('mongoose');

const DEFAULT_MATRIX = {
  coordinator: {
    dashboard: { view: true },
    registrants: { view: true, viewAll: true, add: true, editOwn: true, editAny: false, deleteOwn: true, deleteAny: false },
    merch: { view: true, toggleOwn: false, toggleAll: false },
    expenses: { view: true, viewAll: true, add: true, editOwn: true, editAny: false, deleteOwn: true, deleteAny: false },
    solicitations: { view: false, add: false, edit: false, delete: false, verify: false },
    reports: { view: true, exportCsv: true },
    activitylogs: { view: false }
  }
};

const settingsSchema = new mongoose.Schema({
  churchList: { type: [String], default: [] },
  churchColors: { type: mongoose.Schema.Types.Mixed, default: {} },
  waivedAgeChurches: { type: [String], default: [] },
  merchCosts: { type: mongoose.Schema.Types.Mixed, default: {} },
  ministries: { type: [String], default: ["Praise & Worship", "Children's Ministry", "Media/Tech", "Ushering"] },
  expenseCategories: { type: [String], default: ['Food', 'Venue', 'Supplies', 'Transportation', 'Others'] },
  paymentMethods: { type: [String], default: ['Cash (In-person)', 'GCash', 'Maya', 'Bank Transfer', 'Check'] },
  solicitationTypes: { type: [String], default: ["Individual", "Church Pledge", "Fundraising"] },
  shirtSizePhoto: { type: String, default: null },
  permissionMatrix: { type: mongoose.Schema.Types.Mixed, default: DEFAULT_MATRIX }
}, { strict: false });

const Settings = mongoose.model('Settings', settingsSchema);
module.exports = Settings;
module.exports.DEFAULT_MATRIX = DEFAULT_MATRIX;
