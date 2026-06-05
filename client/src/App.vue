<template>
  <main class="app-shell">
    <NicknameForm v-if="screen === 'login'" @join="joinGame" />

    <template v-else>
      <header class="topbar">
        <div>
          <p class="eyebrow">Игрок</p>
          <h1>{{ nickname }}</h1>
        </div>
        <div class="topbar-actions">
          <RestartButton @restart="restartGame" />
          <button class="secondary-button leave-button" type="button" @click="leaveGame">
            Выйти
          </button>
        </div>
      </header>

      <p v-if="errorMessage" class="message error-message">{{ errorMessage }}</p>
      <p v-if="infoMessage" class="message info-message">{{ infoMessage }}</p>

      <div class="layout">
        <section class="main-column">
          <section v-if="screen === 'waiting'" class="panel waiting-panel">
            <p class="eyebrow">Ожидание</p>
            <h2>Вы подключены к викторине</h2>
            <p class="muted">Когда все игроки готовы, нажмите кнопку старта.</p>
            <button class="primary-button" type="button" @click="startGame">
              Начать игру
            </button>
          </section>

          <QuizQuestion
            v-if="screen === 'question' && currentQuestion"
            :question="currentQuestion"
            :answer-result="answerResult"
            :is-answered="isAnswered"
            :time-left="timeLeft"
            @answer="submitAnswer"
          />

          <section v-if="screen === 'gameOver'" class="panel finish-panel">
            <p class="eyebrow">Финиш</p>
            <h2>Викторина завершена</h2>
            <p class="muted">Посмотрите итоговую таблицу и начните новую игру, если нужно.</p>
            <RestartButton @restart="restartGame" />
          </section>
        </section>

        <Leaderboard :items="leaderboard" :is-final="screen === 'gameOver'" />
      </div>
    </template>

    <AdminPanel
      ref="adminPanel"
      :current-duration="questionDurationSeconds"
      :stats="adminStats"
      :is-game-started="screen === 'question'"
      @update-duration="updateQuestionDuration"
      @clear-leaderboard="clearLeaderboard"
      @restart-game="restartGame"
      @refresh-stats="refreshAdminStats"
    />
  </main>
</template>

<script>
import socket from './socket/socket';
import NicknameForm from './components/NicknameForm.vue';
import QuizQuestion from './components/QuizQuestion.vue';
import Leaderboard from './components/Leaderboard.vue';
import RestartButton from './components/RestartButton.vue';
import AdminPanel from './components/AdminPanel.vue';

