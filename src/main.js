import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router, { prefetchRoute } from './router/index.js'
createApp(App).use(router).mount('#app')

function prefetchLink(event) {
  const link = event.target.closest('a[href]')
  if (
    !link ||
    link.origin !== location.origin ||
    link.pathname !== location.pathname ||
    !link.hash.startsWith('#/')
  )
    return
  prefetchRoute(link.hash.slice(1))
}
for (const event of ['pointerover', 'focusin', 'pointerdown']) {
  document.addEventListener(event, prefetchLink)
}

function whenIdle() {
  return new Promise(function (resolve) {
    if ('requestIdleCallback' in window) window.requestIdleCallback(resolve)
    else setTimeout(resolve, 0)
  })
}
async function prefetchNavigation() {
  await router.isReady()
  await prefetchRoute(router.currentRoute.value)
  for (const link of document.querySelectorAll('.site-header nav a')) {
    await whenIdle()
    await prefetchRoute(link.hash.slice(1))
  }
}
prefetchNavigation()
