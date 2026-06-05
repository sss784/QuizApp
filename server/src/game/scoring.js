function isCorrectAnswer(question, answer) {
  return question.correctAnswer === answer;
}

function getPointsForAnswer(question, answer) {
  return isCorrectAnswer(question, answer) ? 1 : 0;
}

module.exports = {
  isCorrectAnswer,
  getPointsForAnswer
};
