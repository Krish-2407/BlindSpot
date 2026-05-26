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
app.use(cors());
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
  app.listen(PORT, () => {
    console.log(`Server successfully started on port ${PORT}`);
  });
} catch (error) {
  console.error('Error occurred while starting the Express server:', error);
  process.exit(1);
}
