<template>
  <section class="admin-section">
    <button
      v-if="!isGameStarted && !isOpen"
      class="secondary-button admin-toggle"
      type="button"
      @click="openPanel"
    >
      ⚙ Админ
    </button>

    <div v-if="isOpen" class="admin-overlay" @click="closePanel">
      <aside class="admin-drawer" @click.stop>
        <div class="panel-title-row">
          <div>
            <p class="eyebrow">Админ</p>
            <h2>Панель управления</h2>
          </div>
          <button class="secondary-button compact-button close-button" type="button" @click="closePanel">
            ×
          </button>
        </div>

        <form v-if="!isLoggedIn" class="admin-login" @submit.prevent="checkAdminCode">
          <label class="field">
            <span>Admin-код</span>
            <input v-model="adminCode" type="password" placeholder="Введите код" />
          </label>
          <button class="primary-button" type="submit">Войти</button>
          <p v-if="errorMessage" class="admin-error">{{ errorMessage }}</p>
        </form>

        <div v-else class="admin-content">
          <div class="admin-block">
            <p class="admin-label">Время на вопрос</p>
            <div class="duration-buttons">
              <button
                v-for="duration in durations"
                :key="duration"
                class="secondary-button compact-button"
                :class="{ active: duration === currentDuration }"
                type="button"
                @click="$emit('update-duration', duration)"
              >
                {{ duration }} сек.
              </button>
            </div>
          </div>

          <div class="admin-actions">
            <button class="secondary-button" type="button" @click="$emit('restart-game')">
              Перезапустить викторину
            </button>
            <button class="secondary-button leave-button" type="button" @click="$emit('clear-leaderboard')">
              Очистить leaderboard
            </button>
            <button class="primary-button" type="button" @click="$emit('refresh-stats')">
              Обновить статистику
            </button>
          </div>

          <div class="admin-stats">
            <div>
              <span>Активные игроки</span>
              <strong>{{ stats.activePlayersCount }}</strong>
            </div>
            <div>
              <span>Текущий вопрос</span>
              <strong>{{ stats.currentQuestionNumber }}</strong>
            </div>
            <div>
              <span>Игра идёт</span>
              <strong>{{ stats.isGameStarted ? 'Да' : 'Нет' }}</strong>
            </div>
            <div>
              <span>Время</span>
              <strong>{{ currentDuration }} сек.</strong>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<script>
const ADMIN_CODE = '123';

export default {
  props: {
    currentDuration: {
      type: Number,
      default: 20
    },
    stats: {
      type: Object,
      default: () => ({
        activePlayersCount: 0,
        currentQuestionNumber: 0,
        isGameStarted: false
      })
    },
    isGameStarted: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update-duration', 'clear-leaderboard', 'restart-game', 'refresh-stats'],
  data() {
    return {
      isOpen: false,
      isLoggedIn: false,
      adminCode: '',
      errorMessage: '',
      durations: [10, 15, 20, 30]
    };
  },
  watch: {
    isGameStarted(value) {
      if (value) {
        this.closePanel();
      }
    }
  },
  methods: {
    openPanel() {
      this.isOpen = true;

      if (this.isLoggedIn) {
        this.$emit('refresh-stats');
      }
    },
    closePanel() {
      this.isOpen = false;
    },
    resetAdminState() {
      this.isOpen = false;
      this.isLoggedIn = false;
      this.adminCode = '';
      this.errorMessage = '';
    },
    checkAdminCode() {
      if (this.adminCode === ADMIN_CODE) {
        this.isLoggedIn = true;
        this.errorMessage = '';
        this.$emit('refresh-stats');
        return;
      }

      this.errorMessage = 'Неверный admin-код';
    }
  }
};
</script>
