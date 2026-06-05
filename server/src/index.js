require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const registerQuizSocket = require('./sockets/quizSocket');
const { connectRedis } = require('./redis/redisClient');

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST']
  }
});

registerQuizSocket(io);

async function startServer() {
  try {
    await connectRedis();

    httpServer.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
