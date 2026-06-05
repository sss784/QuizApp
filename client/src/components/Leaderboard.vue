<template>
  <section class="panel leaderboard-panel">
    <div class="panel-title-row">
      <div>
        <p class="eyebrow">{{ isFinal ? 'Итоги' : 'Рейтинг' }}</p>
        <h2>{{ isFinal ? 'Итоговая таблица' : 'Leaderboard' }}</h2>
      </div>
    </div>

    <div v-if="items.length === 0" class="empty-state">
      Пока нет игроков.
    </div>

    <ol v-else class="leaderboard-list">
      <li v-for="player in items" :key="player.id || player.nickname">
        <span class="place">{{ player.place }}</span>
        <span class="nickname">{{ player.nickname }}</span>
        <strong>{{ player.score }}</strong>
      </li>
    </ol>
  </section>
</template>

<script>
export default {
  props: {
    items: {
      type: Array,
      default: () => []
    },
    isFinal: {
      type: Boolean,
      default: false
    }
  }
};
</script>
