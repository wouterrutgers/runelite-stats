import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

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

export default defineConfig({
  base: process.env.PAGES_BASE_PATH || '/runelite-stats/',
  define: {
    'import.meta.env.DATASET_HASH': JSON.stringify(datasetHash.digest('hex')),
  },
  plugins: [vue()],
})
