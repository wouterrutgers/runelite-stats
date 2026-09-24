const integer = new Intl.NumberFormat('en', { maximumFractionDigits: 0 })
const percent = new Intl.NumberFormat('en', { maximumFractionDigits: 1, signDisplay: 'exceptZero' })
const calendar = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const clock = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
  hourCycle: 'h23',
})
export function number(value) {
  return value === null || value === undefined ? 'Not available' : integer.format(value)
}
export function percentage(value) {
  return value === null || value === undefined ? 'Not available' : `${percent.format(value)}%`
}
export function date(value) {
  return value ? calendar.format(new Date(value)) : 'Not recorded'
}
export function timestamp(value) {
  return value ? `${clock.format(new Date(value))} UTC` : 'Awaiting collection'
}
export function duration(hours) {
  if (hours === null || hours === undefined) return 'Not available'
  if (hours < 1) return `${Math.round(hours * 60)}m`
  return hours < 48
    ? `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(hours)}h`
    : `${new Intl.NumberFormat('en', { maximumFractionDigits: 1 }).format(hours / 24)}d`
}
export function withinRange(rows, range, now, dateKey = 'timestamp') {
  const days = { '48h': 2, '7d': 7, '30d': 30, '1m': 30, '3m': 90, '6m': 180, '1y': 365 }
  if (range === 'All') return rows
  return rows.filter(
    (row) => Date.parse(row[dateKey]) >= Date.parse(now) - days[range] * 86_400_000,
  )
}
