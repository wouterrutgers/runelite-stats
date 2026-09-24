<script setup>
import { date, duration } from '../utils/format.js'
defineProps({ records: { type: Array, required: true }, complete: Boolean })
</script>
<template>
  <p v-if="!complete" class="notice">
    PR history has not been fully collected yet. Activity statistics will appear after a successful
    historical backfill.
  </p>
  <p v-else-if="!records.length" class="empty-inline">No associated pull requests were found.</p>
  <ol v-else class="activity-list">
    <li v-for="record in records" :key="record.number">
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
          {{ record.author || 'Deleted account' }} · Opened {{ date(record.createdAt)
          }}<template v-if="record.mergedAt || record.closedAt">
            · {{ record.mergedAt ? 'Merged' : 'Closed' }}
            {{ date(record.mergedAt || record.closedAt) }} · Resolved in
            {{ duration(record.durationHours) }}</template
          >
        </p>
      </div>
    </li>
  </ol>
</template>
