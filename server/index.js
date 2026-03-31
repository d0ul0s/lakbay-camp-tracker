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
  // Allow any Vercel or Render preview domains
  if (origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
    return callback(null, true);
  }
  // Allow any local network IP
  if (origin.startsWith('http://192.168.') || origin.startsWith('http://10.') || origin.startsWith('http://172.')) {
    return callback(null, true);
  }
  callback(new Error(`Not allowed by CORS: ${origin}`));
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

// Database status middleware
app.use((req, res, next) => {
  const readyState = mongoose.connection.readyState;
  if (req.path === '/api/health' || req.path.startsWith('/api/auth') || req.path === '/api/boot') {
    return next();
  }
  if (readyState !== 1) {
    return res.status(503).json({ 
      message: 'Database connection is still establishing. Please try again in a few seconds.', 
      status: readyState === 2 ? 'connecting' : 'disconnected' 
    });
  }
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
  const dbStatus = mongoose.connection.readyState;
  const dbLabels = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.status(dbStatus === 1 ? 200 : 503).json({ 
    status: dbStatus === 1 ? 'ok' : 'initializing',
    database: dbLabels[dbStatus] || 'unknown',
    message: dbStatus === 1 ? 'Server is active and connected.' : 'Server is awake, waiting for database connection.' 
  });
});


app.use('/api/registrants', auth, require('./routes/registrants'));
app.use('/api/expenses', auth, require('./routes/expenses'));
app.use('/api/solicitations', auth, require('./routes/solicitations'));
app.use('/api/settings', auth, require('./routes/settings'));
app.use('/api/boot', auth, require('./routes/boot'));
app.use('/api/backup', auth, require('./routes/backup'));
app.use('/api/activity-logs', auth, require('./routes/activityLogs'));
app.use('/api/org', require('./routes/org'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/tribe-proposals', auth, require('./routes/tribeProposals'));
app.use('/api/auth', require('./routes/auth'));

const connectDB = (attempt = 0) => {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;
  
  const options = {
    serverSelectionTimeoutMS: 30000,  // Give Atlas more time to respond
    socketTimeoutMS: 45000,
    heartbeatFrequencyMS: 30000,      // Reduced heartbeat frequency (easier on Atlas M0)
    maxPoolSize: 5,                   // CRITICAL: Limit connections — M0 free allows max 500 across ALL clients
    minPoolSize: 1,                   // Keep at least 1 warm connection
    retryWrites: true,
    retryReads: true,
  };

  mongoose.connect(process.env.MONGO_URI, options)
    .then(() => {
      console.log('MongoDB connected systematically.');
    })
    .catch(err => {
      console.error('MongoDB connection issue:', err.message);
      // Exponential backoff: 5s, 10s, 20s, then cap at 30s
      const delay = Math.min(5000 * Math.pow(2, attempt), 30000);
      console.log(`Retrying MongoDB connection in ${delay / 1000}s (attempt ${attempt + 1})...`);
      setTimeout(() => connectDB(attempt + 1), delay);
    });
};

mongoose.connection.on('disconnected', () => {
  console.error('MongoDB Atlas disconnected! Self-healing triggered. Reconnecting in 5s...');
  setTimeout(() => connectDB(0), 5000);
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
});

// Start listening immediately
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});

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

