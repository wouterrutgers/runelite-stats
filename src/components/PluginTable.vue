<script setup>
import { computed, useId } from 'vue'
import { number, date } from '../utils/format.js'
import { useTableState } from '../composables/useTableState.js'
import GrowthValue from './GrowthValue.vue'
const props = defineProps({
  plugins: { type: Array, required: true },
  period: { type: String, default: '' },
  defaultSort: { type: String, default: 'installs' },
})
const identifier = useId()
const pageSize = 30
const searchable = computed(() =>
  props.plugins.map((plugin) => ({
    plugin,
    text: [
      plugin.displayName,
      plugin.internalName,
      plugin.author,
      plugin.description,
      ...plugin.tags,
    ]
      .join(' ')
      .toLocaleLowerCase(),
  })),
)
const columns = computed(() => [
  { key: 'name', label: 'Plugin' },
  { key: 'installs', label: 'Active installs' },
  ...(props.period
    ? [
        { key: props.period, label: `${props.period} change` },
        { key: 'percentage', label: `${props.period} growth` },
      ]
    : ['24h', '7d', '30d'].map((period) => ({ key: period, label: `${period} change` }))),
  { key: 'createdAt', label: 'Released' },
  { key: 'lastUpdatedAt', label: 'Updated' },
])
const { search, sort, descending, requestedPage, table, sortBy, changePage } = useTableState(
  props.defaultSort,
  () => columns.value.map((column) => column.key),
)
function value(plugin, key) {
  if (key === 'name') return plugin.displayName.toLocaleLowerCase()
  if (key === 'percentage') return plugin.growth[props.period].percentage
  if (plugin.growth[key]) return plugin.growth[key].change
  return plugin[key]
}
const matching = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  const plugins = searchable.value
    .filter(({ text }) => !query || text.includes(query))
    .map((row) => row.plugin)
  if (sort.value === 'rank') return plugins
  return plugins.sort((left, right) => {
    const first = value(left, sort.value)
    const second = value(right, sort.value)
    if (first === null || first === undefined)
      return second === null || second === undefined ? 0 : 1
    if (second === null || second === undefined) return -1
    return (
      (typeof first === 'string' ? first.localeCompare(second) : first - second) *
      (descending.value ? -1 : 1)
    )
  })
})
const pages = computed(() => Math.max(1, Math.ceil(matching.value.length / pageSize)))
const page = computed(() => Math.min(requestedPage.value, pages.value))
const visible = computed(() =>
  matching.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)
</script>

<template>
  <div class="directory">
    <div class="table-toolbar">
      <label class="search-field" :for="`${identifier}-search`"
        ><span aria-hidden="true">⌕</span
        ><input
          :id="`${identifier}-search`"
          v-model="search"
          type="search"
          placeholder="Search names, authors, tags…"
          aria-label="Search plugins"
      /></label>
      <span class="muted" aria-live="polite">{{ number(matching.length) }} plugins</span>
    </div>
    <p class="table-hint">Scroll the table to see all columns</p>
    <div
      ref="table"
      class="table-scroll"
      tabindex="0"
      role="region"
      aria-label="Plugin statistics table"
    >
      <table class="plugin-table">
        <caption class="sr-only">
          Plugin installs, growth and publication dates. Select a column heading to sort.
        </caption>
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              :aria-sort="sort === column.key ? (descending ? 'descending' : 'ascending') : 'none'"
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
          <tr v-for="plugin in visible" :key="plugin.internalName">
            <th scope="row" class="plugin-cell">
              <div class="plugin-cell-content">
                <span class="plugin-icon" aria-hidden="true">
                  <img
                    v-if="plugin.iconHash"
                    :src="`https://repo.runelite.net/plugins/icon/${plugin.internalName}_${plugin.iconHash}.png`"
                    alt=""
                    width="24"
                    height="24"
                    loading="lazy"
                  />
                </span>
                <div class="plugin-cell-details">
                  <RouterLink :to="`/plugin/${plugin.internalName}`">{{
                    plugin.displayName
                  }}</RouterLink
                  ><span v-if="plugin.disabled" class="badge">Disabled</span
                  ><span v-else-if="!plugin.current" class="badge">Historical</span
                  ><span v-else-if="!plugin.available" class="badge">Unavailable</span
                  ><small>{{ plugin.author || plugin.internalName }}</small>
                  <p>{{ plugin.description }}</p>
                </div>
              </div>
            </th>
            <td class="numeric">{{ number(plugin.installs) }}</td>
            <template v-if="period"
              ><td><GrowthValue :growth="plugin.growth[period]" /></td>
              <td><GrowthValue :growth="plugin.growth[period]" percent /></td></template
            ><template v-else
              ><td v-for="growthPeriod in ['24h', '7d', '30d']" :key="growthPeriod">
                <GrowthValue :growth="plugin.growth[growthPeriod]" /></td
            ></template>
            <td class="date-cell">{{ date(plugin.createdAt) }}</td>
            <td class="date-cell">{{ date(plugin.lastUpdatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!matching.length" class="empty-inline">
      No plugins match this view. Try another search or period.
    </p>
    <div class="pagination">
      <span>Page {{ page }} of {{ pages }}</span>
      <div>
        <button :disabled="page === 1" @click="changePage(page - 1)">Previous</button
        ><button :disabled="page === pages" @click="changePage(page + 1)">Next</button>
      </div>
    </div>
  </div>
</template>
