import { mkdir, writeFile, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { buildDatasets } from './lib/analytics.js'
import { ROOT, readSource, validateSource, exists } from './lib/storage.js'
import { reportFailure } from './lib/cli.js'

async function aggregate() {
  const datasets = buildDatasets(validateSource(await readSource()))
  const stage = path.join(ROOT, '.cache', `aggregate-${randomUUID()}`)
  const destination = path.join(ROOT, 'public', 'data')
  const backup = path.join(ROOT, '.cache', `aggregate-backup-${randomUUID()}`)
  await mkdir(stage, { recursive: true })
  try {
    for (const [filename, value] of datasets) {
      await mkdir(path.dirname(path.join(stage, filename)), { recursive: true })
      const json = JSON.stringify(value, (key, item) => {
        if (typeof item === 'number' && !Number.isFinite(item))
          throw new Error(`Invalid generated number at ${filename}:${key}`)
        return item
      })
      await writeFile(path.join(stage, filename), json)
    }
    const hadData = await exists(destination)
    if (hadData) await rename(destination, backup)
    try {
      await rename(stage, destination)
    } catch (error) {
      if (hadData) await rename(backup, destination)
      throw error
    }
    await rm(backup, { recursive: true, force: true })
    console.log(`Generated ${datasets.size} static datasets.`)
  } finally {
    await rm(stage, { recursive: true, force: true })
  }
}
await aggregate().catch(reportFailure)
