const mongoose = require('mongoose');

const DEFAULT_MATRIX = {
  treasurer: {
    dashboard: { view: true },
    registrants: { view: true, viewAll: true, add: true, editOwn: true, editAny: false, deleteOwn: true, deleteAny: false },
    merch: { view: true, toggleOwn: false, toggleAll: true },
    expenses: { view: true, viewAll: true, add: true, editOwn: true, editAny: false, deleteOwn: true, deleteAny: false },
    solicitations: { view: true, add: true, edit: true, delete: true, verify: true },
    reports: { view: true, exportCsv: true },
    announcements: { view: false },
    org: { view: true },
    points: { view: true, add: false, verify: false, delete: false },
    activitylogs: { view: true }
  },
  coordinator: {
    dashboard: { view: true },
    registrants: { view: true, viewAll: true, add: true, editOwn: true, editAny: false, deleteOwn: true, deleteAny: false },
    merch: { view: true, toggleOwn: false, toggleAll: false },
    expenses: { view: true, viewAll: true, add: true, editOwn: true, editAny: false, deleteOwn: true, deleteAny: false },
    solicitations: { view: false, add: false, edit: false, delete: false, verify: false },
    reports: { view: true, exportCsv: true },
    announcements: { view: false },
    org: { view: false },
    points: { view: true, add: true, verify: false, delete: false },
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
  campName: { type: String, default: 'LAKBAY 2026' },
  churchName: { type: String, default: 'UNITED PENTECOSTAL CHURCH PHILIPPINES' },
  campDate: { type: String, default: 'MAY 20-23, 2026' },
  campLocation: { type: String, default: 'SUMMER CAMP VENUE' },
  campSignatory: { type: String, default: 'CAMP DIRECTOR' },
  logoUrl: { type: String, default: null },
  waiverTemplate: { type: String, default: '' },
  solicitationTemplate: { type: String, default: '' },
  permissionMatrix: { type: mongoose.Schema.Types.Mixed, default: DEFAULT_MATRIX }
}, { strict: false });

const Settings = mongoose.model('Settings', settingsSchema);
module.exports = Settings;
module.exports.DEFAULT_MATRIX = DEFAULT_MATRIX;
