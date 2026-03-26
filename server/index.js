const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://lakbay-camp-tracker.vercel.app'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(mongoSanitize());

const auth = require('./middleware/auth');

app.use('/api/registrants', auth, require('./routes/registrants'));
app.use('/api/expenses', auth, require('./routes/expenses'));
app.use('/api/solicitations', auth, require('./routes/solicitations'));
app.use('/api/settings', auth, require('./routes/settings'));
app.use('/api/backup', auth, require('./routes/backup'));
app.use('/api/activity-logs', auth, require('./routes/activityLogs'));
app.use('/api/auth', require('./routes/auth'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
