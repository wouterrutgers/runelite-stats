<script setup>
import { computed, ref, watch, useId } from 'vue'
import { number, date } from '../utils/format.js'
import GrowthValue from './GrowthValue.vue'
const props = defineProps({
  plugins: { type: Array, required: true },
  period: { type: String, default: '' },
  defaultSort: { type: String, default: 'installs' },
})
const identifier = useId()
const search = ref('')
const sort = ref(props.defaultSort)
const descending = ref(true)
const page = ref(1)
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
  { key: 'high', label: 'Observed high' },
  ...(props.period
    ? [
        { key: props.period, label: `${props.period} change` },
        { key: 'percentage', label: `${props.period} growth` },
        { key: 'comparison', label: 'Baseline installs' },
      ]
    : ['24h', '7d', '30d'].map((period) => ({ key: period, label: `${period} change` }))),
  { key: 'createdAt', label: 'Released' },
  { key: 'lastUpdatedAt', label: 'Updated' },
])
function value(plugin, key) {
  if (key === 'name') return plugin.displayName.toLocaleLowerCase()
  if (key === 'high') return plugin.high?.count ?? null
  if (key === 'percentage' || key === 'comparison') return plugin.growth[props.period][key]
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
const visible = computed(() =>
  matching.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)
watch([search, sort, descending, () => props.plugins], () => {
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
    <div class="table-scroll" tabindex="0" role="region" aria-label="Plugin statistics table">
      <table class="plugin-table">
        <caption class="sr-only">
          Plugin installs, growth and publication dates. Select a column heading to sort.
        </caption>
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
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
            <td class="plugin-cell">
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
                  ><small>{{ plugin.author || plugin.internalName }}</small>
                  <p>{{ plugin.description }}</p>
                </div>
              </div>
            </td>
            <td class="numeric">{{ number(plugin.installs) }}</td>
            <td class="numeric">{{ number(plugin.high?.count) }}</td>
            <template v-if="period"
              ><td><GrowthValue :growth="plugin.growth[period]" /></td>
              <td><GrowthValue :growth="plugin.growth[period]" percent /></td>
              <td class="numeric">{{ number(plugin.growth[period].comparison) }}</td></template
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
        <button :disabled="page === 1" @click="page--">Previous</button
        ><button :disabled="page === pages" @click="page++">Next</button>
      </div>
    </div>
  </div>
</template>
