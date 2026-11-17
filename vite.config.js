import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { datasetsForPath } from './src/datasets.js'

function preloadInitialDatasets(datasetsForPath, baseUrl, version) {
  const path = location.hash.slice(1).split('?')[0] || '/'
  for (const filename of datasetsForPath(path)) {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'fetch'
    link.crossOrigin = 'anonymous'
    link.href = `${baseUrl}data/${filename}?v=${version}`
    document.head.append(link)
  }
}

function addDatasetFilesToHash(hash, directory, root) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      addDatasetFilesToHash(hash, filename, root)
      continue
    }
    hash.update(path.relative(root, filename).split(path.sep).join('/'))
    hash.update('\0')
    hash.update(readFileSync(filename))
  }
}

const datasetDirectory = fileURLToPath(new URL('./public/data/', import.meta.url))
const datasetHash = createHash('sha256')
addDatasetFilesToHash(datasetHash, datasetDirectory, datasetDirectory)
const datasetVersion = datasetHash.digest('hex')
let baseUrl

export default defineConfig({
  base: process.env.PAGES_BASE_PATH || '/runelite-stats/',
  define: {
    'import.meta.env.DATASET_HASH': JSON.stringify(datasetVersion),
  },
  plugins: [
    vue(),
    {
      name: 'preload-page-data',
      configResolved(config) {
        baseUrl = config.base
      },
      transformIndexHtml(html) {
        // Start data requests before stylesheets can block this inline script.
        return html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <script>(${preloadInitialDatasets.toString()})(${datasetsForPath.toString()}, ${JSON.stringify(baseUrl)}, ${JSON.stringify(datasetVersion)})</script>`,
        )
      },
    },
  ],
})
