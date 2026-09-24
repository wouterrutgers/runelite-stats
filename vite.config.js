import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  base: process.env.PAGES_BASE_PATH || '/runelite-stats/',
  plugins: [vue()],
})
