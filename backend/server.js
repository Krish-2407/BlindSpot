require('dotenv').config();
const express = require('express');
const cors = require('cors');
const agent1Router = require('./routes/agent1');
const agent2Router = require('./routes/agent2');
const agent3Router = require('./routes/agent3');
const agent4Router = require('./routes/agent4');

const app = express();
const PORT = process.env.PORT || 3000;

// Apply middlewares
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(...process.env.FRONTEND_URL.split(',').map(url => url.trim()));
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || !process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Mount routers
app.use('/api/agent1', agent1Router);
app.use('/api/agent2', agent2Router);
app.use('/api/agent3', agent3Router);
app.use('/api/agent4', agent4Router);


// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Run server listen within try/catch block
try {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server successfully started on port ${PORT}`);
  });
} catch (error) {
  console.error('Error occurred while starting the Express server:', error);
  process.exit(1);
}

// Keep-alive ping to prevent Render free tier spindown
const RENDER_URL = process.env.RENDER_EXTERNAL_URL
if (RENDER_URL) {
  setInterval(async () => {
    try {
      await fetch(`${RENDER_URL}/health`)
      console.log('Keep-alive ping sent')
    } catch (error) {
      console.log('Keep-alive ping failed:', error.message)
    }
  }, 14 * 60 * 1000) // ping every 14 minutes
}
