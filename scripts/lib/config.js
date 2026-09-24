export const DAY = 86_400_000
export const PERIODS = { '24h': 1, '7d': 7, '30d': 30, '180d': 180, '1y': 365 }
export const RANKING_THRESHOLDS = {
  percentageCurrent: 100,
  percentageBaseline: 100,
  newInstalls: 50,
  newDays: 30,
  staleDays: 180,
}
export const INSTALL_RESPONSE_LIMITS = { minimumCoverage: 0.8, minimumTotalRatio: 0.5 }
export const PLUGIN_PATH = /^plugins\/([^/]+)$/

export function requireValue(condition, message) {
  if (!condition) throw new Error(message)
}

export function validPluginId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)
}

export function weekStart(value) {
  const date = new Date(value)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

export function snapshotTime(snapshot) {
  return snapshot.timestamp || `${snapshot.date}T00:00:00.000Z`
}

export function quantile(values, fraction) {
  if (!values.length) return null
  const sorted = [...values].sort((left, right) => left - right)
  const position = (sorted.length - 1) * fraction
  const lower = Math.floor(position)
  return sorted[lower] + (sorted[Math.ceil(position)] - sorted[lower]) * (position - lower)
}
