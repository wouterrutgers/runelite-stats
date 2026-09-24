import { createHash } from 'node:crypto'
import { DAY, PERIODS, RANKING_THRESHOLDS, quantile, snapshotTime, weekStart } from './config.js'
import { classifyPullRequest, pluginFileChanges } from './github.js'
import { pluginGrowth, rankPlugins } from './installs.js'

export function normalizeAuthors(original) {
  const authors = original
    .split(/\s*(?:,|;|\s+&\s+|\s+and\s+)\s*/i)
    .map((name) => name.trim().replace(/^and\s+/i, ''))
    .filter((name) => name && !/^and$/i.test(name))
  const unique = new Map()
  for (const name of authors) {
    const key = name.normalize('NFKC').toLocaleLowerCase('en')
    if (!unique.has(key)) unique.set(key, name)
  }
  return [...unique.entries()].map(([key, name]) => ({
    name,
    key,
    slug: `${
      key
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || 'author'
    }-${createHash('sha256').update(key).digest('hex').slice(0, 8)}`,
  }))
}

function emptyActivity() {
  return {
    firstAddedAt: null,
    lastUpdatedAt: null,
    mergedUpdates: 0,
    updates90d: 0,
    recent: [],
    aliases: [],
  }
}

export function aggregateHub(prs, currentPlugins, now, complete) {
  const byPlugin = new Map()
  const classifications = new Map()
  const aliases = []
  const authors = new Map()
  const buckets = new Map()
  function activity(identifier) {
    if (!byPlugin.has(identifier)) byPlugin.set(identifier, emptyActivity())
    return byPlugin.get(identifier)
  }
  function bucket(value) {
    const date = weekStart(value)
    if (!buckets.has(date))
      buckets.set(date, {
        date,
        opened: 0,
        merged: 0,
        closed: 0,
        added: 0,
        removed: 0,
        durations: [],
        events: [],
      })
    return buckets.get(date)
  }
  for (const record of prs) {
    const classified = classifyPullRequest(record)
    classifications.set(record.number, classified)
    bucket(record.createdAt).opened++
    if (record.mergedAt) bucket(record.mergedAt).merged++
    if (record.closedAt && !record.mergedAt) bucket(record.closedAt).closed++
    const resolvedAt = record.mergedAt || record.closedAt
    const duration = resolvedAt
      ? (Date.parse(resolvedAt) - Date.parse(record.createdAt)) / 3_600_000
      : null
    if (resolvedAt) bucket(resolvedAt).durations.push(duration)
    if (record.author) {
      if (!authors.has(record.author))
        authors.set(record.author, { login: record.author, opened: 0, merged: 0 })
      authors.get(record.author).opened++
      if (record.mergedAt) authors.get(record.author).merged++
    }
    if (classified.rename) {
      aliases.push(classified.rename)
      activity(classified.rename.from).aliases.push(classified.rename)
      activity(classified.rename.to).aliases.push(classified.rename)
    }
    for (const change of classified.changes) {
      const plugin = activity(change.internalName)
      plugin.recent.push({
        number: record.number,
        title: record.title,
        author: record.author,
        state: record.state,
        createdAt: record.createdAt,
        mergedAt: record.mergedAt,
        closedAt: record.closedAt,
        updatedAt: record.updatedAt,
        durationHours: duration,
        changeType: change.type,
      })
      if (!change.merged) continue
      if (change.type === 'added') {
        if (!plugin.firstAddedAt || record.mergedAt < plugin.firstAddedAt)
          plugin.firstAddedAt = record.mergedAt
        bucket(record.mergedAt).added++
      }
      if (change.type === 'removed') bucket(record.mergedAt).removed++
      if (change.type === 'updated' || change.type === 'renamed') {
        plugin.mergedUpdates++
        if (Date.parse(record.mergedAt) >= Date.parse(now) - 90 * DAY) plugin.updates90d++
      }
      if (!plugin.lastUpdatedAt || record.mergedAt > plugin.lastUpdatedAt)
        plugin.lastUpdatedAt = record.mergedAt
    }
    if (record.mergedAt) bucket(record.mergedAt).events.push(record)
  }
  for (const plugin of byPlugin.values())
    plugin.recent.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  // Back project membership from the current pointer checkout, then replay merged file events.
  const membership = new Set(
    currentPlugins.filter((plugin) => plugin.current).map((plugin) => plugin.internalName),
  )
  const merged = prs
    .filter((record) => record.mergedAt)
    .sort(
      (left, right) => left.mergedAt.localeCompare(right.mergedAt) || left.number - right.number,
    )
  for (const record of [...merged].reverse()) {
    for (const file of pluginFileChanges(record)) {
      if (file.changeType === 'ADDED') membership.delete(file.path.slice(8))
      if (file.changeType === 'DELETED') membership.add(file.path.slice(8))
    }
  }
  const weekly = []
  const thisWeek = weekStart(now)
  let backlog = 0
  const firstWeek = [...buckets.keys()].sort()[0]
  if (firstWeek)
    for (
      let time = Date.parse(`${firstWeek}T00:00:00Z`);
      time < Date.parse(`${thisWeek}T00:00:00Z`);
      time += 7 * DAY
    ) {
      const date = new Date(time).toISOString().slice(0, 10)
      const row = buckets.get(date) || {
        opened: 0,
        merged: 0,
        closed: 0,
        added: 0,
        removed: 0,
        durations: [],
        events: [],
      }
      backlog += row.opened - row.merged - row.closed
      for (const record of row.events.sort(
        (left, right) => left.mergedAt.localeCompare(right.mergedAt) || left.number - right.number,
      )) {
        for (const file of pluginFileChanges(record)) {
          if (file.changeType === 'ADDED') membership.add(file.path.slice(8))
          if (file.changeType === 'DELETED') membership.delete(file.path.slice(8))
        }
      }
      weekly.push({
        date,
        opened: row.opened,
        merged: row.merged,
        closed: row.closed,
        added: row.added,
        removed: row.removed,
        backlog,
        active: membership.size,
        medianHours: quantile(row.durations, 0.5),
        p90Hours: quantile(row.durations, 0.9),
        resolved: row.durations.length,
      })
    }
  const durations = prs
    .filter((record) => record.mergedAt || record.closedAt)
    .map(
      (record) =>
        (Date.parse(record.mergedAt || record.closedAt) - Date.parse(record.createdAt)) / 3_600_000,
    )
  const lastWeek = weekly.at(-1)
  return {
    complete,
    byPlugin,
    classifications,
    aliases,
    weekly,
    authors: [...authors.values()].sort((left, right) => right.merged - left.merged),
    stats: {
      mergedLastWeek: complete ? (lastWeek?.merged ?? 0) : null,
      lastCompleteWeek: lastWeek?.date || null,
      totalMerged: complete ? merged.length : null,
      currentPlugins: currentPlugins.filter((plugin) => plugin.current && !plugin.disabled).length,
      backlog: complete ? prs.filter((record) => record.state === 'OPEN').length : null,
      medianHours: complete ? quantile(durations, 0.5) : null,
      p90Hours: complete ? quantile(durations, 0.9) : null,
      added30d: complete
        ? merged
            .filter((record) => Date.parse(record.mergedAt) >= Date.parse(now) - 30 * DAY)
            .reduce(
              (sum, record) =>
                sum +
                classifications
                  .get(record.number)
                  .changes.filter((change) => change.type === 'added').length,
              0,
            )
        : null,
    },
  }
}

