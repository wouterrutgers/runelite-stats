<script setup>
import { ref, computed } from 'vue'
import { useDataset } from '../composables/useDataset.js'
import { number, date, timestamp, duration, withinRange } from '../utils/format.js'
import DataState from '../components/DataState.vue'
import MetricCard from '../components/MetricCard.vue'
import TimeChart from '../components/TimeChart.vue'
import DateRanges from '../components/DateRanges.vue'
import PluginTable from '../components/PluginTable.vue'
const { data, error, loading, reload } = useDataset([
  'hub/summary.json',
  'hub/weekly.json',
  'hub/backlog.json',
  'hub/latency.json',
  'hub/authors.json',
])
const range = ref('6m')
const weekly = computed(() =>
  data.value ? withinRange(data.value[1], range.value, data.value[0].syncedAt, 'weekEndedAt') : [],
)
const backlog = computed(() =>
  data.value ? withinRange(data.value[2], range.value, data.value[0].syncedAt, 'weekEndedAt') : [],
)
const latency = computed(() =>
  data.value ? withinRange(data.value[3], range.value, data.value[0].syncedAt, 'weekEndedAt') : [],
)
</script>
<template>
  <div class="page">
    <header class="page-heading">
      <h1>Plugin Hub activity</h1>
      <p>Pull requests, the open queue and resolution times for runelite/plugin-hub.</p>
    </header>
    <DataState :loading="loading" :error="error" @retry="reload"
      ><template v-if="data"
        ><div class="data-strip">
          <span>Last updated from GitHub on {{ timestamp(data[0].syncedAt) }}</span
          ><span>runelite/plugin-hub</span>
        </div>
        <p v-if="!data[0].complete" class="notice">
          The full GitHub history has not been collected yet. PR metrics stay unavailable until the
          backfill completes.
        </p>
        <section class="metrics-grid four">
          <MetricCard
            label="PRs merged last week"
            :value="number(data[0].mergedLastWeek)"
            :note="
              data[0].lastCompleteWeek
                ? `Week of ${date(data[0].lastCompleteWeek)}`
                : 'History not collected yet'
            "
            accent
          /><MetricCard
            label="Active Hub plugins"
            :value="number(data[0].currentPlugins)"
            note="Excluding disabled plugins"
          /><MetricCard label="Total merged PRs" :value="number(data[0].totalMerged)" /><MetricCard
            label="Median resolution time"
            :value="duration(data[0].medianHours)"
            :note="`90th percentile: ${duration(data[0].p90Hours)}`"
          />
        </section>
        <div class="section-heading page-section-heading">
          <div>
            <h2>Weekly activity</h2>
            <p class="panel-note">
              Complete weeks from Monday to Sunday in UTC. The current week is excluded.
            </p>
          </div>
          <DateRanges v-model="range" :options="['1m', '3m', '6m', '1y', 'All']" />
        </div>
        <div class="two-grid">
          <section class="panel">
            <div class="section-heading"><h3>Pull request activity</h3></div>
            <TimeChart
              :rows="weekly"
              :series="[
                { key: 'opened', label: 'Opened' },
                { key: 'merged', label: 'merged', color: '#78c69b' },
                { key: 'closed', label: 'closed without merge', color: '#ee8e96' },
              ]"
              date-key="weekEndedAt"
              label="Weekly Plugin Hub PR activity"
              hide-summary
            />
          </section>
          <section class="panel">
            <div class="section-heading">
              <h3>Open backlog</h3>
              <span class="badge">{{ number(data[0].backlog) }} open at last update</span>
            </div>
            <TimeChart
              :rows="backlog"
              :series="[{ key: 'backlog', label: 'Open PRs at week end' }]"
              date-key="weekEndedAt"
              label="Open pull requests at each week end"
              hide-summary
            />
          </section>
          <section class="panel">
            <div class="section-heading"><h3>Plugins added &amp; removed</h3></div>
            <TimeChart
              :rows="weekly"
              :series="[
                { key: 'added', label: 'Added', color: '#78c69b' },
                { key: 'removed', label: 'Removed', color: '#ee8e96' },
              ]"
              date-key="weekEndedAt"
              label="Weekly plugin additions and removals"
              hide-summary
            />
          </section>
          <section class="panel">
            <div class="section-heading"><h3>Resolution time</h3></div>
            <TimeChart
              :rows="latency"
              :series="[
                { key: 'medianHours', label: 'Median' },
                { key: 'p90Hours', label: '90th percentile' },
              ]"
              date-key="weekEndedAt"
              unit="hours"
              label="Time from PR opening to merge or closure"
              hide-summary
            />
          </section>
        </div>
        <section class="panel detail-bottom">
          <div class="section-heading">
            <h3>Total plugins over time</h3>
          </div>
          <TimeChart
            :rows="weekly"
            :series="[{ key: 'active', label: 'Plugins' }]"
            date-key="weekEndedAt"
            label="Total plugins over time"
            compact
            hide-summary
          />
        </section>
        <div class="two-grid detail-bottom">
          <section class="panel">
            <div class="section-heading">
              <div>
                <h2>Most updated plugins in the past 90 days</h2>
              </div>
            </div>
            <ol v-if="data[0].active.length" class="maintenance-list">
              <li v-for="plugin in data[0].active.slice(0, 15)" :key="plugin.internalName">
                <RouterLink :to="`/plugin/${plugin.internalName}`">{{
                  plugin.displayName
                }}</RouterLink
                ><strong>{{ number(plugin.activity.updates90d) }} <small>updates</small></strong>
              </li>
            </ol>
            <p v-else class="empty-inline">No update activity is available.</p>
          </section>
          <section class="panel">
            <div class="section-heading">
              <div>
                <h2>Top contributors of all time</h2>
              </div>
            </div>
            <ol v-if="data[4].length" class="maintenance-list">
              <li v-for="author in data[4].slice(0, 15)" :key="author.login">
                <a :href="`https://github.com/${author.login}`" target="_blank" rel="noreferrer"
                  >{{ author.login }} ↗</a
                ><strong
                  >{{ number(author.merged) }}
                  <small>merged and {{ number(author.opened) }} opened</small></strong
                >
              </li>
            </ol>
            <p v-else class="empty-inline">Contributor history is awaiting collection.</p>
          </section>
        </div>
        <details class="panel detail-bottom">
          <summary class="details-heading">
            Plugins without an update in 180 days
            <span class="badge">{{ number(data[0].stale.length) }}</span>
          </summary>
          <p class="panel-note">
            A stable plugin may need few updates. Age alone does not imply a problem or abandonment.
          </p>
          <PluginTable :plugins="data[0].stale" default-sort="rank" /></details></template
    ></DataState>
  </div>
</template>
