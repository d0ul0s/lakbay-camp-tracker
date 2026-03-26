const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  churchList: { type: [String], default: [] },
  merchCosts: { type: mongoose.Schema.Types.Mixed, default: {} },
  ministries: { type: [String], default: ["Praise & Worship", "Children's Ministry", "Media/Tech", "Ushering"] },
  expenseCategories: { type: [String], default: ['Food', 'Venue', 'Supplies', 'Transportation', 'Others'] },
  paymentMethods: { type: [String], default: ['Cash (In-person)', 'GCash', 'Maya', 'Bank Transfer', 'Check'] },
  solicitationTypes: { type: [String], default: ["Individual", "Church Pledge", "Fundraising"] },
  shirtSizePhoto: { type: String, default: null }
});

module.exports = mongoose.model('Settings', settingsSchema);
