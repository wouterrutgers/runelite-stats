<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDataset } from '../composables/useDataset.js'
import { number, date, timestamp, withinRange } from '../utils/format.js'
import DataState from '../components/DataState.vue'
import MetricCard from '../components/MetricCard.vue'
import GrowthValue from '../components/GrowthValue.vue'
import DateRanges from '../components/DateRanges.vue'
import TimeChart from '../components/TimeChart.vue'
import ActivityList from '../components/ActivityList.vue'
const route = useRoute()
const { data, error, loading, reload } = useDataset(
  () => `plugin/${encodeURIComponent(route.params.internalName)}.json`,
)
const range = ref('30d')
watch(data, (plugin) => {
  if (plugin) document.title = `${plugin.displayName} · RuneLite Hub Stats`
})
const history = computed(() => {
  if (!data.value) return []
  const rows = range.value === '48h' ? data.value.history.recent : data.value.history.daily
  return withinRange(rows, range.value, data.value.syncedAt)
})
const markers = computed(
  () =>
    data.value?.development.recent.filter(
      (record) => record.mergedAt && ['updated', 'added', 'renamed'].includes(record.changeType),
    ) || [],
)
</script>
<template>
  <div class="page">
    <RouterLink class="breadcrumb" to="/plugins">← Plugin directory</RouterLink
    ><DataState :loading="loading" :error="error" @retry="reload"
      ><template v-if="data"
        ><header class="plugin-heading">
          <div>
            <p class="record-label">{{ data.internalName }}</p>
            <h1>{{ data.displayName }}</h1>
            <p class="author-links">
              By
              <template v-for="(author, index) in data.authors" :key="author.slug"
                ><span v-if="index">, </span
                ><RouterLink :to="`/developer/${author.slug}`">{{
                  author.name
                }}</RouterLink></template
              ><span v-if="!data.authors.length">an unrecorded author</span>
            </p>
          </div>
          <span class="badge" :class="{ available: data.available }">{{
            data.disabled
              ? 'Disabled'
              : data.available
                ? 'Available'
                : data.current
                  ? 'Unavailable'
                  : 'Historical'
          }}</span>
        </header>
        <p class="plugin-description">{{ data.description }}</p>
        <div class="tag-list">
          <span v-for="tag in data.tags" :key="tag">{{ tag }}</span>
        </div>
        <div class="link-row">
          <a
            class="button"
            :href="`https://runelite.net/plugin-hub/show/${data.internalName}`"
            target="_blank"
            rel="noreferrer"
            >View on Plugin Hub ↗</a
          ><a
            v-if="data.repository"
            class="button"
            :href="data.repository"
            target="_blank"
            rel="noreferrer"
            >Source repository ↗</a
          ><span>Released {{ date(data.createdAt) }} · Updated {{ date(data.lastUpdatedAt) }}</span>
        </div>
        <p v-if="data.warning || data.unavailableReason" class="notice">
          {{ data.unavailableReason || data.warning }}
        </p>
        <section class="metrics-grid two">
          <MetricCard
            label="Current active installs"
            :value="number(data.installs)"
            :note="`Observed ${timestamp(data.syncedAt)}`"
            accent
          /><MetricCard
            label="All time observed high"
            :value="number(data.high?.count)"
            :note="
              data.high
                ? `Recorded ${timestamp(data.high.timestamp)}`
                : 'No install observations yet'
            "
          />
        </section>
        <section class="growth-strip" aria-label="Install growth">
          <div v-for="period in ['24h', '7d', '30d', '180d', '1y']" :key="period">
            <h2>{{ period }} change</h2>
            <GrowthValue :growth="data.growth[period]" both />
          </div>
        </section>
        <section class="panel">
          <div class="section-heading">
            <div>
              <h2>Install history</h2>
            </div>
            <DateRanges v-model="range" :options="['48h', '7d', '30d', '6m', '1y', 'All']" />
          </div>
          <TimeChart
            :rows="history"
            :series="[{ key: 'count', label: 'Active installs' }]"
            :markers="markers"
            :label="`${data.displayName} install history`"
          />
          <p class="panel-note">
            {{
              range === '48h'
                ? 'Observations every six hours.'
                : 'First successful observation of each UTC day.'
            }}
            Gold markers show recent merged changes listed below. Missing observations are not zero
            installs.
          </p>
        </section>
        <div class="dashboard-grid detail-bottom">
          <section class="panel">
            <div class="section-heading">
              <div>
                <h2>Development activity</h2>
              </div>
              <span class="badge">Latest 30 PRs</span>
            </div>
            <p class="panel-note">
              Activity omits unmerged pull requests with zero or multiple changed files.
            </p>
            <ActivityList :records="data.development.recent" :complete="data.githubComplete" />
          </section>
          <aside class="panel metadata-panel">
            <h2>Plugin record</h2>
            <dl>
              <dt>First addition PR</dt>
              <dd>
                {{
                  data.githubComplete ? date(data.development.firstAddedAt) : 'Awaiting collection'
                }}
              </dd>
              <dt>Latest merged change</dt>
              <dd>
                {{
                  data.githubComplete ? date(data.development.lastUpdatedAt) : 'Awaiting collection'
                }}
              </dd>
              <dt>Merged updates</dt>
              <dd>
                {{
                  data.githubComplete
                    ? number(data.development.mergedUpdates)
                    : 'Awaiting collection'
                }}
              </dd>
              <dt>Updates in 90 days</dt>
              <dd>
                {{
                  data.githubComplete ? number(data.development.updates90d) : 'Awaiting collection'
                }}
              </dd>
              <dt>Latest version</dt>
              <dd>{{ data.version || 'Not recorded' }}</dd>
              <dt>Original author credit</dt>
              <dd>{{ data.author || 'Not recorded' }}</dd>
            </dl>
            <template v-if="data.development.aliases.length"
              ><h3>Known renames</h3>
              <p v-for="alias in data.development.aliases" :key="alias.number">
                <RouterLink :to="`/plugin/${alias.from}`">{{ alias.from }}</RouterLink> →
                <RouterLink :to="`/plugin/${alias.to}`">{{ alias.to }}</RouterLink>
              </p>
              <p class="panel-note">Each ID keeps its own install history.</p></template
            >
          </aside>
        </div>
      </template></DataState
    >
  </div>
</template>
