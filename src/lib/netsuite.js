// Helpers for capturing and cleaning NetSuite hyperlinks.

// Decode HTML entities (e.g. "&amp;" → "&") that the clipboard encodes
// inside href attributes. NetSuite URLs use many "&" query separators;
// leaving them encoded breaks the query params and opens the wrong page.
export function decodeHtmlEntities(str) {
  if (!str) return ''
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
}

// Normalise a stored URL for safe opening: decode entities, trim, and ensure
// it starts with an absolute https:// URL pointing to NetSuite.
// Relative paths like "/app/crm/..." are automatically prefixed with
// "https://system.netsuite.com" so clicking the link actually redirects
// to Oracle NetSuite instead of 404ing on the scheduler's own host.
export function cleanNetsuiteUrl(url) {
  if (!url) return ''
  let u = decodeHtmlEntities(url).trim()
  if (!u) return ''

  // If already absolute http/https
  if (/^https?:\/\//i.test(u)) {
    return u
  }

  // If starts with /app/ or app/
  if (u.startsWith('/')) {
    return 'https://system.netsuite.com' + u
  }
  if (u.startsWith('app/')) {
    return 'https://system.netsuite.com/' + u
  }

  // If domain without protocol (e.g. "12345.app.netsuite.com/app/...")
  if (/netsuite\.com/i.test(u)) {
    return 'https://' + u
  }

  return u
}

// Extract the best NetSuite record link from pasted clipboard HTML and text.
//
// `pastedText` is the plain-text that was pasted (e.g. "4895" or a full URL).
export function extractHrefFromHtml(html, pastedText = '') {
  const plain = String(pastedText || '').trim()

  // 1) If the plain text itself is a full URL or NetSuite path
  if (/^https?:\/\//i.test(plain) || /netsuite\.com/i.test(plain) || plain.startsWith('/app/')) {
    return cleanNetsuiteUrl(plain)
  }

  if (!html) return ''

  // Extract base domain if present in copied HTML (e.g. https://123456.app.netsuite.com)
  const baseMatch = html.match(/https?:\/\/[a-z0-9.\-]*netsuite\.com/i)
  const baseDomain = baseMatch ? baseMatch[0] : 'https://system.netsuite.com'

  // Parse all <a> tags with their href and inner text content
  const anchors = []
  const aRegex = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match
  while ((match = aRegex.exec(html)) !== null) {
    const rawHref = decodeHtmlEntities(match[1]).trim()
    const innerText = match[2].replace(/<[^>]+>/g, '').trim()
    anchors.push({
      href: rawHref,
      text: innerText,
    })
  }

  // Fallback regex in case <a> tag was not closed normally
  if (anchors.length === 0) {
    const hrefOnlyRegex = /<a\b[^>]*\bhref=["']([^"']+)["']/gi
    while ((match = hrefOnlyRegex.exec(html)) !== null) {
      anchors.push({
        href: decodeHtmlEntities(match[1]).trim(),
        text: '',
      })
    }
  }

  if (anchors.length === 0) return ''

  function toAbsolute(url) {
    if (!url) return ''
    if (/^https?:\/\//i.test(url)) return url
    if (url.startsWith('/')) return baseDomain + url
    return baseDomain + '/' + url
  }

  // Priority 1: An anchor whose innerText matches the pasted text
  if (plain) {
    const exactTextAnchor = anchors.find(a => {
      const aText = a.text.toLowerCase()
      const pText = plain.toLowerCase()
      return aText === pText || aText.includes(pText) || pText.includes(aText)
    })
    if (exactTextAnchor && exactTextAnchor.href) {
      return toAbsolute(exactTextAnchor.href)
    }

    // Priority 2: An anchor whose URL contains the pasted number (e.g. id=4895)
    const exactNumberAnchor = anchors.find(a => {
      const u = a.href
      const regex = new RegExp(`[?&](id|searchid|record|case|no)=${plain}\\b`, 'i')
      return regex.test(u) || u.includes(plain)
    })
    if (exactNumberAnchor && exactNumberAnchor.href) {
      return toAbsolute(exactNumberAnchor.href)
    }
  }

  // Priority 3: First NetSuite-specific anchor (/app/ or netsuite.com)
  const netsuiteAnchor = anchors.find(a => /netsuite\.com/i.test(a.href) || a.href.startsWith('/app/'))
  if (netsuiteAnchor && netsuiteAnchor.href) {
    return toAbsolute(netsuiteAnchor.href)
  }

  // Priority 4: First absolute link
  const absoluteAnchor = anchors.find(a => /^https?:\/\//i.test(a.href))
  if (absoluteAnchor && absoluteAnchor.href) {
    return absoluteAnchor.href
  }

  // Priority 5: Fallback to first anchor
  return toAbsolute(anchors[0].href)
}

