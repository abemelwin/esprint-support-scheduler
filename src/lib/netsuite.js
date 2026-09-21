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
//
// `pastedText` is the plain-text that was pasted (usually the case /
// record number, e.g. "4895"). When several anchors exist in the copied
// HTML we prefer the one whose URL actually references that number, so
// different pasted rows don't all resolve to the same (first) link.
export function extractHrefFromHtml(html, pastedText = '') {
  if (!html) return ''

  const hrefs = []
  const re = /<a[^>]+href=["']([^"']+)["']/gi
  let m
  while ((m = re.exec(html)) !== null) hrefs.push(decodeHtmlEntities(m[1]))
  if (hrefs.length === 0) return ''

  const isAbsolute = u => /^https?:\/\//i.test(u)
  const isNetsuite = u => isAbsolute(u) && /netsuite\.com/i.test(u)

  // 1) Best match: a NetSuite URL whose record number EXACTLY equals the
  //    pasted number. We match against whole query-param values (e.g.
  //    "...=7420") using word boundaries so "742" never matches "7428".
  const token = String(pastedText).trim()
  if (token && /^\w+$/.test(token)) {
    const exact = new RegExp('(?<![\\w])' + token + '(?![\\w])')
    const byExact = hrefs.find(u => isNetsuite(u) && exact.test(u))
    if (byExact) return byExact
    const anyExact = hrefs.find(u => isAbsolute(u) && exact.test(u))
    if (anyExact) return anyExact
  }

  // 2) Otherwise the first absolute NetSuite URL.
  const netsuite = hrefs.find(isNetsuite)
  if (netsuite) return netsuite

  // 3) Any absolute link.
  const firstAbsolute = hrefs.find(isAbsolute)
  if (firstAbsolute) return firstAbsolute

  // 4) Relative link paired with a NetSuite base domain if present.
  const relative = hrefs[0]
  const baseMatch = html.match(/https?:\/\/[a-z0-9.\-]*netsuite\.com/i)
  if (baseMatch) return baseMatch[0] + (relative.startsWith('/') ? relative : '/' + relative)

  return relative
}
