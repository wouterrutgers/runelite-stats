<script setup>
import { ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const main = ref(null)
watch(
  () => route.path,
  async () => {
    await nextTick()
    main.value?.focus({ preventScroll: true })
  },
)
</script>

<template>
  <a class="skip-link" href="#main-content" @click.prevent="main.focus()">Skip to content</a>
  <header class="site-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand" aria-label="RuneLite Hub Stats home">
        <span class="brand-name">RuneLite</span><span class="brand-description">Hub Stats</span>
      </RouterLink>
      <nav aria-label="Main navigation">
        <RouterLink to="/" exact-active-class="is-active" active-class="">Overview</RouterLink>
        <RouterLink
          to="/plugins"
          active-class="is-active"
          :class="{ 'is-active': route.path.startsWith('/plugin/') }"
          :aria-current="
            route.path.startsWith('/plugin/')
              ? 'location'
              : route.path === '/plugins'
                ? 'page'
                : undefined
          "
          >Plugins</RouterLink
        >
        <RouterLink to="/growth" active-class="is-active">Growth</RouterLink>
        <RouterLink
          to="/developers"
          active-class="is-active"
          :class="{ 'is-active': route.path.startsWith('/developer/') }"
          :aria-current="
            route.path.startsWith('/developer/')
              ? 'location'
              : route.path === '/developers'
                ? 'page'
                : undefined
          "
          >Developers</RouterLink
        >
        <RouterLink to="/hub" active-class="is-active">Hub activity</RouterLink>
        <RouterLink to="/about" active-class="is-active">About</RouterLink>
      </nav>
      <a
        class="source-link"
        href="https://github.com/runelite/plugin-hub"
        target="_blank"
        rel="noreferrer"
        >Plugin Hub ↗</a
      >
    </div>
  </header>
  <main id="main-content" ref="main" tabindex="-1"><RouterView /></main>
  <footer class="site-footer">
    <p>An unofficial community project. Not affiliated with RuneLite or Jagex.</p>
    <RouterLink to="/about">About the data</RouterLink>
  </footer>
</template>
