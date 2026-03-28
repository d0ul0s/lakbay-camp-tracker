const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const https = require('https'); // For self-pings

const app = express();
const server = require('http').createServer(app);
const allowedOrigins = [
  'http://localhost:5173',
  'http://192.168.100.90:5173',
  'https://lakbay-camp-tracker.vercel.app',
  'https://lakbay-camp-tracker.onrender.com'
];

const originCheck = (origin, callback) => {
  // Allow if no origin (like mobile apps or curl) or if in allowed list
  if (!origin || allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  // Allow any local network IP (e.g., http://192.168.x.x:5173)
  if (origin.startsWith('http://192.168.') || origin.startsWith('http://10.') || origin.startsWith('http://172.')) {
    return callback(null, true);
  }
  callback(new Error('Not allowed by CORS'));
};

const io = require('socket.io')(server, {
  maxHttpBufferSize: 1e7, // 10MB limit
  pingInterval: 15000,   // Heartbeat every 15s
  pingTimeout: 5000,     // Timeout if 5s late
  cors: {
    origin: originCheck,
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Attach socket.io to req for use in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: originCheck,
  credentials: true
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:5000", "http://192.168.100.90:5000", ...allowedOrigins],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(mongoSanitize());

const auth = require('./middleware/auth');

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is awake and running smoothly.' });
});


app.use('/api/registrants', auth, require('./routes/registrants'));
app.use('/api/expenses', auth, require('./routes/expenses'));
app.use('/api/solicitations', auth, require('./routes/solicitations'));
app.use('/api/settings', auth, require('./routes/settings'));
app.use('/api/boot', auth, require('./routes/boot'));
app.use('/api/backup', auth, require('./routes/backup'));
app.use('/api/activity-logs', auth, require('./routes/activityLogs'));
app.use('/api/auth', require('./routes/auth'));

const connectDB = () => {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;
  mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
      console.log('MongoDB connected systematically.');
      if (!server.listening) {
        server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
      }
    })
    .catch(err => {
      console.error('MongoDB connection issue during init or retry:', err.message);
    });
};

mongoose.connection.on('disconnected', () => {
  console.error('MongoDB Atlas disconnected! Self-healing triggered. Reconnecting in 5s...');
  setTimeout(connectDB, 5000);
});

connectDB();

// Keep-Alive mechanism to prevent Render from sleeping on Free Tier (15 min inactivity)
// This hits the local health endpoint every 14 minutes.
setInterval(() => {
  https.get(`https://lakbay-camp-tracker.onrender.com/api/health`, (res) => {
    if (res.statusCode === 200) {
      console.log('Self-ping successful: Server heartbeat maintained.');
    } else {
      console.warn(`Self-ping partial: Status ${res.statusCode}`);
    }
  }).on('error', (err) => {
    console.error('Self-ping failed:', err.message);
  });
}, 840000); // 14 mins

