<script setup>
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDataset } from '../composables/useDataset.js'
import { number, date } from '../utils/format.js'
import DataState from '../components/DataState.vue'
import MetricCard from '../components/MetricCard.vue'
import GrowthValue from '../components/GrowthValue.vue'
import PluginTable from '../components/PluginTable.vue'
import ActivityList from '../components/ActivityList.vue'
const route = useRoute()
const { data, error, loading, reload } = useDataset(
  () => `developer/${encodeURIComponent(route.params.slug)}.json`,
)
watch(data, (developer) => {
  if (developer) document.title = `${developer.name} · RuneLite Hub Stats`
})
</script>
<template>
  <div class="page">
    <RouterLink class="breadcrumb" to="/developers">← All developers</RouterLink
    ><DataState :loading="loading" :error="error" @retry="reload"
      ><template v-if="data"
        ><header class="page-heading">
          <h1>{{ data.name }}</h1>
          <p>
            First publication {{ date(data.firstPublishedAt) }} · Latest update
            {{ date(data.lastUpdatedAt) }}
          </p>
        </header>
        <section class="metrics-grid three">
          <MetricCard
            label="Combined active installs"
            :value="number(data.installs)"
            accent
          /><MetricCard label="Credited plugins" :value="number(data.pluginCount)" /><MetricCard
            label="Merged plugin updates"
            :value="data.githubComplete ? number(data.mergedUpdates) : 'Not available'"
          />
        </section>
        <div class="growth-strip">
          <div v-for="period in ['7d', '30d']" :key="period">
            <h2>{{ period }} combined change</h2>
            <GrowthValue :growth="data.growth[period]" both />
            <p class="panel-note">
              {{ data.growth[period].measuredPlugins }} of {{ data.pluginCount }} plugins have a
              comparison baseline.
            </p>
          </div>
        </div>
        <section class="panel table-panel">
          <div class="section-heading inset">
            <h2>Plugins by {{ data.name }}</h2>
          </div>
          <PluginTable :plugins="data.plugins" />
        </section>
        <section class="panel detail-bottom">
          <div class="section-heading">
            <div>
              <h2>Recent Hub activity</h2>
            </div>
          </div>
          <p class="panel-note">
            Associated PRs may be opened by any contributor. Author credits do not imply GitHub
            account ownership.
          </p>
          <ActivityList
            :records="data.recent"
            :complete="data.githubComplete"
          /></section></template
    ></DataState>
  </div>
</template>
