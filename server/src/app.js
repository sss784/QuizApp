const express = require('express');
const cors = require('cors');

const app = express();

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: frontendUrl
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Victorina backend is running'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok'
  });
});

module.exports = app;
