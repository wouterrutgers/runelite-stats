import { mkdir, readFile, writeFile, readdir, rename, rm, access } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { requireValue, validPluginId, snapshotTime } from './config.js'

export const ROOT = fileURLToPath(new URL('../../', import.meta.url))

export async function exists(filename) {
  try {
    await access(filename)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

export async function readJson(filename, initial) {
  if (!(await exists(filename))) return initial
  return JSON.parse(await readFile(filename, 'utf8'))
}

export async function readNdjson(filename) {
  if (!(await exists(filename))) return []
  return (await readFile(filename, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

export async function atomicJson(filename, value) {
  await mkdir(path.dirname(filename), { recursive: true })
  const temporary = `${filename}.${randomUUID()}.tmp`
  await writeFile(temporary, `${JSON.stringify(value)}\n`)
  await rename(temporary, filename)
}

export async function readSource(directory = path.join(ROOT, 'data')) {
  const years = (await exists(path.join(directory, 'install-history')))
    ? await readdir(path.join(directory, 'install-history'))
    : []
  const [index, current, recent, highs, prs, prState, histories] = await Promise.all([
    readJson(path.join(directory, 'plugin-index.json'), []),
    readJson(path.join(directory, 'current.json'), { syncedAt: null, version: null, plugins: [] }),
    readJson(path.join(directory, 'recent-installs.json'), []),
    readJson(path.join(directory, 'install-highs.json'), {}),
    readNdjson(path.join(directory, 'prs.ndjson')),
    readJson(path.join(directory, 'pr-state.json'), { syncedAt: null, complete: false, count: 0 }),
    Promise.all(
      years
        .filter((year) => /^\d{4}\.ndjson$/.test(year))
        .sort()
        .map((year) => readNdjson(path.join(directory, 'install-history', year))),
    ),
  ])
  return { index, current, recent, highs, prs, prState, history: histories.flat() }
}

function validTimestamp(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d\d-\d\dT.*Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 19) === value.slice(0, 19)
  )
}

function validateCounts(counts, length) {
  requireValue(Array.isArray(counts) && counts.length <= length, 'Invalid snapshot array length')
  requireValue(
    counts.every((count) => count === null || (Number.isSafeInteger(count) && count >= 0)),
    'Invalid install count in history',
  )
}

export function validateSource(source, previous) {
  const { index, current, recent, history, highs, prs, prState } = source
  requireValue(
    Array.isArray(index) && index.every(validPluginId) && new Set(index).size === index.length,
    'Invalid or duplicate plugin index',
  )
  if (previous)
    requireValue(
      previous.index.every((identifier, position) => identifier === index[position]),
      'Plugin index was reordered or shortened',
    )
  const identifiers = new Set(index)
  requireValue(
    new Set(current.plugins.map((plugin) => plugin.internalName)).size === current.plugins.length,
    'Duplicate current plugin',
  )
  requireValue(!current.syncedAt || validTimestamp(current.syncedAt), 'Invalid current timestamp')
  for (const plugin of current.plugins) {
    requireValue(identifiers.has(plugin.internalName), 'Current plugin missing from index')
    validateCounts([plugin.installs], 1)
    requireValue(
      typeof plugin.displayName === 'string' &&
        typeof plugin.author === 'string' &&
        Array.isArray(plugin.tags),
      'Invalid current plugin metadata',
    )
    for (const field of ['createdAt', 'lastUpdatedAt'])
      requireValue(
        plugin[field] === null || validTimestamp(plugin[field]),
        `Invalid plugin ${field}`,
      )
  }
  requireValue(
    new Set(history.map((row) => row.date)).size === history.length,
    'Duplicate daily snapshot',
  )
  if (previous) {
    const byDate = new Map(history.map((row) => [row.date, row]))
    for (const row of previous.history)
      requireValue(
        JSON.stringify(byDate.get(row.date)) === JSON.stringify(row),
        `Existing daily history was changed or removed: ${row.date}`,
      )
  }
  requireValue(
    new Set(recent.map((row) => row.timestamp)).size === recent.length,
    'Duplicate recent timestamp',
  )
  for (const row of [...recent, ...history]) {
    validateCounts(row.counts, index.length)
    requireValue(validTimestamp(snapshotTime(row)), 'Invalid snapshot timestamp')
    if (row.date)
      requireValue(
        /^\d{4}-\d\d-\d\d$/.test(row.date) && snapshotTime(row).slice(0, 10) === row.date,
        'Invalid daily date',
      )
    row.counts.forEach((count, position) => {
      if (count !== null)
        requireValue(highs[index[position]]?.count >= count, 'History exceeds recorded high')
    })
  }
  for (const [identifier, high] of Object.entries(highs)) {
    requireValue(
      identifiers.has(identifier) &&
        Number.isSafeInteger(high.count) &&
        high.count >= 0 &&
        validTimestamp(high.timestamp) &&
        validTimestamp(high.firstSeenAt),
      'Invalid all time high',
    )
    if (previous?.highs[identifier])
      requireValue(high.count >= previous.highs[identifier].count, 'All time high decreased')
  }
  if (previous)
    for (const identifier of Object.keys(previous.highs))
      requireValue(highs[identifier], 'All time high was removed')
  requireValue(
    new Set(prs.map((record) => record.number)).size === prs.length,
    'Duplicate PR number',
  )
  for (const record of prs) {
    requireValue(
      Number.isSafeInteger(record.number) &&
        record.number > 0 &&
        ['OPEN', 'CLOSED', 'MERGED'].includes(record.state),
      'Invalid PR identity or state',
    )
    requireValue(
      validTimestamp(record.createdAt) && validTimestamp(record.updatedAt),
      `Invalid PR #${record.number} timestamps`,
    )
    requireValue(record.closedAt === null || validTimestamp(record.closedAt), 'Invalid closedAt')
    requireValue(record.mergedAt === null || validTimestamp(record.mergedAt), 'Invalid mergedAt')
    requireValue(record.state !== 'MERGED' || record.mergedAt, 'Merged PR lacks merge timestamp')
    requireValue(
      record.state !== 'OPEN' || (!record.closedAt && !record.mergedAt),
      'Open PR has resolution timestamp',
    )
    requireValue(
      Number.isSafeInteger(record.changedFiles) &&
        record.changedFiles >= 0 &&
        new Set(record.files.map((file) => file.path)).size === record.changedFiles &&
        record.files.length === (record.fileRecords ?? record.changedFiles),
      `Incomplete files in PR #${record.number}`,
    )
    requireValue(
      new Set(record.files.map((file) => `${file.path}:${file.changeType}`)).size ===
        record.files.length,
      'Duplicate PR file change record',
    )
    requireValue(
      record.files.every(
        (file) =>
          typeof file.path === 'string' &&
          Number.isSafeInteger(file.additions) &&
          file.additions >= 0 &&
          Number.isSafeInteger(file.deletions) &&
          file.deletions >= 0 &&
          ['ADDED', 'MODIFIED', 'DELETED', 'RENAMED', 'COPIED', 'CHANGED', 'UNCHANGED'].includes(
            file.changeType,
          ),
      ),
      'Invalid PR file',
    )
  }
  requireValue(prState.count === prs.length, 'PR ledger count does not match state')
  requireValue(
    prState.complete
      ? validTimestamp(prState.syncedAt) && prs.length > 0
      : !prState.syncedAt && !prs.length,
    'Invalid PR synchronization state',
  )
  return source
}

export async function writeSource(directory, source) {
  await mkdir(path.join(directory, 'install-history'), { recursive: true })
  for (const [filename, value] of Object.entries({
    'plugin-index.json': source.index,
    'current.json': source.current,
    'recent-installs.json': source.recent,
    'install-highs.json': source.highs,
    'pr-state.json': source.prState,
  })) {
    await writeFile(
      path.join(directory, filename),
      `${JSON.stringify(value, null, filename === 'plugin-index.json' ? 2 : 0)}\n`,
    )
  }
  await writeFile(
    path.join(directory, 'prs.ndjson'),
    source.prs.map((record) => JSON.stringify(record)).join('\n') + (source.prs.length ? '\n' : ''),
  )
  for (const year of new Set(source.history.map((row) => row.date.slice(0, 4)))) {
    await writeFile(
      path.join(directory, 'install-history', `${year}.ndjson`),
      source.history
        .filter((row) => row.date.startsWith(year))
        .map((row) => JSON.stringify(row))
        .join('\n') + '\n',
    )
  }
}

export async function sourceTransaction(update, root = ROOT) {
  const lock = path.join(root, '.sync-lock')
  await mkdir(lock).catch((error) => {
    if (error.code === 'EEXIST')
      throw new Error('A sync lock exists. Check for a running sync before removing .sync-lock.')
    throw error
  })
  const directory = path.join(root, 'data')
  const backup = path.join(root, '.data-backup')
  const stage = path.join(root, `.data-stage-${randomUUID()}`)
  try {
    requireValue(
      !(await exists(backup)),
      'An interrupted replacement left .data-backup. Follow README recovery before syncing.',
    )
    const previous = validateSource(await readSource(directory))
    const next = validateSource(await update(structuredClone(previous)), previous)
    await writeSource(stage, next)
    validateSource(await readSource(stage), previous)
    const hadData = await exists(directory)
    if (hadData) await rename(directory, backup)
    try {
      await rename(stage, directory)
    } catch (error) {
      if (hadData) await rename(backup, directory)
      throw error
    }
    await rm(backup, { recursive: true, force: true })
    return next
  } finally {
    await rm(stage, { recursive: true, force: true })
    await rm(lock, { recursive: true, force: true })
  }
}
