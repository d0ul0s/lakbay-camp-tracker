const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const Settings = require('./models/Settings');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing users and settings
    await User.deleteMany({});
    await Settings.deleteMany({});

    // Create Admin user
    const admin = new User({
      church: 'Admin HQ',
      pin: '1234',
      role: 'admin'
    });
    await admin.save();
    console.log('Admin user seeded (PIN: 1234)');

    // Create a Coordinator
    const coord = new User({
      church: 'Lighthouse Church',
      pin: '5678',
      role: 'coordinator'
    });
    await coord.save();
    console.log('Coordinator user seeded (PIN: 5678)');

    // Update settings with church list
    const initialSettings = new Settings({
      churchList: ['Lighthouse Church', 'Victory Chapel', 'Grace Bible', 'Faith Tabernacle'],
      merchCosts: {
        tshirt: 250,
        bag: 150,
        notebook: 50,
        pen: 20
      }
    });
    await initialSettings.save();
    console.log('Initial settings seeded');

    console.log('Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedData();
