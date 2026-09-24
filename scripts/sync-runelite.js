import { synchronize, reportFailure } from './lib/cli.js'
await synchronize(['runelite']).catch(reportFailure)
