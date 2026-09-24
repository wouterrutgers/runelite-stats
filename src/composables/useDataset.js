import { ref, toValue, watch } from 'vue'
const cache = new Map()
export async function loadDataset(filename) {
  if (!cache.has(filename)) {
    cache.set(
      filename,
      fetch(`${import.meta.env.BASE_URL}data/${filename}`)
        .then(async (response) => {
          if (!response.ok)
            throw new Error(
              response.status === 404
                ? 'This dataset is not available. It may need to be collected or rebuilt.'
                : `The dataset could not be loaded (HTTP ${response.status}).`,
            )
          return response.json()
        })
        .catch((error) => {
          cache.delete(filename)
          throw error
        }),
    )
  }
  return cache.get(filename)
}
export function useDataset(filenames) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(true)
  let request = 0
  async function reload() {
    const current = ++request
    loading.value = true
    error.value = null
    data.value = null
    const paths = toValue(filenames)
    try {
      const value = Array.isArray(paths)
        ? await Promise.all(paths.map(loadDataset))
        : await loadDataset(paths)
      if (current === request) data.value = value
    } catch (failure) {
      if (current === request) error.value = failure.message
    } finally {
      if (current === request) loading.value = false
    }
  }
  watch(() => toValue(filenames), reload, { immediate: true })
  return { data, error, loading, reload }
}
