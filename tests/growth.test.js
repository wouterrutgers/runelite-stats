import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDatasets } from '../scripts/lib/analytics.js'

test('daily growth and rankings tolerate small collection timing differences', () => {
  const datasets = buildDatasets({
    index: ['example'],
    current: {
      syncedAt: '2026-11-17T12:01:37.383Z',
      plugins: [
        {
          internalName: 'example',
          displayName: 'Example',
          author: '',
          tags: [],
          installs: 100,
          current: true,
          createdAt: '2026-09-01T00:00:00.000Z',
        },
      ],
    },
    recent: [
      { timestamp: '2026-11-16T06:01:31.412Z', counts: [80] },
      { timestamp: '2026-11-16T12:01:39.150Z', counts: [120] },
      { timestamp: '2026-11-16T18:02:03.404Z', counts: [130] },
    ],
    history: [],
    highs: {},
    prs: [],
    prState: { syncedAt: null, complete: false },
  })

  assert.equal(datasets.get('plugin/example.json').growth['24h'].change, -20)
  assert.equal(datasets.get('plugins.json')[0].growth['24h'].change, -20)
  assert.deepEqual(datasets.get('growth.json').periods['24h'].decline, ['example'])
  assert.deepEqual(datasets.get('growth.json').periods['24h'].biggest, [])
})
