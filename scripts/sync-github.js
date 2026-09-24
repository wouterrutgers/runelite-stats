import { synchronize, reportFailure } from './lib/cli.js'
await synchronize(['github']).catch(reportFailure)
