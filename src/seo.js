const siteName = 'RuneLite Hub Stats'

export function pageMetadata(route, data) {
  let { title, description = '' } = route.meta
  if (route.name === 'plugin' && data) {
    if (data.installs === null && !data.high) {
      title = `${data.displayName} Plugin Hub history`
      description = `View the recorded RuneLite Plugin Hub history and update activity for ${data.displayName}.`
    } else {
      title = `${data.displayName} install stats`
      description = `Track active installs, historical highs, install growth and updates for ${data.displayName} on the RuneLite Plugin Hub.`
    }
  }
  if (route.name === 'developer' && data) {
    title = `${data.name} plugin stats`
    description = `Explore RuneLite Plugin Hub releases, active installs and growth across plugins by ${data.name}.`
  }
  const url = new URL(
    `${import.meta.env.BASE_URL}${route.path.slice(1)}`,
    import.meta.env.PAGES_ORIGIN,
  ).href
  return { title: route.name === 'home' ? title : `${title} | ${siteName}`, description, url }
}

export function updatePageMetadata(route, data) {
  const { title, description, url } = pageMetadata(route, data)
  document.title = title
  document.querySelector('meta[name="description"]').content = description
  document.querySelector('meta[property="og:title"]').content = title
  document.querySelector('meta[property="og:description"]').content = description
  document.querySelector('meta[property="og:url"]').content = url
  document.querySelector('link[rel="canonical"]').href = url
}
