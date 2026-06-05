<template>
  <section class="panel question-panel">
    <div class="question-header">
      <p class="eyebrow">Вопрос {{ question.questionNumber }} из {{ question.totalQuestions }}</p>
      <div class="question-meta">
        <span class="timer-pill" :class="{ warning: timeLeft <= 5 }">
          Осталось: {{ timeLeft }} сек.
        </span>
        <span class="status-pill" v-if="isAnswered">Ответ принят</span>
      </div>
    </div>

    <h2>{{ question.text }}</h2>

    <div class="answers">
      <button
        v-for="option in question.options"
        :key="option"
        class="answer-button"
        type="button"
        :disabled="isAnswered || timeLeft <= 0"
        @click="$emit('answer', option)"
      >
        {{ option }}
      </button>
    </div>

    <div v-if="answerResult" class="answer-result" :class="{ correct: answerResult.isCorrect }">
      <div class="result-title">
        <span class="result-icon" aria-hidden="true">
          {{ answerResult.isCorrect ? '✓' : '✕' }}
        </span>
        <strong>{{ resultText }}</strong>
      </div>
      <span v-if="!answerResult.isCorrect && answerResult.correctAnswer">
        Правильный ответ: {{ answerResult.correctAnswer }}
      </span>
    </div>
  </section>
</template>

<script>
export default {
  props: {
    question: {
      type: Object,
      required: true
    },
    answerResult: {
      type: Object,
      default: null
    },
    isAnswered: {
      type: Boolean,
      default: false
    },
    timeLeft: {
      type: Number,
      default: 0
    }
  },
  emits: ['answer'],
  computed: {
    resultText() {
      if (this.answerResult && this.answerResult.isTimeout) {
        return 'Время вышло';
      }

      return this.answerResult && this.answerResult.isCorrect ? 'Правильно' : 'Неправильно';
    }
  }
};
</script>