export function combinedGrowth(plugins, period) {
  const measured = plugins
    .map((plugin) => plugin.growth[period])
    .filter((growth) => growth.change !== null)
  const current = measured.reduce((sum, growth) => sum + growth.current, 0)
  const comparison = measured.reduce((sum, growth) => sum + growth.comparison, 0)
  return {
    current,
    comparison,
    change: measured.length ? current - comparison : null,
    percentage: comparison > 0 ? ((current - comparison) / comparison) * 100 : null,
    status: measured.length ? 'measured' : 'unavailable',
    measuredPlugins: measured.length,
    totalPlugins: plugins.length,
  }
}

export function buildDatasets(source) {
  const now = source.current.syncedAt || source.prState.syncedAt || new Date().toISOString()
  const hub = aggregateHub(
    source.prs,
    source.current.plugins,
    source.prState.syncedAt || now,
    source.prState.complete,
  )
  const snapshots = [...source.history, ...source.recent].sort(
    (left, right) => Date.parse(snapshotTime(left)) - Date.parse(snapshotTime(right)),
  )
  const positions = new Map(source.index.map((identifier, position) => [identifier, position]))
  const sourcePlugins = new Map(
    source.current.plugins.map((plugin) => [plugin.internalName, plugin]),
  )
  for (const internalName of new Set([...source.index, ...hub.byPlugin.keys()])) {
    const activity = hub.byPlugin.get(internalName) || emptyActivity()
    if (!sourcePlugins.has(internalName))
      sourcePlugins.set(internalName, {
        internalName,
        displayName: internalName,
        author: '',
        description: 'Historical Plugin Hub entry. Current manifest metadata is unavailable.',
        tags: [],
        installs: null,
        current: false,
        available: false,
        disabled: false,
        inManifest: false,
        createdAt: activity.firstAddedAt,
        lastUpdatedAt: activity.lastUpdatedAt,
        repository: null,
      })
  }
  const plugins = [...sourcePlugins.values()]
    .map((plugin) => {
      const activity = hub.byPlugin.get(plugin.internalName) || emptyActivity()
      const normalized = { ...plugin, createdAt: plugin.createdAt || activity.firstAddedAt }
      return {
        ...normalized,
        authors: normalizeAuthors(plugin.author).map(({ name, slug }) => ({ name, slug })),
        high: source.highs[plugin.internalName] || null,
        growth: pluginGrowth(normalized, positions.get(plugin.internalName), snapshots, now),
        activity: {
          firstAddedAt: activity.firstAddedAt,
          lastUpdatedAt: activity.lastUpdatedAt,
          mergedUpdates: activity.mergedUpdates,
          updates90d: activity.updates90d,
        },
      }
    })
    .sort((left, right) => (right.installs ?? -1) - (left.installs ?? -1))
  const directory = plugins.map((plugin) => {
    return {
      internalName: plugin.internalName,
      displayName: plugin.displayName,
      author: plugin.author,
      description: plugin.description,
      tags: plugin.tags,
      installs: plugin.installs,
      high: plugin.high ? { count: plugin.high.count } : null,
      createdAt: plugin.createdAt,
      lastUpdatedAt: plugin.lastUpdatedAt,
      current: plugin.current,
      available: plugin.available,
      disabled: plugin.disabled,
      growth: Object.fromEntries(
        Object.entries(plugin.growth).map(([period, values]) => [
          period,
          Object.fromEntries(
            Object.entries(values).filter(([key, value]) => key !== 'current' && value !== null),
          ),
        ]),
      ),
    }
  })
  const directoryByIdentifier = new Map(directory.map((plugin) => [plugin.internalName, plugin]))
  const byIdentifier = new Map(plugins.map((plugin) => [plugin.internalName, plugin]))
  const growth = {
    thresholds: RANKING_THRESHOLDS,
    periods: Object.fromEntries(
      Object.keys(PERIODS).map((period) => [
        period,
        Object.fromEntries(
          Object.entries(rankPlugins(plugins, period, now)).map(([name, ranked]) => [
            name,
            ranked.map((plugin) => plugin.internalName),
          ]),
        ),
      ]),
    ),
  }
  const developersBySlug = new Map()
  for (const plugin of plugins)
    for (const author of plugin.authors) {
      if (!developersBySlug.has(author.slug))
        developersBySlug.set(author.slug, { ...author, plugins: [] })
      developersBySlug.get(author.slug).plugins.push(plugin)
    }
  const developers = [...developersBySlug.values()]
    .map((developer) => {
      const created = developer.plugins
        .map((plugin) => plugin.createdAt)
        .filter(Boolean)
        .sort()
      const updated = developer.plugins
        .map((plugin) => plugin.lastUpdatedAt)
        .filter(Boolean)
        .sort()
      return {
        name: developer.name,
        slug: developer.slug,
        pluginCount: developer.plugins.length,
        installs: developer.plugins.reduce((sum, plugin) => sum + (plugin.installs || 0), 0),
        growth: {
          '7d': combinedGrowth(developer.plugins, '7d'),
          '30d': combinedGrowth(developer.plugins, '30d'),
        },
        firstPublishedAt: created[0] || null,
        lastUpdatedAt: updated.at(-1) || null,
      }
    })
    .sort((left, right) => right.installs - left.installs)
  const totalHistory = [
    ...new Map(
      snapshots.map((row) => [
        snapshotTime(row),
        {
          timestamp: snapshotTime(row),
          total: row.counts.reduce((sum, count) => sum + (count || 0), 0),
        },
      ]),
    ).values(),
  ]
  const totalInstalls = plugins.reduce((sum, plugin) => sum + (plugin.installs || 0), 0)
  const baseline = totalHistory.findLast(
    (row) => Date.parse(row.timestamp) <= Date.parse(now) - 7 * DAY,
  )
  const active = plugins
    .filter((plugin) => plugin.current && plugin.activity.updates90d > 0)
    .sort((left, right) => right.activity.updates90d - left.activity.updates90d)
    .slice(0, 50)
  const stale = plugins
    .filter(
      (plugin) =>
        plugin.current &&
        (plugin.lastUpdatedAt || plugin.activity.lastUpdatedAt) &&
        Date.parse(plugin.lastUpdatedAt || plugin.activity.lastUpdatedAt) <
          Date.parse(now) - RANKING_THRESHOLDS.staleDays * DAY,
    )
    .sort((left, right) =>
      (left.lastUpdatedAt || left.activity.lastUpdatedAt).localeCompare(
        right.lastUpdatedAt || right.activity.lastUpdatedAt,
      ),
    )
  const summary = {
    syncedAt: source.current.syncedAt,
    githubSyncedAt: source.prState.syncedAt,
    version: source.current.version,
    historyStartedAt: totalHistory[0]?.timestamp || null,
    totalInstalls,
    pluginCount: plugins.filter((plugin) => plugin.inManifest).length,
    developerCount: developers.length,
    growth7d: baseline ? totalInstalls - baseline.total : null,
    hub: hub.stats,
    githubComplete: hub.complete,
    biggest: growth.periods['7d'].biggest
      .slice(0, 5)
      .map((identifier) => byIdentifier.get(identifier)),
    fastest: growth.periods['7d'].fastest
      .slice(0, 5)
      .map((identifier) => byIdentifier.get(identifier)),
    popular: plugins.filter((plugin) => plugin.inManifest).slice(0, 6),
    newest: plugins
      .filter((plugin) => plugin.inManifest && plugin.createdAt)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 5),
    totalHistory,
    weekly: hub.weekly.slice(-12),
  }
  const files = new Map([
    ['summary.json', summary],
    ['plugins.json', directory],
    ['growth.json', growth],
    ['developers.json', developers],
    [
      'hub/summary.json',
      {
        ...hub.stats,
        complete: hub.complete,
        syncedAt: source.prState.syncedAt,
        active: active.map((plugin) => ({
          internalName: plugin.internalName,
          displayName: plugin.displayName,
          activity: { updates90d: plugin.activity.updates90d },
        })),
        stale: stale.map((plugin) => directoryByIdentifier.get(plugin.internalName)),
        aliases: hub.aliases,
      },
    ],
    [
      'hub/weekly.json',
      hub.weekly.map(({ date, opened, merged, closed, added, removed, active }) => ({
        date,
        opened,
        merged,
        closed,
        added,
        removed,
        active,
      })),
    ],
    ['hub/backlog.json', hub.weekly.map(({ date, backlog }) => ({ date, backlog }))],
    [
      'hub/latency.json',
      hub.weekly.map(({ date, medianHours, p90Hours, resolved }) => ({
        date,
        medianHours,
        p90Hours,
        resolved,
      })),
    ],
    ['hub/authors.json', hub.authors],
  ])
  for (const plugin of plugins) {
    const position = positions.get(plugin.internalName)
    function points(rows) {
      return rows.map((row) => ({
        timestamp: snapshotTime(row),
        count: row.counts[position] ?? null,
      }))
    }
    files.set(`plugin/${plugin.internalName}.json`, {
      ...plugin,
      syncedAt: source.current.syncedAt,
      githubComplete: hub.complete,
      history: { recent: points(source.recent), daily: points(source.history) },
      development: {
        ...(hub.byPlugin.get(plugin.internalName) || emptyActivity()),
        recent: (hub.byPlugin.get(plugin.internalName)?.recent || []).slice(0, 30),
      },
    })
  }
  for (const developer of developers) {
    const owned = developersBySlug.get(developer.slug).plugins
    const activity = [
      ...new Map(
        owned
          .flatMap((plugin) => hub.byPlugin.get(plugin.internalName)?.recent || [])
          .map((record) => [record.number, record]),
      ).values(),
    ]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 30)
    files.set(`developer/${developer.slug}.json`, {
      ...developer,
      plugins: owned,
      recent: activity,
      githubComplete: hub.complete,
      mergedUpdates: owned.reduce((sum, plugin) => sum + plugin.activity.mergedUpdates, 0),
    })
  }
  return files
}
