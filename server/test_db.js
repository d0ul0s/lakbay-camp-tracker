const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lakbay-camp-tracker')
  .then(async () => {
    const Settings = require('./models/Settings');
    const s = await Settings.findOne().lean();
    console.log(JSON.stringify(s.permissionMatrix, null, 2));
    process.exit(0);
  });
