import { createApp, nextTick } from 'vue'
import { createWebHistory, loadRouteLocation } from 'vue-router'
import './style.css'
import App from './App.vue'
import { createSiteRouter } from './router/index.js'
import { loadDataset } from './composables/useDataset.js'
import { datasetsForPath } from './datasets.js'
import { updatePageMetadata } from './seo.js'

const base = import.meta.env.BASE_URL
const prefetches = new Map()
const router = createSiteRouter(createWebHistory(base), async function (to, from, savedPosition) {
  if (savedPosition) {
    await prefetchRoute(to)
    await nextTick()
    return savedPosition
  }
  return to.path === from.path ? false : { top: 0 }
})

function prefetchRoute(location) {
  const route = router.resolve(location)
  if (!prefetches.has(route.path)) {
    prefetches.set(
      route.path,
      Promise.all([
        loadRouteLocation(route),
        ...datasetsForPath(route.path).map(loadDataset),
      ]).catch(function (error) {
        prefetches.delete(route.path)
        console.warn('Could not preload the page.', error)
      }),
    )
  }
  return prefetches.get(route.path)
}

const root = document.querySelector('#app')
router.beforeEach(function (to) {
  prefetchRoute(to)
})
router.afterEach(function (to, from, failure) {
  if (failure) return
  if (from.matched.length ? to.path !== from.path : !root.hasChildNodes()) updatePageMetadata(to)
})

const app = createApp(App).use(router)
async function mountApp() {
  await router.isReady()
  // Keep the prerendered page visible while its interactive data loads.
  if (root.hasChildNodes()) await prefetchRoute(router.currentRoute.value)
  app.mount(root)
}
mountApp()

function prefetchLink(event) {
  const link = event.target.closest('a[href]')
  if (
    !link ||
    link.origin === 'null' ||
    link.origin !== location.origin ||
    !link.pathname.startsWith(base) ||
    link.hash
  )
    return
  prefetchRoute(link.pathname.slice(base.length - 1))
}
for (const event of ['pointerover', 'focusin', 'pointerdown']) {
  document.addEventListener(event, prefetchLink)
}
