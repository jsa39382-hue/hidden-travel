/** FCDO 'warnings-and-insurance' 본문(HTML)에서 '여행 자제 지역' 부분만 글자로 뽑는다 (최대 900자) */
export function extractAreas(html: string): string | null {
  const text = html
    .replace(/<\/(p|li|h\d)>/g, '\n')
    .replace(/<li[^>]*>/g, '· ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
  const start = text.search(/Areas where\s+FCDO\s+advises against/i)
  if (start < 0) return null
  let body = text.slice(start)
  const end = body.search(/Find out more about\s+why/i)
  if (end > 0) body = body.slice(0, end)
  body = body
    .replace(/^Areas where\s+FCDO\s+advises against travel\s*/i, '')
    .replace(/Your travel insurance could be invalidated[^\n]*\n?/gi, '')
    .trim()
  return body.length > 900 ? body.slice(0, 900).replace(/\s+\S*$/, '') + ' …' : body
}
