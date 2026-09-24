import { readdir, readFile, mkdir } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { ROOT, exists } from './storage.js'
import { INSTALL_RESPONSE_LIMITS, requireValue, validPluginId } from './config.js'
import {
  parseManifest,
  appendPluginIndex,
  snapshotCounts,
  updateHighs,
  addRecentSnapshot,
  addDailySnapshot,
} from './installs.js'

const execute = promisify(execFile)

export async function fetchChecked(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(60_000),
    headers: { 'User-Agent': 'RuneLite-Hub-Stats', ...options.headers },
  })
  requireValue(response.ok, `Upstream ${new URL(url).hostname} returned HTTP ${response.status}`)
  return response
}

export function parsePointer(text) {
  const fields = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^(repository|commit|warning|disabled)=(.*)$/)
    if (match) fields[match[1]] = match[2].trim()
  }
  return {
    repository: fields.repository || null,
    commit: fields.commit || null,
    warning: fields.warning || null,
    disabled: Object.hasOwn(fields, 'disabled'),
    disabledReason: fields.disabled || null,
  }
}

export async function readPointers(directory) {
  const entries = await readdir(path.join(directory, 'plugins'), { withFileTypes: true })
  const pointers = Object.fromEntries(
    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && validPluginId(entry.name))
        .map(async (entry) => [
          entry.name,
          parsePointer(await readFile(path.join(directory, 'plugins', entry.name), 'utf8')),
        ]),
    ),
  )
  requireValue(
    Object.keys(pointers).length > 0,
    'Plugin Hub checkout has no direct plugin pointer files',
  )
  return pointers
}

export async function checkoutPluginHub() {
  if (process.env.PLUGIN_HUB_DIR) return process.env.PLUGIN_HUB_DIR
  const directory = path.join(ROOT, '.cache', 'plugin-hub')
  if (!(await exists(directory))) {
    await mkdir(path.dirname(directory), { recursive: true })
    await execute('git', [
      'clone',
      '--depth',
      '1',
      'https://github.com/runelite/plugin-hub.git',
      directory,
    ])
    return directory
  }
  await execute('git', ['-C', directory, 'fetch', '--depth', '1', 'origin', 'HEAD'])
  await execute('git', ['-C', directory, 'reset', '--hard', 'FETCH_HEAD'])
  return directory
}

function plainText(value) {
  return (value || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, '')
}

function epochDate(seconds) {
  return seconds ? new Date(seconds * 1000).toISOString() : null
}

export function validateInstallResponse(counts, manifest, previous) {
  requireValue(
    counts &&
      !Array.isArray(counts) &&
      typeof counts === 'object' &&
      Object.keys(counts).length > 0,
    'Empty install response',
  )
  requireValue(
    Object.entries(counts).every(
      ([identifier, count]) =>
        validPluginId(identifier) && Number.isSafeInteger(count) && count >= 0,
    ),
    'Malformed install response',
  )
  const matched = manifest.display.filter((plugin) =>
    Object.hasOwn(counts, plugin.internalName),
  ).length
  requireValue(
    matched / manifest.display.length >= INSTALL_RESPONSE_LIMITS.minimumCoverage,
    'Suspicious install response: less than 80% manifest coverage',
  )
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  requireValue(total > 0, 'Install response has no activity')
  const previousTotal = Object.values(previous.rawInstallCounts || {}).reduce(
    (sum, count) => sum + count,
    0,
  )
  requireValue(
    !previousTotal || total / previousTotal >= INSTALL_RESPONSE_LIMITS.minimumTotalRatio,
    'Suspicious install response: total dropped by more than 50%',
  )
  requireValue(
    !previous.manifestCount || manifest.display.length >= previous.manifestCount * 0.8,
    'Suspicious manifest: over 20% of records disappeared',
  )
}

export async function collectRuneLite(source) {
  const bootstrap = await (await fetchChecked('https://static.runelite.net/bootstrap.json')).json()
  requireValue(
    typeof bootstrap.version === 'string' && /^\d+\.\d+\.\d+(?:\.\d+)?$/.test(bootstrap.version),
    'Unexpected RuneLite version',
  )
  const [manifestResponse, countResponse, directory] = await Promise.all([
    fetchChecked(`https://repo.runelite.net/plugins/manifest/${bootstrap.version}_full.js`),
    fetchChecked(`https://api.runelite.net/runelite-${bootstrap.version}/pluginhub`),
    checkoutPluginHub(),
  ])
  const manifest = parseManifest(await manifestResponse.arrayBuffer())
  const counts = await countResponse.json()
  validateInstallResponse(counts, manifest, source.current)
  const pointers = await readPointers(directory)
  const { stdout: repositoryCommit } = await execute('git', ['-C', directory, 'rev-parse', 'HEAD'])
  const timestamp = new Date().toISOString()
  const index = appendPluginIndex(source.index, [
    ...manifest.display.map((plugin) => plugin.internalName),
    ...Object.keys(pointers),
  ])
  const available = new Set(manifest.jars.map((plugin) => plugin.internalName))
  const display = new Map(manifest.display.map((plugin) => [plugin.internalName, plugin]))
  const previous = new Map(source.current.plugins.map((plugin) => [plugin.internalName, plugin]))
  const plugins = index.map((internalName) => {
    const metadata = display.get(internalName)
    const pointer = pointers[internalName]
    const old = previous.get(internalName)
    return {
      internalName,
      displayName: metadata?.displayName || old?.displayName || internalName,
      author: metadata?.author || old?.author || '',
      description: metadata ? plainText(metadata.description) : old?.description || '',
      tags: metadata?.tags || old?.tags || [],
      version: metadata?.version || old?.version || null,
      iconHash: metadata?.iconHash || old?.iconHash || null,
      createdAt: metadata ? epochDate(metadata.createdAt) : old?.createdAt || null,
      lastUpdatedAt: metadata ? epochDate(metadata.lastUpdatedAt) : old?.lastUpdatedAt || null,
      warning: plainText(metadata?.warning || pointer?.warning),
      unavailableReason: plainText(metadata?.unavailableReason || pointer?.disabledReason),
      inManifest: Boolean(metadata),
      current: Boolean(pointer),
      available: available.has(internalName) && !metadata?.unavailableReason && !pointer?.disabled,
      disabled: Boolean(pointer?.disabled),
      installs: metadata || pointer ? (counts[internalName] ?? (metadata ? 0 : null)) : null,
      repository: pointer?.repository || old?.repository || null,
      commit: pointer?.commit || old?.commit || null,
    }
  })
  const snapshot = { timestamp, counts: snapshotCounts(index, plugins) }
  console.log(
    `RuneLite ${bootstrap.version}: ${manifest.display.length} manifest records, ${Object.keys(pointers).length} pointer files`,
  )
  return {
    ...source,
    index,
    current: {
      syncedAt: timestamp,
      version: bootstrap.version,
      repositoryCommit: repositoryCommit.trim(),
      manifestCount: manifest.display.length,
      rawInstallCounts: counts,
      plugins,
    },
    recent: addRecentSnapshot(source.recent, snapshot),
    history: addDailySnapshot(source.history, snapshot),
    highs: updateHighs(source.highs, index, snapshot.counts, timestamp),
  }
}
