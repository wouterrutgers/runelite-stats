<script setup>
import { computed, ref, watch, useId } from 'vue'
import { date, duration } from '../utils/format.js'
const props = defineProps({ records: { type: Array, required: true }, complete: Boolean })
const identifier = useId()
const expanded = ref(false)
const visible = computed(() => (expanded.value ? props.records : props.records.slice(0, 5)))
watch(
  () => props.records,
  () => {
    expanded.value = false
  },
)
</script>
<template>
  <p v-if="!complete" class="notice">
    PR history has not been fully collected yet. Activity statistics will appear after a successful
    historical backfill.
  </p>
  <p v-else-if="!records.length" class="empty-inline">No associated pull requests were found.</p>
  <ol v-else :id="identifier" class="activity-list">
    <li v-for="record in visible" :key="record.number">
      <span class="activity-dot" :class="record.state.toLowerCase()" aria-hidden="true"></span>
      <div class="activity-content">
        <div class="activity-title">
          <a
            :href="`https://github.com/runelite/plugin-hub/pull/${record.number}`"
            target="_blank"
            rel="noreferrer"
            >{{ record.title }} <span class="muted">#{{ record.number }}</span></a
          ><span class="badge" :class="record.state.toLowerCase()">{{
            record.state.toLowerCase()
          }}</span
          ><span class="badge">{{ record.changeType }}</span>
        </div>
        <p>
          Opened on {{ date(record.createdAt) }} by {{ record.author || 'a deleted account' }}.
          <template v-if="record.mergedAt || record.closedAt">
            {{ record.mergedAt ? 'Merged' : 'Closed' }} on
            {{ date(record.mergedAt || record.closedAt) }} after
            {{ duration(record.durationHours) }}.
          </template>
        </p>
      </div>
    </li>
  </ol>
  <button
    v-if="complete && records.length > 5"
    class="button activity-toggle"
    :aria-expanded="expanded"
    :aria-controls="identifier"
    @click="expanded = !expanded"
  >
    {{ expanded ? 'Show fewer changes' : `Show all ${records.length} changes` }}
  </button>
</template>
