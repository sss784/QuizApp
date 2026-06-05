const { createClient } = require('redis');

const LEADERBOARD_KEY = 'victorina:leaderboard:best';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (error) => {
  console.error('Redis error:', error);
});

async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

async function addPlayerToLeaderboard(nickname) {
  const currentScore = await redisClient.zScore(LEADERBOARD_KEY, nickname);

  if (currentScore === null) {
    await redisClient.zAdd(LEADERBOARD_KEY, {
      score: 0,
      value: nickname
    });
  }
}

async function saveBestScore(nickname, attemptScore) {
  const currentScore = await redisClient.zScore(LEADERBOARD_KEY, nickname);

  if (currentScore === null || attemptScore > currentScore) {
    await redisClient.zAdd(LEADERBOARD_KEY, {
      score: attemptScore,
      value: nickname
    });
  }
}

async function getLeaderboard() {
  const items = await redisClient.zRangeWithScores(LEADERBOARD_KEY, 0, 4, {
    REV: true
  });

  return items.map((item, index) => ({
    id: item.value,
    place: index + 1,
    nickname: item.value,
    score: item.score
  }));
}

async function clearLeaderboard() {
  await redisClient.del(LEADERBOARD_KEY);
}

module.exports = {
  connectRedis,
  addPlayerToLeaderboard,
  saveBestScore,
  getLeaderboard,
  clearLeaderboard
};
