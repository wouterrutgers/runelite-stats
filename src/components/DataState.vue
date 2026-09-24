<script setup>
defineProps({
  loading: Boolean,
  error: { type: String, default: null },
})
defineEmits(['retry'])
</script>
<template>
  <div v-if="loading" class="data-state" role="status" aria-live="polite">
    <p>Loading statistics…</p>
  </div>
  <div v-else-if="error" class="data-state error" role="alert">
    <h2>Could not load the data</h2>
    <p>{{ error }}</p>
    <button class="button" @click="$emit('retry')">Try again</button>
  </div>
  <slot v-else />
</template>
