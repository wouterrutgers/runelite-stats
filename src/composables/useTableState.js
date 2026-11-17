import { computed, nextTick, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export function useTableState(defaultSort, sortKeys) {
  const route = useRoute()
  const router = useRouter()
  const table = ref(null)

  function updateQuery(values) {
    return router.replace({ query: { ...route.query, ...values } })
  }

  const search = computed({
    get: () => (typeof route.query.search === 'string' ? route.query.search : ''),
    set: (value) => updateQuery({ search: value || undefined, page: undefined }),
  })
  const sort = computed(() =>
    sortKeys().includes(route.query.sort) ? route.query.sort : defaultSort,
  )
  const descending = computed(() => route.query.order !== 'asc')
  const requestedPage = computed(() => {
    const value = Number(route.query.page)
    return Number.isSafeInteger(value) && value > 0 ? value : 1
  })

  function sortBy(key) {
    const descendingOrder = sort.value === key ? !descending.value : key !== 'name'
    return updateQuery({
      sort: key === defaultSort ? undefined : key,
      order: descendingOrder ? undefined : 'asc',
      page: undefined,
    })
  }

  async function changePage(value) {
    await updateQuery({ page: value > 1 ? String(value) : undefined })
    await nextTick()
    table.value.scrollIntoView({ block: 'start' })
    table.value.focus({ preventScroll: true })
  }

  return { search, sort, descending, requestedPage, table, sortBy, changePage }
}
