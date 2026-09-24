import { appendPluginIndex, updateHighs } from './installs.js'
import { requireValue, snapshotTime, validPluginId } from './config.js'

export function mergeImportedHistory(source, imported) {
  requireValue(
    typeof imported.source === 'string' && imported.source.trim(),
    'Import must identify its authorized source',
  )
  requireValue(
    Array.isArray(imported.index) &&
      imported.index.every(validPluginId) &&
      new Set(imported.index).size === imported.index.length &&
      Array.isArray(imported.snapshots) &&
      imported.snapshots.length > 0,
    'Invalid history import format',
  )
  const next = structuredClone(source)
  next.index = appendPluginIndex(next.index, imported.index)
  const importedPositions = new Map(
    imported.index.map((identifier, position) => [identifier, position]),
  )
  const byDate = new Map(next.history.map((row) => [row.date, row]))
  for (const row of imported.snapshots) {
    requireValue(
      Array.isArray(row.counts) && row.counts.length <= imported.index.length,
      'Invalid imported snapshot length',
    )
    requireValue(
      !byDate.has(row.date),
      `Snapshot ${row.date} already exists. Import stopped without replacing history.`,
    )
    const snapshot = {
      date: row.date,
      timestamp: snapshotTime(row),
      source: imported.source,
      counts: next.index.map((identifier) => row.counts[importedPositions.get(identifier)] ?? null),
    }
    next.highs = updateHighs(next.highs, next.index, snapshot.counts, snapshot.timestamp)
    snapshot.counts.forEach((count, position) => {
      if (count !== null && snapshot.timestamp < next.highs[next.index[position]].firstSeenAt)
        next.highs[next.index[position]].firstSeenAt = snapshot.timestamp
    })
    byDate.set(row.date, snapshot)
  }
  next.history = [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date))
  return next
}
