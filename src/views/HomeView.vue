<script setup>
import { ref, computed } from 'vue'
import { useDataset } from '../composables/useDataset.js'
import { number, date, timestamp, duration, withinRange } from '../utils/format.js'
import DataState from '../components/DataState.vue'
import MetricCard from '../components/MetricCard.vue'
import PluginList from '../components/PluginList.vue'
import TimeChart from '../components/TimeChart.vue'
import DateRanges from '../components/DateRanges.vue'
const { data, error, loading, reload } = useDataset('summary.json')
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
        <p>RuneLite Plugin Hub popularity, growth and review statistics</p>
      </div>
      <p v-if="data" class="collection-time">
        Updated {{ timestamp(data.syncedAt) }}
        <span>RuneLite {{ data.version }} · Collected every 6 hours</span>
      </p>
    </header>
    <DataState :loading="loading" :error="error" @retry="reload">
      <template v-if="data">
        <section class="metrics-grid six" aria-label="Plugin Hub totals">
          <MetricCard
            label="Active installs"
            :value="number(data.totalInstalls)"
            note="Total across plugins"
            accent
          />
          <MetricCard
            label="Current plugins"
            :value="number(data.pluginCount)"
            :note="`${number(data.developerCount)} credited authors`"
          />
          <MetricCard
            label="Install change · 7d"
            :value="
              data.growth7d === null
                ? 'Not available'
                : `${data.growth7d > 0 ? '+' : ''}${number(data.growth7d)}`
            "
            note="Since the comparison snapshot"
          />
          <MetricCard
            label="Plugins added · 30d"
            :value="number(data.hub.added30d)"
            note="From merged pull requests"
          />
          <MetricCard
            label="PRs merged · last week"
            :value="number(data.hub.mergedLastWeek)"
            :note="
              data.hub.lastCompleteWeek
                ? `Week of ${date(data.hub.lastCompleteWeek)}`
                : 'History not collected yet'
            "
          />
          <MetricCard
            label="Median resolution"
            :value="duration(data.hub.medianHours)"
            note="PR opening to merge or closure"
          />
        </section>
        <p v-if="data.growth7d === null" class="history-note">
          Install history starts {{ date(data.historyStartedAt) }}. A 7d comparison is not available
          yet.
          <RouterLink to="/about">About the data</RouterLink>
        </p>

        <div class="dashboard-grid overview-rankings">
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

        <div class="dashboard-grid detail-bottom">
          <section class="panel">
            <div class="section-heading">
              <h2>Total active installs</h2>
              <DateRanges v-model="range" :options="['7d', '30d', '6m', '1y', 'All']" />
            </div>
            <TimeChart
              :rows="trend"
              :series="[{ key: 'total', label: 'Active installs' }]"
              label="Total active Plugin Hub installs"
            />
            <p class="panel-note">
              Each plugin is counted separately. One player can have several plugins installed.
            </p>
          </section>
          <section class="panel">
            <div class="section-heading">
              <h2>Pull requests</h2>
              <RouterLink class="text-link" to="/hub">Hub activity</RouterLink>
            </div>
            <TimeChart
              :rows="data.weekly"
              :series="[
                { key: 'merged', label: 'Merged' },
                { key: 'backlog', label: 'Open backlog' },
              ]"
              date-key="date"
              label="Plugin Hub merged PRs and open backlog"
              compact
            />
            <p class="panel-note">Last 12 complete weeks.</p>
          </section>
        </div>

        <div class="two-grid detail-bottom">
          <section class="panel">
            <div class="section-heading">
              <h2>Biggest growth <span class="subtle-label">7d</span></h2>
              <RouterLink class="text-link" to="/growth">All growth rankings</RouterLink>
            </div>
            <PluginList :plugins="data.biggest" metric="growth" />
          </section>
          <section class="panel">
            <div class="section-heading">
              <h2>Fastest growing <span class="subtle-label">7d</span></h2>
              <span class="section-note">By percentage gain</span>
            </div>
            <PluginList :plugins="data.fastest" metric="percentage" />
          </section>
        </div>
      </template>
    </DataState>
  </div>
</template>
