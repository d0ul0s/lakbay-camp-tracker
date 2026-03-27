const mongoose = require('mongoose');
const path = require('path');
// Use the exact same path for .env as index.js
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

const settingsSchema = new mongoose.Schema({
  churchList: { type: [String], default: [] },
  merchCosts: { type: mongoose.Schema.Types.Mixed, default: {} },
  ministries: { type: [String], default: [] },
  expenseCategories: { type: [String], default: [] },
  paymentMethods: { type: [String], default: [] },
  solicitationTypes: { type: [String], default: [] },
  shirtSizePhoto: { type: String, default: null },
  permissionMatrix: { type: mongoose.Schema.Types.Mixed, default: {} }
});

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);

async function checkSettings() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('MONGO_URI not found in .env');
        process.exit(1);
    }
    await mongoose.connect(uri);
    const settings = await Settings.findOne();
    console.log('--- SETTINGS IN DB ---');
    console.log(JSON.stringify(settings, null, 2));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSettings();
