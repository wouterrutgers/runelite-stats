<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  note: { type: String, default: '' },
  accent: Boolean,
})
</script>
<template>
  <article class="metric-card" :class="{ accent }">
    <h2>{{ label }}</h2>
    <p class="metric-value" :class="{ pending: value === 'Not available' }">{{ value }}</p>
    <p v-if="note" class="metric-note">{{ note }}</p>
  </article>
</template>
