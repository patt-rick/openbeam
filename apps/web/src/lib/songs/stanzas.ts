export interface Stanza {
  label: string | null
  text: string
}

const LABEL_RE = /^(verse|chorus|pre[\s-]?chorus|bridge|tag|refrain|intro|outro|ending|interlude|coda|vamp)(\s*\d+)?\s*[:.]?\s*$/i

/** Target maximum source lines per displayable page. Long stanzas get split into balanced chunks. */
const MAX_LINES_PER_PAGE = 4

/** Splits a list of source lines into balanced pages, each ≤ MAX_LINES_PER_PAGE. */
function paginateLines(lines: string[]): string[][] {
  if (lines.length <= MAX_LINES_PER_PAGE) return [lines]
  const numPages = Math.ceil(lines.length / MAX_LINES_PER_PAGE)
  const perPage = Math.ceil(lines.length / numPages)
  const pages: string[][] = []
  for (let i = 0; i < lines.length; i += perPage) {
    pages.push(lines.slice(i, i + perPage))
  }
  return pages
}

/**
 * Splits a song's plain-text lyrics into stanzas.
 *
 * Stanzas are separated by one or more blank lines in the lyrics. When the first non-empty line of
 * a stanza is a recognizable label ("Verse 1", "Chorus", "Bridge 2", …), the label is lifted out so
 * callers can show it as section metadata rather than render it as a lyric line.
 */
export function parseLyrics(lyrics: string): Stanza[] {
  let chunks = lyrics
    .split(/\n\s*\n+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0)

  // Fallback for lyrics that arrived without blank-line stanza breaks (e.g. an older RTF decoder
  // that collapsed empty paragraphs). If we got a single big chunk but it contains label lines
  // somewhere in the middle, re-split on those.
  if (chunks.length === 1) {
    const lines = chunks[0].split("\n")
    const labelIndexes = lines
      .map((l, i) => (LABEL_RE.test(l.trim()) ? i : -1))
      .filter((i) => i >= 0)
    if (labelIndexes.length >= 2 || (labelIndexes.length === 1 && labelIndexes[0] > 0)) {
      const boundaries = [0, ...labelIndexes]
      const dedup = Array.from(new Set(boundaries)).sort((a, b) => a - b)
      chunks = dedup
        .map((start, i) => {
          const end = dedup[i + 1] ?? lines.length
          return lines.slice(start, end).join("\n").trim()
        })
        .filter((c) => c.length > 0)
    }
  }

  const stanzas: Stanza[] = []
  for (const chunk of chunks) {
    const lines = chunk.split("\n")
    const first = lines[0]?.trim() ?? ""
    const hasLabel = LABEL_RE.test(first) && lines.length > 1
    const label = hasLabel ? first : null
    const contentLines = hasLabel ? lines.slice(1) : lines

    const pages = paginateLines(contentLines)
    pages.forEach((pageLines, pageIdx) => {
      const labelForPage =
        label && pages.length > 1
          ? `${label} (${pageIdx + 1}/${pages.length})`
          : label
      stanzas.push({
        label: labelForPage,
        text: pageLines.join("\n").trim(),
      })
    })
  }
  return stanzas
}
