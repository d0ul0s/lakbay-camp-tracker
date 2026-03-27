const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

const Settings = mongoose.models.Settings || mongoose.model('Settings', new mongoose.Schema({}, { strict: false }));

async function checkSettings() {
  try {
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri);
    const count = await Settings.countDocuments();
    console.log('Total Settings Documents:', count);
    const all = await Settings.find();
    console.log('All Settings IDs:', all.map(s => s._id));
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSettings();
