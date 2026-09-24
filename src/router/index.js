import { createRouter, createWebHashHistory } from 'vue-router'
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
router.afterEach((to) => {
  document.title = `${to.meta.title} · RuneLite Hub Stats`
})
export default router
