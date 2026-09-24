import path from 'node:path'
import { atomicJson, readJson, ROOT } from './storage.js'
import { DAY, PLUGIN_PATH, requireValue } from './config.js'
import { fetchChecked } from './runelite.js'

export function normalizePullRequest(record) {
  requireValue(
    record.files &&
      !record.files.pageInfo.hasNextPage &&
      record.files.nodes.length === record.files.totalCount &&
      new Set(record.files.nodes.map((file) => file.path)).size === record.changedFiles,
    `PR #${record.number} changed file data is incomplete (${record.files?.nodes.length ?? 0}/${record.changedFiles}). Sync state has not advanced.`,
  )
  return {
    number: record.number,
    title: record.title,
    author: record.author?.login || null,
    state: record.state,
    createdAt: record.createdAt,
    closedAt: record.closedAt,
    mergedAt: record.mergedAt,
    updatedAt: record.updatedAt,
    changedFiles: record.changedFiles,
    fileRecords: record.files.nodes.length,
    files: record.files.nodes,
  }
}

export function upsertPullRequests(previous, records) {
  const ledger = new Map(previous.map((record) => [record.number, record]))
  for (const record of records) {
    const existing = ledger.get(record.number)
    if (!existing || Date.parse(record.updatedAt) >= Date.parse(existing.updatedAt))
      ledger.set(record.number, record)
  }
  return [...ledger.values()].sort((left, right) => left.number - right.number)
}

export function pluginFileChanges(record) {
  const grouped = new Map()
  for (const file of record.files.filter((file) => PLUGIN_PATH.test(file.path))) {
    if (!grouped.has(file.path)) grouped.set(file.path, [])
    grouped.get(file.path).push(file)
  }
  return [...grouped.values()].map((files) =>
    files.some((file) => file.changeType === 'ADDED') &&
    files.some((file) => file.changeType === 'DELETED')
      ? { ...files[0], changeType: 'MODIFIED' }
      : files[0],
  )
}

export function classifyPullRequest(record) {
  const files = pluginFileChanges(record)
  const additions = files.filter((file) => file.changeType === 'ADDED')
  const deletions = files.filter((file) => file.changeType === 'DELETED')
  const rename =
    record.state === 'MERGED' &&
    additions.length === 1 &&
    deletions.length === 1 &&
    /\brenam(?:e|ed|ing)\b/i.test(record.title)
      ? {
          from: deletions[0].path.slice(8),
          to: additions[0].path.slice(8),
          number: record.number,
          at: record.mergedAt,
        }
      : null
  return {
    rename,
    changes: files.map((file) => ({
      internalName: file.path.slice(8),
      type:
        rename && [rename.from, rename.to].includes(file.path.slice(8))
          ? 'renamed'
          : {
              ADDED: 'added',
              DELETED: 'removed',
              MODIFIED: 'updated',
              RENAMED: 'renamed',
              COPIED: 'added',
              CHANGED: 'updated',
              UNCHANGED: 'unchanged',
            }[file.changeType],
      merged: record.state === 'MERGED',
    })),
  }
}

export const PULL_REQUEST_QUERY = `query($cursor: String, $order: IssueOrder!) {
  repository(owner: "runelite", name: "plugin-hub") {
    pullRequests(first: 50, after: $cursor, orderBy: $order) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        number title state createdAt closedAt mergedAt updatedAt changedFiles
        author { login }
        files(first: 100) { totalCount pageInfo { hasNextPage endCursor } nodes { path additions deletions changeType } }
      }
    }
  }
  rateLimit { cost remaining resetAt }
}`

