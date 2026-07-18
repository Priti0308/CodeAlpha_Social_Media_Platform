const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allows loading images from external sources/blobs easily in development
}));
app.use(cors());
app.use(mongoSanitize());
app.use(xss());

// Rate Limiter: 100 requests per 15 minutes max
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);

// Request parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded media files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route Definitions
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/follow', require('./routes/followRoutes'));
app.use('/api/stories', require('./routes/storyRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));

// Serve frontend static assets automatically (Unified Deployment Setup)
app.use(express.static(path.join(__dirname, '../frontend')));

// Basic route test
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'CodeAlpha Social API is running.' });
});

// Redirect non-API unmatched routes to 404.html
app.all('*', (req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: 'API route not found.' });
  }
  res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
});

// Centralized Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
