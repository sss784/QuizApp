<template>
  <button class="secondary-button" type="button" @click="$emit('restart')">
    Начать заново
  </button>
</template>

<script>
export default {
  emits: ['restart']
};
</script>
