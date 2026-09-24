import { readFile } from 'node:fs/promises'
import { sourceTransaction } from './lib/storage.js'
import { mergeImportedHistory } from './lib/import-history.js'
import { requireValue } from './lib/config.js'
import { reportFailure } from './lib/cli.js'

async function importHistory() {
  requireValue(process.argv[2], 'Usage: npm run import:history -- /path/to/authorized-history.json')
  const imported = JSON.parse(await readFile(process.argv[2], 'utf8'))
  await sourceTransaction(async (source) => mergeImportedHistory(source, imported))
  console.log('Imported daily history. Run npm run aggregate to rebuild the frontend datasets.')
}
await importHistory().catch(reportFailure)
