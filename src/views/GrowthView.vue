<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataset } from '../composables/useDataset.js'
import { date } from '../utils/format.js'
import DataState from '../components/DataState.vue'
import PluginTable from '../components/PluginTable.vue'
import DateRanges from '../components/DateRanges.vue'
const { data, error, loading, reload } = useDataset()
const route = useRoute()
const router = useRouter()
const periods = ['24h', '7d', '30d', '180d', '1y']
const tabs = [
  { key: 'biggest', label: 'Biggest growth' },
  { key: 'fastest', label: 'Fastest growing' },
  { key: 'decline', label: 'Biggest decline' },
  { key: 'new', label: 'New & rising' },
]
function changeRanking(values) {
  return router.replace({
    query: { ...route.query, ...values, page: undefined, sort: undefined, order: undefined },
  })
}
const period = computed({
  get: () => (periods.includes(route.query.period) ? route.query.period : '7d'),
  set: (value) => changeRanking({ period: value === '7d' ? undefined : value }),
})
const ranking = computed({
  get: () =>
    tabs.some((tab) => tab.key === route.query.ranking) ? route.query.ranking : 'biggest',
  set: (value) => changeRanking({ ranking: value === 'biggest' ? undefined : value }),
})
const ranked = computed(() => {
  if (!data.value) return []
  const plugins = new Map(data.value[0].map((plugin) => [plugin.internalName, plugin]))
  return data.value[1].periods[period.value][ranking.value].map((identifier) =>
    plugins.get(identifier),
  )
})
const comparisonAvailable = computed(
  () =>
    ranking.value === 'new' ||
    data.value?.[0].some((plugin) => plugin.growth[period.value].comparedAt),
)
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
            v-if="ranking !== 'new'"
            v-model="period"
            :options="periods"
            label="Comparison period"
          />
        </div>
        <section class="panel table-panel">
          <PluginTable
            v-if="comparisonAvailable"
            :plugins="ranked"
            :period="ranking === 'new' ? '' : period"
            default-sort="rank"
          />
          <div v-else class="data-state" role="status">
            <h2>Not enough install history</h2>
            <p>
              This comparison is not available yet. Install history starts
              {{ date(data[1].historyStartedAt) }}. Choose a shorter period.
            </p>
          </div>
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
            Comparisons use the last valid observation at or before the selected time, allowing up
            to five minutes of variation in collection timing. A new plugin or a zero baseline is
            labelled New. Older plugins without a historical baseline remain unranked until enough
            history exists.
          </p>
          <p>
            New &amp; rising shows plugins published in the last
            {{ data[1].thresholds.newDays }} days with at least
            {{ data[1].thresholds.newInstalls }} installs, ranked by current installs.
          </p>
        </section></template
      ></DataState
    >
  </div>
</template>
