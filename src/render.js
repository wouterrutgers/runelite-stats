import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory } from 'vue-router'
import App from './App.vue'
import { datasetCache } from './composables/useDataset.js'
import { datasetsForPath } from './datasets.js'
import { createSiteRouter, routes } from './router/index.js'
import { pageMetadata } from './seo.js'

export { datasetsForPath, routes }

export async function renderPage(path, datasets) {
  const router = createSiteRouter(createMemoryHistory(import.meta.env.BASE_URL))
  const app = createSSRApp(App).provide(datasetCache, datasets).use(router)
  await router.push(path)
  await router.isReady()

  const route = router.currentRoute.value
  return {
    body: await renderToString(app),
    metadata: pageMetadata(route, datasets.values().next().value),
  }
}