export default {
  components: {
    NicknameForm,
    QuizQuestion,
    Leaderboard,
    RestartButton,
    AdminPanel
  },
  data() {
    return {
      screen: 'login',
      playerId: '',
      nickname: '',
      currentQuestion: null,
      answerResult: null,
      isAnswered: false,
      timeLeft: 0,
      timerInterval: null,
      questionDurationSeconds: 20,
      adminStats: {
        activePlayersCount: 0,
        currentQuestionNumber: 0,
        isGameStarted: false
      },
      leaderboard: [],
      errorMessage: '',
      infoMessage: ''
    };
  },
  mounted() {
    socket.on('joinedGame', (player) => {
      this.playerId = player.playerId;
      this.nickname = player.nickname;
      this.screen = 'waiting';
      this.infoMessage = 'Вы подключились к игре.';
      this.errorMessage = '';
    });

    socket.on('gameStarted', () => {
      this.screen = 'question';
      this.infoMessage = 'Игра началась.';
      this.answerResult = null;
      this.isAnswered = false;
    });

    socket.on('newQuestion', (question) => {
      this.currentQuestion = question;
      this.questionDurationSeconds = question.durationSeconds;
      this.screen = 'question';
      this.answerResult = null;
      this.isAnswered = false;
      this.startQuestionTimer(question.endsAt);
      this.infoMessage = '';
      this.errorMessage = '';
    });

    socket.on('answerResult', (result) => {
      this.answerResult = result;
      this.isAnswered = true;
    });

    socket.on('leaderboardUpdated', (leaderboard) => {
      this.leaderboard = leaderboard;
    });

    socket.on('gameOver', (leaderboard) => {
      this.leaderboard = leaderboard;
      this.screen = 'gameOver';
      this.currentQuestion = null;
      this.answerResult = null;
      this.isAnswered = false;
      this.stopQuestionTimer();
      this.infoMessage = 'Игра завершена.';
    });

    socket.on('gameRestarted', () => {
      this.screen = this.nickname ? 'waiting' : 'login';
      this.currentQuestion = null;
      this.answerResult = null;
      this.isAnswered = false;
      this.stopQuestionTimer();
      this.errorMessage = '';
      this.infoMessage = this.nickname ? 'Викторина сброшена. Рейтинг сохранён.' : '';
    });

    socket.on('gameError', (message) => {
      this.errorMessage = message;
    });

    socket.on('settingsUpdated', (settings) => {
      this.questionDurationSeconds = settings.questionDurationSeconds;
      this.infoMessage = `Время на вопрос: ${settings.questionDurationSeconds} сек.`;
    });

    socket.on('adminStats', (stats) => {
      this.adminStats = stats;
      this.questionDurationSeconds = stats.questionDurationSeconds;
    });
  },
  beforeUnmount() {
    socket.off('joinedGame');
    socket.off('gameStarted');
    socket.off('newQuestion');
    socket.off('answerResult');
    socket.off('leaderboardUpdated');
    socket.off('gameOver');
    socket.off('gameRestarted');
    socket.off('gameError');
    socket.off('settingsUpdated');
    socket.off('adminStats');
    this.stopQuestionTimer();
  },
  methods: {
    joinGame(nickname) {
      const trimmedNickname = nickname.trim();

      if (!trimmedNickname) {
        this.errorMessage = 'Введите nickname';
        return;
      }

      const emitJoinGame = () => {
        socket.emit('joinGame', trimmedNickname);
      };

      if (socket.connected) {
        emitJoinGame();
        return;
      }

      socket.connect();
      socket.once('connect', emitJoinGame);
    },
    startGame() {
      socket.emit('startGame');
    },
    submitAnswer(answer) {
      if (this.isAnswered || this.timeLeft <= 0) {
        return;
      }

      this.isAnswered = true;
      socket.emit('submitAnswer', answer);
    },
    restartGame() {
      this.emitWhenConnected('restartGame');
    },
    updateQuestionDuration(durationSeconds) {
      this.emitWhenConnected('updateQuestionDuration', durationSeconds);
    },
    clearLeaderboard() {
      this.emitWhenConnected('clearLeaderboard');
    },
    refreshAdminStats() {
      this.emitWhenConnected('getAdminStats');
    },
    emitWhenConnected(eventName, payload) {
      const emitEvent = () => {
        socket.emit(eventName, payload);
      };

      if (socket.connected) {
        emitEvent();
        return;
      }

      socket.connect();
      socket.once('connect', emitEvent);
    },
    leaveGame() {
      socket.disconnect();
      this.resetAdminPanel();
      this.resetLocalState();
    },
    resetAdminPanel() {
      if (this.$refs.adminPanel) {
        this.$refs.adminPanel.resetAdminState();
      }
    },
    startQuestionTimer(endsAt) {
      this.stopQuestionTimer();
      this.updateTimeLeft(endsAt);

      this.timerInterval = setInterval(() => {
        this.updateTimeLeft(endsAt);
      }, 1000);
    },
    updateTimeLeft(endsAt) {
      const millisecondsLeft = Number(endsAt) - Date.now();
      this.timeLeft = Math.max(0, Math.ceil(millisecondsLeft / 1000));

      if (this.timeLeft === 0) {
        this.stopQuestionTimer();
      }
    },
    stopQuestionTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    },
    resetLocalState() {
      this.stopQuestionTimer();
      this.screen = 'login';
      this.playerId = '';
      this.nickname = '';
      this.currentQuestion = null;
      this.answerResult = null;
      this.isAnswered = false;
      this.timeLeft = 0;
      this.leaderboard = [];
      this.errorMessage = '';
      this.infoMessage = '';
    }
  }
};
</script>
