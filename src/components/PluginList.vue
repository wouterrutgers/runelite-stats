<script setup>
import { number, date } from '../utils/format.js'
import GrowthValue from './GrowthValue.vue'
defineProps({
  plugins: { type: Array, required: true },
  metric: { type: String, default: 'installs' },
  period: { type: String, default: '7d' },
  showDate: Boolean,
  emptyMessage: {
    type: String,
    default: 'No plugins in this ranking yet. Growth needs a recorded comparison count.',
  },
})
</script>

<template>
  <ol v-if="plugins.length" class="plugin-list">
    <li v-for="(plugin, position) in plugins" :key="plugin.internalName">
      <span class="rank">{{ position + 1 }}</span>
      <span class="plugin-list-name">
        <RouterLink :to="`/plugin/${plugin.internalName}`">{{ plugin.displayName }}</RouterLink>
        <small
          >{{ plugin.author || plugin.internalName
          }}<template v-if="showDate"> · Added {{ date(plugin.createdAt) }}</template></small
        >
      </span>
      <strong v-if="metric === 'installs'" class="numeric"
        >{{ number(plugin.installs) }}<small>installs</small></strong
      >
      <GrowthValue v-else :growth="plugin.growth[period]" :percent="metric === 'percentage'" />
    </li>
  </ol>
  <div v-else class="ranking-empty">
    <p>{{ emptyMessage }}</p>
    <RouterLink to="/about">How growth is calculated</RouterLink>
  </div>
</template>
