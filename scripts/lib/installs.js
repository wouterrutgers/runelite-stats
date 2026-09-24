import {
  DAY,
  PERIODS,
  RANKING_THRESHOLDS,
  requireValue,
  snapshotTime,
  validPluginId,
} from './config.js'

export function parseManifest(bytes) {
  const buffer = Buffer.from(bytes)
  requireValue(buffer.length > 4, 'Manifest is missing its signature header')
  const signatureLength = buffer.readUInt32BE(0)
  requireValue(
    signatureLength > 0 && signatureLength < buffer.length - 4,
    'Invalid manifest signature length',
  )
  // This read only collector does not execute jars or authenticate their signatures.
  const manifest = JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(4 + signatureLength)),
  )
  requireValue(
    Array.isArray(manifest.display) && manifest.display.length > 0,
    'Manifest has no display records',
  )
  requireValue(Array.isArray(manifest.jars), 'Manifest is missing jar availability')
  requireValue(
    manifest.display.every((plugin) => validPluginId(plugin.internalName)),
    'Invalid manifest plugin ID',
  )
  requireValue(
    new Set(manifest.display.map((plugin) => plugin.internalName)).size === manifest.display.length,
    'Duplicate manifest plugin IDs',
  )
  return manifest
}

export function appendPluginIndex(index, identifiers) {
  return [
    ...index,
    ...[...new Set(identifiers)].filter((identifier) => !index.includes(identifier)).sort(),
  ]
}

export function snapshotCounts(index, plugins) {
  const counts = new Map(plugins.map((plugin) => [plugin.internalName, plugin.installs]))
  return index.map((identifier) => counts.get(identifier) ?? null)
}

export function updateHighs(highs, index, counts, timestamp) {
  const updated = structuredClone(highs)
  index.forEach((identifier, position) => {
    const count = counts[position]
    if (count === null || count === undefined) return
    const previous = updated[identifier]
    updated[identifier] = {
      count: Math.max(previous?.count ?? 0, count),
      timestamp: !previous || count > previous.count ? timestamp : previous.timestamp,
      firstSeenAt: previous?.firstSeenAt || timestamp,
    }
  })
  return updated
}

export function addDailySnapshot(history, snapshot) {
  const date = snapshot.timestamp.slice(0, 10)
  if (history.some((row) => row.date === date)) return history
  return [...history, { date, timestamp: snapshot.timestamp, counts: snapshot.counts }].sort(
    (left, right) => left.date.localeCompare(right.date),
  )
}

export function addRecentSnapshot(recent, snapshot) {
  const slot = Math.floor(Date.parse(snapshot.timestamp) / (6 * 3_600_000))
  const snapshots = [
    ...recent.filter((row) => Math.floor(Date.parse(row.timestamp) / (6 * 3_600_000)) !== slot),
    snapshot,
  ].sort((left, right) => left.timestamp.localeCompare(right.timestamp))
  return snapshots.filter(
    (row, position) =>
      Date.parse(row.timestamp) >= Date.parse(snapshot.timestamp) - 2 * DAY ||
      position >= snapshots.length - 9,
  )
}

export function growthForPlugin(plugin, position, snapshots, now, days) {
  const target = Date.parse(now) - days * DAY
  const baseline = snapshots.findLast(
    (row) =>
      Date.parse(snapshotTime(row)) <= target &&
      row.counts[position] !== null &&
      row.counts[position] !== undefined,
  )
  const result = {
    current: plugin.installs,
    comparison: baseline?.counts[position] ?? null,
    comparedAt: baseline ? snapshotTime(baseline) : null,
    change: null,
    percentage: null,
    status: 'unavailable',
  }
  if (plugin.installs === null) return result
  if (!baseline) {
    if (plugin.createdAt && Date.parse(plugin.createdAt) > target) result.status = 'new'
    return result
  }
  result.change = plugin.installs - result.comparison
  if (result.comparison === 0) {
    result.status = plugin.installs > 0 ? 'new' : 'stable'
    return result
  }
  result.percentage = (result.change / result.comparison) * 100
  result.status = 'measured'
  return result
}

export function pluginGrowth(plugin, position, snapshots, now) {
  return Object.fromEntries(
    Object.entries(PERIODS).map(([period, days]) => [
      period,
      growthForPlugin(plugin, position, snapshots, now, days),
    ]),
  )
}

export function rankPlugins(plugins, period, now, thresholds = RANKING_THRESHOLDS) {
  const measured = plugins.filter((plugin) => plugin.growth[period].change !== null)
  return {
    biggest: measured
      .filter((plugin) => plugin.growth[period].change > 0)
      .sort((left, right) => right.growth[period].change - left.growth[period].change),
    fastest: measured
      .filter(
        (plugin) =>
          plugin.installs >= thresholds.percentageCurrent &&
          plugin.growth[period].comparison >= thresholds.percentageBaseline &&
          plugin.growth[period].percentage > 0,
      )
      .sort((left, right) => right.growth[period].percentage - left.growth[period].percentage),
    decline: measured
      .filter((plugin) => plugin.growth[period].change < 0)
      .sort((left, right) => left.growth[period].change - right.growth[period].change),
    new: plugins
      .filter(
        (plugin) =>
          plugin.createdAt &&
          Date.parse(plugin.createdAt) >= Date.parse(now) - thresholds.newDays * DAY &&
          plugin.installs >= thresholds.newInstalls,
      )
      .sort((left, right) => right.installs - left.installs),
  }
}
