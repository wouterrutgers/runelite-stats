<script setup>
defineProps({
  modelValue: { type: String, required: true },
  options: { type: Array, required: true },
  label: { type: String, default: 'Time range' },
})
defineEmits(['update:modelValue'])
</script>
<template>
  <div class="range-control" role="group" :aria-label="label">
    <button
      v-for="option in options"
      :key="option"
      :class="{ selected: modelValue === option }"
      :aria-pressed="modelValue === option"
      @click="$emit('update:modelValue', option)"
    >
      {{ option }}
    </button>
  </div>
</template>
