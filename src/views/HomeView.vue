<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useDataset } from '../composables/useDataset.js'
import { number, date, relativeTime, withinRange } from '../utils/format.js'
import DataState from '../components/DataState.vue'
import MetricCard from '../components/MetricCard.vue'
import PluginList from '../components/PluginList.vue'
import TimeChart from '../components/TimeChart.vue'
import DateRanges from '../components/DateRanges.vue'
const { data, error, loading, reload } = useDataset()
const currentTime = ref(Date.now())
const nextUpdate = computed(function () {
  const next = new Date(currentTime.value)
  next.setUTCHours(Math.floor(next.getUTCHours() / 6) * 6, 0, 0, 0)
  if (next.getTime() <= currentTime.value) next.setUTCHours(next.getUTCHours() + 6)
  return next.toISOString()
})
let updateTimer
onMounted(function () {
  updateTimer = setInterval(function () {
    currentTime.value = Date.now()
  }, 60_000)
})
onBeforeUnmount(function () {
  clearInterval(updateTimer)
})
const range = ref('30d')
const trend = computed(() =>
  data.value ? withinRange(data.value.totalHistory, range.value, data.value.syncedAt) : [],
)
</script>

<template>
  <div class="page">
    <header class="page-heading overview-heading">
      <div>
        <h1>Plugin Hub statistics</h1>
        <p>Track RuneLite Plugin Hub popularity, new releases and install growth.</p>
      </div>
      <div v-if="data" class="collection-time">
        <p>Updated {{ relativeTime(data.syncedAt, currentTime) }}</p>
        <div class="next-update">
          Next update {{ relativeTime(nextUpdate, currentTime) }}
          <details
            class="update-info"
            @keydown.esc.stop.prevent="$event.currentTarget.open = false"
          >
            <summary aria-label="About scheduled updates">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.25" />
                <path
                  d="M8 7.25V11"
                  stroke="currentColor"
                  stroke-width="1.25"
                  stroke-linecap="round"
                />
                <circle cx="8" cy="4.75" r="0.75" fill="currentColor" />
              </svg>
            </summary>
            <p class="update-info-tooltip">Data refreshes at 00:00, 06:00, 12:00 and 18:00 UTC.</p>
          </details>
        </div>
      </div>
    </header>
    <DataState :loading="loading" :error="error" @retry="reload">
      <template v-if="data">
        <section class="metrics-grid four" aria-label="Plugin Hub totals">
          <MetricCard label="Active installs" :value="number(data.totalInstalls)" accent />
          <MetricCard label="Listed plugins" :value="number(data.pluginCount)" />
          <MetricCard
            label="7 day install change"
            :value="
              data.growth7d === null
                ? 'Not available'
                : `${data.growth7d > 0 ? '+' : ''}${number(data.growth7d)}`
            "
          />
          <MetricCard label="Plugins added in 30 days" :value="number(data.hub.added30d)" />
        </section>
        <p v-if="data.growth7d === null" class="history-note">
          Install history starts {{ date(data.historyStartedAt) }}. A 7d comparison is not available
          yet.
          <RouterLink to="/about">About the data</RouterLink>
        </p>

        <div class="dashboard-grid">
          <section class="panel">
            <div class="section-heading">
              <h2>Most installed</h2>
              <RouterLink class="text-link" to="/plugins">Plugin directory</RouterLink>
            </div>
            <PluginList :plugins="data.popular" />
          </section>
          <section class="panel">
            <div class="section-heading">
              <h2>New plugins</h2>
              <RouterLink class="text-link" to="/growth">Growth rankings</RouterLink>
            </div>
            <PluginList :plugins="data.newest" show-date />
          </section>
        </div>

        <div class="two-grid detail-bottom">
          <section class="panel">
            <div class="section-heading">
              <h2>Biggest growth in the past 7 days</h2>
              <RouterLink class="text-link" to="/growth">All growth rankings</RouterLink>
            </div>
            <PluginList :plugins="data.biggest" metric="growth" />
          </section>
          <section class="panel">
            <div class="section-heading">
              <h2>Fastest growing plugins in the past 7 days</h2>
              <span class="section-note">By percentage gain</span>
            </div>
            <PluginList :plugins="data.fastest" metric="percentage" />
          </section>
        </div>

        <section class="panel detail-bottom">
          <div class="section-heading">
            <h2>Total active installs</h2>
            <DateRanges v-model="range" :options="['7d', '30d', '6m', '1y', 'All']" />
          </div>
          <TimeChart
            :rows="trend"
            :series="[{ key: 'total', label: 'Active installs' }]"
            label="Total active Plugin Hub installs"
            hide-summary
          />
        </section>
      </template>
    </DataState>
  </div>
</template>
