import { rm } from 'node:fs/promises'
import path from 'node:path'
import { collectRuneLite } from './runelite.js'
import { collectGitHub } from './github.js'
import { ROOT, sourceTransaction } from './storage.js'

export async function synchronize(collectors) {
  await sourceTransaction(async (source) => {
    let next = source
    if (collectors.includes('runelite')) next = await collectRuneLite(next)
    if (collectors.includes('github'))
      next = await collectGitHub(next, { full: process.argv.includes('--full') })
    return next
  })
  if (collectors.includes('github'))
    await rm(path.join(ROOT, '.cache', 'github-backfill.json'), { force: true })
  console.log('Validated source data replaced successfully.')
}

export function reportFailure(error) {
  console.error(error.message)
  process.exitCode = 1
}
