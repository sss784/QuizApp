const questions = require('../data/questions');
const {
  gameState,
  resetQuizState,
  resetAttemptScores,
  resetAnswersForQuestion
} = require('../game/gameState');
const { getPointsForAnswer } = require('../game/scoring');
const {
  addPlayerToLeaderboard,
  saveBestScore,
  getLeaderboard,
  clearLeaderboard
} = require('../redis/redisClient');

const ALLOWED_QUESTION_DURATIONS = [10, 15, 20, 30];
const RESULT_DELAY_MS = 1500;

let isMovingToNextQuestion = false;
let gameVersion = 0;
let questionTimer = null;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getPublicQuestion() {
  const question = questions[gameState.currentQuestionIndex];

  if (!question) {
    return null;
  }

  // Клиенту отправляем вопрос без правильного ответа.
  return {
    id: question.id,
    text: question.text,
    options: question.options,
    questionNumber: gameState.currentQuestionIndex + 1,
    totalQuestions: questions.length,
    durationSeconds: gameState.currentQuestionDurationSeconds,
    endsAt: gameState.currentQuestionEndsAt
  };
}

function getActivePlayersCount() {
  return Object.keys(gameState.players).length;
}

function getAdminStats() {
  return {
    activePlayersCount: getActivePlayersCount(),
    currentQuestionNumber: gameState.isGameStarted ? gameState.currentQuestionIndex + 1 : 0,
    isGameStarted: gameState.isGameStarted,
    questionDurationSeconds: gameState.questionDurationSeconds
  };
}

async function sendLeaderboard(io) {
  const leaderboard = await getLeaderboard();
  io.emit('leaderboardUpdated', leaderboard);
  return leaderboard;
}

function sendCurrentQuestion(io) {
  const publicQuestion = getPublicQuestion();

  if (publicQuestion) {
    io.emit('newQuestion', publicQuestion);
  }
}

function clearQuestionTimer() {
  if (questionTimer) {
    clearTimeout(questionTimer);
    questionTimer = null;
  }
}

function startQuestion(io) {
  clearQuestionTimer();
  gameState.currentQuestionDurationSeconds = gameState.questionDurationSeconds;
  gameState.currentQuestionEndsAt = Date.now() + gameState.currentQuestionDurationSeconds * 1000;

  const versionAtStart = gameVersion;

  questionTimer = setTimeout(() => {
    handleQuestionTimeout(io, versionAtStart);
  }, gameState.currentQuestionDurationSeconds * 1000);

  sendCurrentQuestion(io);
}

async function finishGame(io) {
  clearQuestionTimer();
  gameState.isGameStarted = false;
  gameState.currentQuestionEndsAt = null;
  const leaderboard = await getLeaderboard();

  io.emit('gameOver', leaderboard);
}

function sendTimeoutResults(io) {
  const question = questions[gameState.currentQuestionIndex];

  if (!question) {
    return;
  }

  Object.values(gameState.players).forEach((player) => {
    if (gameState.answeredPlayers.has(player.id)) {
      return;
    }

    gameState.answeredPlayers.add(player.id);

    io.to(player.id).emit('answerResult', {
      isCorrect: false,
      isTimeout: true,
      points: 0,
      attemptScore: player.attemptScore,
      correctAnswer: question.correctAnswer
    });
  });
}

async function handleQuestionTimeout(io, versionAtStart) {
  if (versionAtStart !== gameVersion || isMovingToNextQuestion || !gameState.isGameStarted) {
    return;
  }

  questionTimer = null;
  gameState.currentQuestionEndsAt = Date.now();
  sendTimeoutResults(io);
  await sendLeaderboard(io);
  await goToNextQuestionOrFinish(io);
}

async function goToNextQuestionOrFinish(io) {
  const versionAtStart = gameVersion;

  isMovingToNextQuestion = true;
  clearQuestionTimer();
  await wait(RESULT_DELAY_MS);

  if (versionAtStart !== gameVersion) {
    isMovingToNextQuestion = false;
    return;
  }

  gameState.currentQuestionIndex += 1;
  resetAnswersForQuestion();

  if (gameState.currentQuestionIndex >= questions.length) {
    await finishGame(io);
    isMovingToNextQuestion = false;
    return;
  }

  startQuestion(io);
  isMovingToNextQuestion = false;
}

