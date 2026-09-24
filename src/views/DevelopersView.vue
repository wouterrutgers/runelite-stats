<script setup>
import { computed, ref, watch } from 'vue'
import { useDataset } from '../composables/useDataset.js'
import { number, date } from '../utils/format.js'
import DataState from '../components/DataState.vue'
import GrowthValue from '../components/GrowthValue.vue'
const { data, error, loading, reload } = useDataset('developers.json')
const search = ref('')
const sort = ref('installs')
const descending = ref(true)
const page = ref(1)
const columns = [
  { key: 'name', label: 'Developer' },
  { key: 'pluginCount', label: 'Plugins' },
  { key: 'installs', label: 'Active installs' },
  { key: '7d', label: '7d change' },
  { key: '30d', label: '30d change' },
  { key: 'firstPublishedAt', label: 'First publication' },
  { key: 'lastUpdatedAt', label: 'Latest update' },
]
const filtered = computed(() =>
  (data.value || [])
    .filter((developer) =>
      developer.name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()),
    )
    .sort((left, right) => {
      const first = left.growth[sort.value]?.change ?? left[sort.value]
      const second = right.growth[sort.value]?.change ?? right[sort.value]
      if (first === null || first === undefined)
        return second === null || second === undefined ? 0 : 1
      if (second === null || second === undefined) return -1
      return (
        (typeof first === 'string' ? first.localeCompare(second) : first - second) *
        (descending.value ? -1 : 1)
      )
    }),
)
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / 40)))
const visible = computed(() => filtered.value.slice((page.value - 1) * 40, page.value * 40))
watch([search, sort, descending], () => {
  page.value = 1
})
function sortBy(key) {
  if (sort.value === key) descending.value = !descending.value
  else {
    sort.value = key
    descending.value = key !== 'name'
  }
}
</script>
<template>
  <div class="page">
    <header class="page-heading">
      <h1>Developers</h1>
      <p>Plugin authors, ranked by combined active installs.</p>
    </header>
    <DataState :loading="loading" :error="error" @retry="reload"
      ><section v-if="data" class="panel table-panel">
        <div class="table-toolbar">
          <label class="search-field"
            ><span aria-hidden="true">⌕</span
            ><input
              v-model="search"
              type="search"
              placeholder="Find a developer…"
              aria-label="Search developers" /></label
          ><span class="muted">{{ number(filtered.length) }} developers</span>
        </div>
        <div class="table-scroll" tabindex="0" role="region" aria-label="Developer statistics">
          <table>
            <caption class="sr-only">
              Developers ranked by combined plugin installs
            </caption>
            <thead>
              <tr>
                <th
                  v-for="column in columns"
                  :key="column.key"
                  :aria-sort="
                    sort === column.key ? (descending ? 'descending' : 'ascending') : 'none'
                  "
                >
                  <button @click="sortBy(column.key)">
                    {{ column.label }}
                    <span aria-hidden="true">{{
                      sort === column.key ? (descending ? '↓' : '↑') : '↕'
                    }}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="developer in visible" :key="developer.slug">
                <th scope="row">
                  <RouterLink :to="`/developer/${developer.slug}`">{{ developer.name }}</RouterLink>
                </th>
                <td class="numeric">{{ number(developer.pluginCount) }}</td>
                <td class="numeric">{{ number(developer.installs) }}</td>
                <td><GrowthValue :growth="developer.growth['7d']" /></td>
                <td><GrowthValue :growth="developer.growth['30d']" /></td>
                <td class="date-cell">{{ date(developer.firstPublishedAt) }}</td>
                <td class="date-cell">{{ date(developer.lastUpdatedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="!filtered.length" class="empty-inline">No developers match that name.</p>
        <div class="pagination">
          <span>Page {{ page }} of {{ pages }}</span>
          <div>
            <button :disabled="page === 1" @click="page--">Previous</button
            ><button :disabled="page === pages" @click="page++">Next</button>
          </div>
        </div>
      </section></DataState
    >
    <p class="panel-note">
      Credits come from the RuneLite manifest. Shared plugins count once for each credited author,
      so developer totals should not be added together. Names are not verified GitHub identities.
    </p>
  </div>
</template>
