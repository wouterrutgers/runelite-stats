import { readSource, validateSource } from './lib/storage.js'
import { reportFailure } from './lib/cli.js'
await readSource()
  .then((source) => {
    validateSource(source)
    console.log(
      `Source data valid: ${source.index.length} plugin IDs, ${source.history.length} daily snapshots, ${source.prs.length} PRs.`,
    )
  })
  .catch(reportFailure)