async function graphql(query, variables, token) {
  const response = await fetchChecked('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const body = await response.json()
  requireValue(
    !body.errors?.length,
    `GitHub GraphQL failed: ${body.errors?.map((error) => error.message).join('; ')}`,
  )
  return body.data
}

export async function completePullRequestFiles(record, fetchNext) {
  while (record.files.pageInfo.hasNextPage) {
    const cursor = record.files.pageInfo.endCursor
    requireValue(cursor, `PR #${record.number} files are missing a cursor`)
    const next = await fetchNext(record.number, cursor)
    requireValue(
      next &&
        next.updatedAt === record.updatedAt &&
        next.changedFiles === record.changedFiles &&
        next.files.totalCount === record.files.totalCount,
      `PR #${record.number} changed during file pagination; retry the sync`,
    )
    requireValue(
      next.files.nodes.length > 0 &&
        (!next.files.pageInfo.hasNextPage || next.files.pageInfo.endCursor !== cursor),
      'Changed file pagination did not advance',
    )
    record = {
      ...record,
      files: { ...next.files, nodes: [...record.files.nodes, ...next.files.nodes] },
    }
  }
  requireValue(
    new Set(record.files.nodes.map((file) => `${file.path}:${file.changeType}`)).size ===
      record.files.nodes.length,
    `PR #${record.number} has duplicate file change records`,
  )
  normalizePullRequest(record)
  return record
}

export async function githubPage(cursor, full, token) {
  const data = await graphql(
    PULL_REQUEST_QUERY,
    {
      cursor,
      order: { field: full ? 'CREATED_AT' : 'UPDATED_AT', direction: full ? 'ASC' : 'DESC' },
    },
    token,
  )
  requireValue(data?.repository?.pullRequests, 'GitHub omitted the PR connection')
  const page = data.repository.pullRequests
  for (let position = 0; position < page.nodes.length; position++) {
    page.nodes[position] = await completePullRequestFiles(
      page.nodes[position],
      async (number, after) => {
        const extra = await graphql(
          `
            query ($number: Int!, $after: String!) {
              repository(owner: "runelite", name: "plugin-hub") {
                pullRequest(number: $number) {
                  updatedAt
                  changedFiles
                  files(first: 100, after: $after) {
                    totalCount
                    pageInfo {
                      hasNextPage
                      endCursor
                    }
                    nodes {
                      path
                      additions
                      deletions
                      changeType
                    }
                  }
                }
              }
            }
          `,
          { number, after },
          token,
        )
        return extra.repository.pullRequest
      },
    )
  }
  return { ...page, rateLimit: data.rateLimit }
}

async function incremental(ledger, watermark, token, fetchPage) {
  const cutoff = Date.parse(watermark) - 2 * DAY
  let cursor = null
  let records = []
  do {
    const page = await fetchPage(cursor, false, token)
    requireValue(
      page.nodes.length > 0 || page.totalCount === 0,
      'GitHub returned an unexpectedly empty PR page',
    )
    records.push(...page.nodes.map(normalizePullRequest))
    if (
      !page.pageInfo.hasNextPage ||
      page.nodes.every((record) => Date.parse(record.updatedAt) < cutoff)
    )
      break
    requireValue(
      page.pageInfo.endCursor && page.pageInfo.endCursor !== cursor,
      'GitHub pagination did not advance',
    )
    cursor = page.pageInfo.endCursor
  } while (cursor)
  return upsertPullRequests(ledger, records)
}

export async function collectGitHub(
  source,
  {
    token = process.env.GITHUB_TOKEN,
    fetchPage = githubPage,
    checkpointPath = path.join(ROOT, '.cache', 'github-backfill.json'),
  } = {},
) {
  requireValue(
    token,
    'GITHUB_TOKEN is required for PR synchronization. RuneLite sync works without it.',
  )
  const startedAt = new Date().toISOString()
  let ledger
  if (source.prState.complete) {
    ledger = await incremental(source.prs, source.prState.syncedAt, token, fetchPage)
  } else {
    let checkpoint = await readJson(checkpointPath, {
      startedAt,
      cursor: null,
      records: [],
      expectedTotal: 0,
      finished: false,
    })
    requireValue(
      Array.isArray(checkpoint.records) && Number.isFinite(Date.parse(checkpoint.startedAt)),
      'Invalid scratch backfill checkpoint',
    )
    // Scratch checkpoints can resume expensive backfills. They are never published as a partial ledger.
    while (!checkpoint.finished) {
      const page = await fetchPage(checkpoint.cursor, true, token)
      requireValue(page.totalCount > 0 && page.nodes.length > 0, 'Empty GitHub backfill response')
      const records = page.nodes.map(normalizePullRequest)
      requireValue(
        !page.pageInfo.hasNextPage ||
          (page.pageInfo.endCursor && page.pageInfo.endCursor !== checkpoint.cursor),
        'GitHub pagination did not advance',
      )
      checkpoint = {
        startedAt: checkpoint.startedAt,
        records: upsertPullRequests(checkpoint.records, records),
        expectedTotal: page.totalCount,
        cursor: page.pageInfo.endCursor,
        finished: !page.pageInfo.hasNextPage,
      }
      await atomicJson(checkpointPath, checkpoint)
      console.log(
        `GitHub backfill: ${checkpoint.records.length}/${checkpoint.expectedTotal}; API budget ${page.rateLimit?.remaining ?? 'unknown'}`,
      )
      if (
        !checkpoint.finished &&
        page.rateLimit &&
        page.rateLimit.remaining < page.rateLimit.cost + 10
      )
        throw new Error(
          `GitHub API budget is low. Retry after ${page.rateLimit.resetAt}; the scratch checkpoint is preserved, source data and sync state are unchanged.`,
        )
    }
    requireValue(
      checkpoint.records.length === checkpoint.expectedTotal,
      'Historical backfill count did not match GitHub',
    )
    ledger = await incremental(checkpoint.records, checkpoint.startedAt, token, fetchPage)
  }
  requireValue(
    ledger.length >= source.prs.length,
    'PR synchronization would discard existing records',
  )
  console.log(`GitHub: validated ${ledger.length} PRs`)
  return {
    ...source,
    prs: ledger,
    prState: {
      complete: true,
      syncedAt: startedAt,
      count: ledger.length,
      repository: 'runelite/plugin-hub',
    },
  }
}
