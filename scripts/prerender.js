import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { datasetsForPath, renderPage, routes } from '../.cache/prerender/render.js'
import { exists, ROOT } from './lib/storage.js'

const output = path.join(ROOT, 'dist')
const dataDirectory = path.join(output, 'data')
const template = await readFile(path.join(output, 'index.html'), 'utf8')
const metadataPlaceholder = /<!-- page metadata -->[\s\S]*?<!-- end page metadata -->/
const appPlaceholder = '<div id="app"></div>'
if (!metadataPlaceholder.test(template) || !template.includes(appPlaceholder))
  throw new Error('The built HTML template is missing its page metadata or app placeholder.')

async function readDataset(filename) {
  return JSON.parse(await readFile(path.join(dataDirectory, decodeURIComponent(filename)), 'utf8'))
}

function escapeMarkup(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return value.replace(/[&<>"']/g, (character) => entities[character])
}

function renderHead(metadata, notFound) {
  const title = escapeMarkup(metadata.title)
  if (notFound) return `<title>${title}</title>\n    <meta name="robots" content="noindex" />`

  const description = escapeMarkup(metadata.description)
  const url = escapeMarkup(metadata.url)
  return `<title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />`
}

async function writePage(pagePath, filename, notFound = false) {
  const datasets = new Map()
  for (const dataset of datasetsForPath(pagePath)) datasets.set(dataset, await readDataset(dataset))

  const { body, metadata } = await renderPage(pagePath, datasets)
  const html = (notFound ? template.replace(/<script\b[\s\S]*?<\/script>/g, '') : template)
    .replace(metadataPlaceholder, () => renderHead(metadata, notFound))
    .replace(appPlaceholder, () => `<div id="app">${body}</div>`)

  await mkdir(path.dirname(filename), { recursive: true })
  await writeFile(filename, html)
  return metadata.url
}

const pages = routes.filter((route) => !route.path.includes(':')).map((route) => route.path)
for (const type of ['plugin', 'developer']) {
  const directory = path.join(dataDirectory, type)
  if (!(await exists(directory))) continue
  for (const filename of await readdir(directory)) {
    pages.push(`/${type}/${encodeURIComponent(path.basename(filename, '.json'))}`)
  }
}

const sitemapEntries = []
for (const pagePath of pages) {
  const filename = path.join(
    output,
    pagePath === '/' ? 'index.html' : `${decodeURIComponent(pagePath.slice(1))}.html`,
  )
  const url = await writePage(pagePath, filename)
  sitemapEntries.push(`  <url><loc>${escapeMarkup(url)}</loc></url>`)
}

await writePage('/404.html', path.join(output, '404.html'), true)
await writeFile(
  path.join(output, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</urlset>
`,
)
console.log(`Prerendered ${pages.length} pages and generated the sitemap.`)
