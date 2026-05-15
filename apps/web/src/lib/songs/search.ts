import { loadSongDb } from "./sqlite"
import type { Song, SongSearchResult } from "@/types/song"

function escapeFts(query: string): string {
  // FTS5 query syntax: wrap each non-empty token in double quotes (which themselves are escaped by doubling),
  // and append a '*' for prefix matching on the last token. This keeps the user input safe — special FTS
  // characters like AND/OR/NEAR are treated as plain words.
  const tokens = query
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}'-]/gu, ""))
    .filter((t) => t.length > 0)
  if (tokens.length === 0) return ""
  const quoted = tokens.map((t, i) => {
    const safe = t.replace(/"/g, '""')
    return i === tokens.length - 1 ? `"${safe}"*` : `"${safe}"`
  })
  return quoted.join(" ")
}

export async function searchSongs(query: string, limit = 50): Promise<SongSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const db = await loadSongDb()
  if (!db) return []

  const ftsQuery = escapeFts(trimmed)
  if (!ftsQuery) return []

  const results: SongSearchResult[] = []
  try {
    db.exec({
      sql: `
        SELECT
          s.id, s.title, s.author, s.copyright, s.reference_number, s.tags, s.lyrics,
          snippet(songs_fts, 2, '<mark>', '</mark>', '…', 12) AS snippet
        FROM songs_fts
        JOIN songs s ON s.id = songs_fts.rowid
        WHERE songs_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `,
      bind: [ftsQuery, limit],
      rowMode: "object",
      callback: (row) => {
        const r = row as unknown as Song & { snippet: string }
        const { snippet, ...song } = r
        results.push({ song, snippet })
      },
    })
  } catch (e) {
    console.error("[songs] search failed:", e)
    return []
  }
  return results
}

export async function getSongById(id: number): Promise<Song | null> {
  const db = await loadSongDb()
  if (!db) return null
  let found: Song | null = null
  db.exec({
    sql: `SELECT id, title, author, copyright, reference_number, tags, lyrics FROM songs WHERE id = ?`,
    bind: [id],
    rowMode: "object",
    callback: (row) => {
      found = row as unknown as Song
    },
  })
  return found
}
