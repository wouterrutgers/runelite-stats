import { ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { datasetsForPath } from '../datasets.js'
const cache = new Map()
const requests = new Map()
const datasetHash = import.meta.env.DATASET_HASH
export function loadDataset(filename) {
  if (cache.has(filename)) return Promise.resolve(cache.get(filename))
  if (!requests.has(filename)) {
    requests.set(
      filename,
      fetch(`${import.meta.env.BASE_URL}data/${filename}?v=${datasetHash}`)
        .then(async (response) => {
          if (!response.ok)
            throw new Error(
              response.status === 404
                ? 'This dataset is not available. It may need to be collected or rebuilt.'
                : `The dataset could not be loaded (HTTP ${response.status}).`,
            )
          return response.json()
        })
        .then(function (value) {
          cache.set(filename, value)
          requests.delete(filename)
          return value
        })
        .catch((error) => {
          requests.delete(filename)
          throw error
        }),
    )
  }
  return requests.get(filename)
}
export function useDataset() {
  const route = useRoute()
  const data = shallowRef(null)
  const error = ref(null)
  const loading = ref(true)
  let request = 0
  async function reload() {
    const current = ++request
    error.value = null
    const paths = datasetsForPath(route.path)
    if (
      paths.every(function (filename) {
        return cache.has(filename)
      })
    ) {
      data.value =
        paths.length === 1
          ? cache.get(paths[0])
          : paths.map(function (filename) {
              return cache.get(filename)
            })
      loading.value = false
      return
    }
    loading.value = true
    data.value = null
    try {
      const values = await Promise.all(paths.map(loadDataset))
      if (current === request) data.value = paths.length === 1 ? values[0] : values
    } catch (failure) {
      if (current === request) error.value = failure.message
    } finally {
      if (current === request) loading.value = false
    }
  }
  watch(() => route.path, reload, { immediate: true })
  return { data, error, loading, reload }
}