async function checkQuestionIsFinished(io) {
  if (isMovingToNextQuestion) {
    return;
  }

  const activePlayersCount = getActivePlayersCount();

  if (activePlayersCount === 0) {
    return;
  }

  // Переходим дальше только когда все активные игроки ответили.
  if (gameState.answeredPlayers.size >= activePlayersCount) {
    await goToNextQuestionOrFinish(io);
  }
}

function registerQuizSocket(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('joinGame', async (nickname) => {
      const trimmedNickname = String(nickname || '').trim();

      if (!trimmedNickname) {
        socket.emit('gameError', 'Введите nickname');
        return;
      }

      gameState.players[socket.id] = {
        id: socket.id,
        nickname: trimmedNickname,
        attemptScore: 0
      };

      await addPlayerToLeaderboard(trimmedNickname);

      socket.emit('joinedGame', {
        playerId: socket.id,
        nickname: trimmedNickname
      });

      await sendLeaderboard(io);

      if (gameState.isGameStarted && !isMovingToNextQuestion) {
        sendCurrentQuestion(io);
      }
    });

    socket.on('startGame', () => {
      if (getActivePlayersCount() === 0) {
        socket.emit('gameError', 'Нельзя начать игру без игроков');
        return;
      }

      gameVersion += 1;
      isMovingToNextQuestion = false;
      clearQuestionTimer();
      gameState.isGameStarted = true;
      gameState.currentQuestionIndex = 0;
      resetAttemptScores();
      resetAnswersForQuestion();

      io.emit('gameStarted');
      startQuestion(io);
    });

    socket.on('submitAnswer', async (answer) => {
      const player = gameState.players[socket.id];

      if (!player) {
        socket.emit('gameError', 'Сначала подключитесь к игре');
        return;
      }

      if (!gameState.isGameStarted) {
        socket.emit('gameError', 'Игра еще не началась');
        return;
      }

      if (isMovingToNextQuestion) {
        socket.emit('gameError', 'Вопрос уже завершён');
        return;
      }

      if (gameState.answeredPlayers.has(socket.id)) {
        socket.emit('gameError', 'Вы уже ответили на этот вопрос');
        return;
      }

      if (gameState.currentQuestionEndsAt && Date.now() >= gameState.currentQuestionEndsAt) {
        await handleQuestionTimeout(io, gameVersion);
        return;
      }

      const question = questions[gameState.currentQuestionIndex];

      if (!question) {
        return;
      }

      const points = getPointsForAnswer(question, answer);

      gameState.answeredPlayers.add(socket.id);
      player.attemptScore += points;
      await saveBestScore(player.nickname, player.attemptScore);

      socket.emit('answerResult', {
        isCorrect: points === 1,
        points,
        attemptScore: player.attemptScore,
        correctAnswer: question.correctAnswer
      });

      await sendLeaderboard(io);
      await checkQuestionIsFinished(io);
    });

    socket.on('restartGame', async () => {
      gameVersion += 1;
      isMovingToNextQuestion = false;
      clearQuestionTimer();
      resetQuizState();

      io.emit('gameRestarted');
      await sendLeaderboard(io);
    });

    socket.on('updateQuestionDuration', (durationSeconds) => {
      const nextDuration = Number(durationSeconds);

      if (!ALLOWED_QUESTION_DURATIONS.includes(nextDuration)) {
        socket.emit('gameError', 'Недопустимое время вопроса');
        return;
      }

      gameState.questionDurationSeconds = nextDuration;

      io.emit('settingsUpdated', {
        questionDurationSeconds: gameState.questionDurationSeconds
      });
    });

    socket.on('clearLeaderboard', async () => {
      await clearLeaderboard();
      await sendLeaderboard(io);
    });

    socket.on('getAdminStats', () => {
      socket.emit('adminStats', getAdminStats());
    });

    socket.on('disconnect', async () => {
      delete gameState.players[socket.id];
      gameState.answeredPlayers.delete(socket.id);

      console.log('Socket disconnected:', socket.id);

      if (getActivePlayersCount() === 0) {
        gameVersion += 1;
        isMovingToNextQuestion = false;
        clearQuestionTimer();
        resetQuizState();
        return;
      }

      await checkQuestionIsFinished(io);
    });
  });
}

module.exports = registerQuizSocket;
