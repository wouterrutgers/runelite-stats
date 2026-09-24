import { synchronize, reportFailure } from './lib/cli.js'
await synchronize(['runelite', 'github']).catch(reportFailure)
