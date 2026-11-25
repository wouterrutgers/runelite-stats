import { createRouter } from 'vue-router'

export const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: {
      title: 'RuneLite Plugin Hub Stats | Installs and growth',
      description:
        'Explore RuneLite Plugin Hub install counts, growth rankings, developer profiles and pull request statistics.',
    },
  },
  {
    path: '/plugins',
    name: 'plugins',
    component: () => import('../views/PluginsView.vue'),
    meta: {
      title: 'Plugin directory',
      description:
        'Browse current and historical RuneLite Plugin Hub plugins by active installs, install growth and release date.',
    },
  },
  {
    path: '/plugin/:internalName',
    name: 'plugin',
    component: () => import('../views/PluginView.vue'),
    meta: { title: 'Plugin statistics' },
  },
  {
    path: '/growth',
    name: 'growth',
    component: () => import('../views/GrowthView.vue'),
    meta: {
      title: 'Plugin growth rankings',
      description:
        'See which RuneLite Plugin Hub plugins are gaining or losing installs and which new releases are growing.',
    },
  },
  {
    path: '/developers',
    name: 'developers',
    component: () => import('../views/DevelopersView.vue'),
    meta: {
      title: 'Plugin developers',
      description:
        'Explore RuneLite Plugin Hub developers and compare their plugin counts, active installs and install growth.',
    },
  },
  {
    path: '/developer/:slug',
    name: 'developer',
    component: () => import('../views/DeveloperView.vue'),
    meta: { title: 'Developer statistics' },
  },
  {
    path: '/hub',
    name: 'hub',
    component: () => import('../views/HubView.vue'),
    meta: {
      title: 'Plugin Hub activity',
      description:
        'Track releases, plugin updates, open pull requests and review times for the RuneLite Plugin Hub.',
    },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
    meta: {
      title: 'About the data',
      description:
        'Learn where RuneLite Plugin Hub install and pull request data comes from and how the statistics are calculated.',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
    meta: { title: 'Page not found' },
  },
]

export function createSiteRouter(history, scrollBehavior) {
  return createRouter({ history, scrollBehavior, routes, strict: true })
}
