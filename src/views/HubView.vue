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
  data.value ? withinRange(data.value[1], range.value, data.value[0].syncedAt, 'date') : [],
)
const backlog = computed(() =>
  data.value ? withinRange(data.value[2], range.value, data.value[0].syncedAt, 'date') : [],
)
const latency = computed(() =>
  data.value ? withinRange(data.value[3], range.value, data.value[0].syncedAt, 'date') : [],
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
          <span>GitHub history · {{ timestamp(data[0].syncedAt) }}</span
          ><span>runelite/plugin-hub</span>
        </div>
        <p v-if="!data[0].complete" class="notice">
          The full GitHub history has not been collected yet. PR metrics stay unavailable until the
          backfill completes.
        </p>
        <section class="metrics-grid four">
          <MetricCard
            label="PRs merged · last week"
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
          /><MetricCard
            label="Total merged PRs"
            :value="number(data[0].totalMerged)"
            note="All repository pull requests"
          /><MetricCard
            label="Median resolution time"
            :value="duration(data[0].medianHours)"
            :note="`90th percentile: ${duration(data[0].p90Hours)}`"
          />
        </section>
        <div class="section-heading page-section-heading">
          <div>
            <h2>Weekly activity</h2>
            <p class="panel-note">
              Complete UTC weeks, starting Monday. Current partial week excluded.
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
                { key: 'merged', label: 'Merged' },
                { key: 'closed', label: 'Closed without merge' },
              ]"
              date-key="date"
              label="Weekly Plugin Hub PR activity"
            />
          </section>
          <section class="panel">
            <div class="section-heading">
              <h3>Open backlog</h3>
              <span class="badge">{{ number(data[0].backlog) }} open now</span>
            </div>
            <TimeChart
              :rows="backlog"
              :series="[{ key: 'backlog', label: 'Open PRs', color: '#d1b476' }]"
              date-key="date"
              label="Open pull requests at each week end"
            />
          </section>
          <section class="panel">
            <div class="section-heading"><h3>Plugins added &amp; removed</h3></div>
            <TimeChart
              :rows="weekly"
              :series="[
                { key: 'added', label: 'Added' },
                { key: 'removed', label: 'Removed', color: '#df8f7e' },
              ]"
              date-key="date"
              label="Weekly plugin additions and removals"
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
              date-key="date"
              unit="hours"
              label="Time from PR opening to merge or closure"
            />
            <p class="panel-note">
              Elapsed time until resolution, including author revisions and waiting. This is not
              time to first review.
            </p>
          </section>
        </div>
        <section class="panel detail-bottom">
          <div class="section-heading">
            <h3>Plugin count over time</h3>
            <span class="badge">Inferred from merged PRs</span>
          </div>
          <TimeChart
            :rows="weekly"
            :series="[{ key: 'active', label: 'Plugin pointers' }]"
            date-key="date"
            label="Historical Plugin Hub pointer count"
            compact
          />
          <p class="panel-note">
            Membership is reconstructed from additions and deletions, anchored to the current
            repository. Direct commits and disabled history cannot be fully inferred from PRs.
          </p>
        </section>
        <div class="two-grid detail-bottom">
          <section class="panel">
            <div class="section-heading">
              <div>
                <h2>Most updated <span class="subtle-label">90d</span></h2>
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
                <h2>Top contributors <span class="subtle-label">All time</span></h2>
              </div>
            </div>
            <ol v-if="data[4].length" class="maintenance-list">
              <li v-for="author in data[4].slice(0, 15)" :key="author.login">
                <a :href="`https://github.com/${author.login}`" target="_blank" rel="noreferrer"
                  >{{ author.login }} ↗</a
                ><strong
                  >{{ number(author.merged) }}
                  <small>merged · {{ number(author.opened) }} opened</small></strong
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
