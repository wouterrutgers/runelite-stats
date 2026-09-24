<script setup>
import { number, percentage, timestamp } from '../utils/format.js'
defineProps({ growth: { type: Object, default: null }, percent: Boolean, both: Boolean })
</script>
<template>
  <span
    v-if="growth?.status === 'new'"
    class="growth new"
    title="New plugin or no positive baseline"
    >New</span
  >
  <span
    v-else-if="growth?.change !== null && growth?.change !== undefined"
    class="growth"
    :class="{ positive: growth.change > 0, negative: growth.change < 0 }"
    :title="growth.comparedAt ? `Compared with ${timestamp(growth.comparedAt)}` : undefined"
  >
    <span v-if="percent">{{ percentage(growth.percentage) }}</span
    ><span v-else>{{ growth.change > 0 ? '+' : '' }}{{ number(growth.change) }}</span
    ><small v-if="both && growth.percentage !== null">{{ percentage(growth.percentage) }}</small>
  </span>
  <span v-else class="muted no-baseline" title="A historical baseline is not available yet"
    >No baseline</span
  >
</template>
