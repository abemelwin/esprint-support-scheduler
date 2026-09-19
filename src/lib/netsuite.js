// Helpers for capturing and cleaning NetSuite hyperlinks.

// Decode HTML entities (e.g. "&amp;" → "&") that the clipboard encodes
// inside href attributes. NetSuite URLs use many "&" query separators;
// leaving them encoded breaks the query params and opens the wrong page.
export function decodeHtmlEntities(str) {
  if (!str) return str
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}

// Normalise a stored URL for safe opening: decode entities and trim.
// Safe to call on already-clean URLs.
export function cleanNetsuiteUrl(url) {
  if (!url) return ''
  return decodeHtmlEntities(url).trim()
}

// Extract the best NetSuite record link from pasted clipboard HTML.
export function extractHrefFromHtml(html) {
  if (!html) return ''

  const hrefs = []
  const re = /<a[^>]+href=["']([^"']+)["']/gi
  let m
  while ((m = re.exec(html)) !== null) hrefs.push(decodeHtmlEntities(m[1]))
  if (hrefs.length === 0) return ''

  const isAbsolute = u => /^https?:\/\//i.test(u)

  const netsuite = hrefs.find(u => isAbsolute(u) && /netsuite\.com/i.test(u))
  if (netsuite) return netsuite

  const firstAbsolute = hrefs.find(isAbsolute)
  if (firstAbsolute) return firstAbsolute

  const relative = hrefs[0]
  const baseMatch = html.match(/https?:\/\/[a-z0-9.\-]*netsuite\.com/i)
  if (baseMatch) return baseMatch[0] + (relative.startsWith('/') ? relative : '/' + relative)

  return relative
}
