<template>
  <form class="panel nickname-form" @submit.prevent="submitNickname">
    <div>
      <p class="eyebrow">Вход в игру</p>
      <h1>Викторина</h1>
      <p class="muted">Введите ник, чтобы подключиться к общей викторине.</p>
    </div>

    <label class="field">
      <span>Nickname</span>
      <input
        v-model="nickname"
        type="text"
        maxlength="20"
        placeholder="Например: student01"
      />
    </label>

    <button class="primary-button" type="submit">Подключиться</button>
  </form>
</template>

<script>
export default {
  emits: ['join'],
  data() {
    return {
      nickname: ''
    };
  },
  methods: {
    submitNickname() {
      this.$emit('join', this.nickname);
    }
  }
};
</script>
