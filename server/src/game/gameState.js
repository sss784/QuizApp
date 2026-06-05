const gameState = {
  players: {},
  currentQuestionIndex: 0,
  isGameStarted: false,
  questionDurationSeconds: 20,
  currentQuestionDurationSeconds: 20,
  currentQuestionEndsAt: null,
  answeredPlayers: new Set()
};

function resetAttemptScores() {
  Object.values(gameState.players).forEach((player) => {
    player.attemptScore = 0;
  });
}

function resetQuizState() {
  gameState.currentQuestionIndex = 0;
  gameState.isGameStarted = false;
  gameState.currentQuestionDurationSeconds = gameState.questionDurationSeconds;
  gameState.currentQuestionEndsAt = null;
  gameState.answeredPlayers = new Set();
  resetAttemptScores();
}

function resetAnswersForQuestion() {
  gameState.answeredPlayers = new Set();
}

module.exports = {
  gameState,
  resetQuizState,
  resetAttemptScores,
  resetAnswersForQuestion
};
