import { createRouter, createWebHashHistory, loadRouteLocation } from 'vue-router'
import { loadDataset } from '../composables/useDataset.js'
import { datasetsForPath } from '../datasets.js'
const prefetches = new Map()
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    { path: '/', component: () => import('../views/HomeView.vue'), meta: { title: 'Overview' } },
    {
      path: '/plugins',
      component: () => import('../views/PluginsView.vue'),
      meta: { title: 'Plugins' },
    },
    {
      path: '/plugin/:internalName',
      component: () => import('../views/PluginView.vue'),
      meta: { title: 'Plugin' },
    },
    {
      path: '/growth',
      component: () => import('../views/GrowthView.vue'),
      meta: { title: 'Growth' },
    },
    {
      path: '/developers',
      component: () => import('../views/DevelopersView.vue'),
      meta: { title: 'Developers' },
    },
    {
      path: '/developer/:slug',
      component: () => import('../views/DeveloperView.vue'),
      meta: { title: 'Developer' },
    },
    {
      path: '/hub',
      component: () => import('../views/HubView.vue'),
      meta: { title: 'Hub activity' },
    },
    { path: '/about', component: () => import('../views/AboutView.vue'), meta: { title: 'About' } },
    {
      path: '/:pathMatch(.*)*',
      component: () => import('../views/NotFoundView.vue'),
      meta: { title: 'Page not found' },
    },
  ],
})
export function prefetchRoute(location) {
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
router.beforeEach(function (to) {
  prefetchRoute(to)
})
router.afterEach((to) => {
  document.title = `${to.meta.title} on RuneLite Hub Stats`
})
export default router
