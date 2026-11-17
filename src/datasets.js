export function datasetsForPath(path) {
  // The HTML preload script also uses this function before the app loads.
  const detail = path.match(/^\/(plugin|developer)\/([^/]+)\/?$/)
  if (detail) return [`${detail[1]}/${detail[2]}.json`]

  return (
    {
      '/': ['summary.json'],
      '/plugins': ['plugins.json'],
      '/growth': ['plugins.json', 'growth.json'],
      '/developers': ['developers.json'],
      '/hub': [
        'hub/summary.json',
        'hub/weekly.json',
        'hub/backlog.json',
        'hub/latency.json',
        'hub/authors.json',
      ],
    }[path.replace(/\/$/, '') || '/'] || []
  )
}
