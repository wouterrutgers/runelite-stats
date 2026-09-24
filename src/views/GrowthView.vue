<script setup>
import { ref, computed } from 'vue'
import { useDataset } from '../composables/useDataset.js'
import DataState from '../components/DataState.vue'
import PluginTable from '../components/PluginTable.vue'
import DateRanges from '../components/DateRanges.vue'
const { data, error, loading, reload } = useDataset(['plugins.json', 'growth.json'])
const period = ref('7d')
const ranking = ref('biggest')
const tabs = [
  { key: 'biggest', label: 'Biggest growth' },
  { key: 'fastest', label: 'Fastest growing' },
  { key: 'decline', label: 'Biggest decline' },
  { key: 'new', label: 'New & rising' },
]
const ranked = computed(() => {
  if (!data.value) return []
  const plugins = new Map(data.value[0].map((plugin) => [plugin.internalName, plugin]))
  return data.value[1].periods[period.value][ranking.value].map((identifier) =>
    plugins.get(identifier),
  )
})
</script>
<template>
  <div class="page">
    <header class="page-heading">
      <h1>Growth rankings</h1>
      <p>Compare install gains and losses over time.</p>
    </header>
    <DataState :loading="loading" :error="error" @retry="reload"
      ><template v-if="data"
        ><div class="ranking-controls">
          <div class="tab-control" role="group" aria-label="Growth ranking">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              :aria-pressed="ranking === tab.key"
              :class="{ selected: ranking === tab.key }"
              @click="ranking = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>
          <DateRanges
            v-model="period"
            :options="['24h', '7d', '30d', '180d', '1y']"
            label="Comparison period"
          />
        </div>
        <section class="panel table-panel">
          <PluginTable
            :key="`${period}-${ranking}`"
            :plugins="ranked"
            :period="period"
            default-sort="rank"
            :filters="false"
          />
        </section>
        <section class="methodology">
          <h2>How these rankings work</h2>
          <p>
            Biggest growth and decline rank by the absolute change in active installs. Fastest
            growing ranks by percentage increase and requires at least
            {{ data[1].thresholds.percentageCurrent }} current installs and
            {{ data[1].thresholds.percentageBaseline }} baseline installs.
          </p>
          <p>
            Comparisons use the closest valid observation at or before the selected time. A new
            plugin or a zero baseline is labelled New. Older plugins without a historical baseline
            remain unranked until enough history exists.
          </p>
          <p>
            New &amp; rising shows plugins published in the last
            {{ data[1].thresholds.newDays }} days with at least
            {{ data[1].thresholds.newInstalls }} installs, ranked by current installs. That
            publication window stays fixed when changing the comparison period.
          </p>
        </section></template
      ></DataState
    >
  </div>
</template>
