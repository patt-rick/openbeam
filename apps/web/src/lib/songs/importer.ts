import { rtfToText } from "./rtf"
import {
  getOrCreateSongDb,
  openInMemoryFromFile,
  persistSongDb,
  clearSongLibrary,
} from "./sqlite"

export interface ImportProgress {
  phase: "reading" | "decoding" | "indexing" | "persisting" | "done"
  current: number
  total: number
}

export interface ImportResult {
  count: number
  skipped: number
  warnings: string[]
}

interface SourceSongRow {
  rowid: number
  title: string | null
  author: string | null
  copyright: string | null
  administrator: string | null
  tags: string | null
  reference_number: string | null
}

interface SourceWordRow {
  song_id: number
  words: string | null
}

const SCHEMA_SQL = `
DROP TABLE IF EXISTS songs_fts;
DROP TABLE IF EXISTS songs;

CREATE TABLE songs (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  copyright TEXT,
  reference_number TEXT,
  tags TEXT,
  lyrics TEXT NOT NULL
);

CREATE VIRTUAL TABLE songs_fts USING fts5(
  title,
  author,
  lyrics,
  content='songs',
  content_rowid='id',
  tokenize='porter unicode61'
);

CREATE TRIGGER songs_ai AFTER INSERT ON songs BEGIN
  INSERT INTO songs_fts(rowid, title, author, lyrics)
  VALUES (new.id, new.title, COALESCE(new.author, ''), new.lyrics);
END;
CREATE TRIGGER songs_ad AFTER DELETE ON songs BEGIN
  INSERT INTO songs_fts(songs_fts, rowid, title, author, lyrics)
  VALUES ('delete', old.id, old.title, COALESCE(old.author, ''), old.lyrics);
END;
CREATE TRIGGER songs_au AFTER UPDATE ON songs BEGIN
  INSERT INTO songs_fts(songs_fts, rowid, title, author, lyrics)
  VALUES ('delete', old.id, old.title, COALESCE(old.author, ''), old.lyrics);
  INSERT INTO songs_fts(rowid, title, author, lyrics)
  VALUES (new.id, new.title, COALESCE(new.author, ''), new.lyrics);
END;
`

function readSongs(metadataFile: File): Promise<{
  rows: SourceSongRow[]
  close: () => void
}> {
  return openInMemoryFromFile(metadataFile).then((db) => {
    const rows: SourceSongRow[] = []
    try {
      db.exec({
        sql: `SELECT rowid, title, author, copyright, administrator, tags, reference_number FROM song ORDER BY rowid`,
        rowMode: "object",
        callback: (row) => {
          rows.push(row as unknown as SourceSongRow)
        },
      })
    } catch (e) {
      try {
        db.close()
      } catch {}
      throw new Error(
        `Couldn't read song metadata. Expected a "song" table with title/author columns. (${(e as Error).message})`,
      )
    }
    return {
      rows,
      close: () => {
        try {
          db.close()
        } catch (e) {
          console.warn("[songs] close metadata DB failed:", e)
        }
      },
    }
  })
}

function readWords(lyricsFile: File): Promise<{
  byId: Map<number, string>
  close: () => void
}> {
  return openInMemoryFromFile(lyricsFile).then((db) => {
    const byId = new Map<number, string>()
    try {
      db.exec({
        sql: `SELECT song_id, words FROM word`,
        rowMode: "object",
        callback: (row) => {
          const r = row as unknown as SourceWordRow
          if (r.song_id != null && r.words) byId.set(r.song_id, r.words)
        },
      })
    } catch (e) {
      try {
        db.close()
      } catch {}
      throw new Error(
        `Couldn't read lyrics. Expected a "word" table with song_id and words columns. (${(e as Error).message})`,
      )
    }
    return {
      byId,
      close: () => {
        try {
          db.close()
        } catch (e) {
          console.warn("[songs] close lyrics DB failed:", e)
        }
      },
    }
  })
}

export async function importSongLibrary(
  metadataFile: File,
  lyricsFile: File,
  onProgress?: (p: ImportProgress) => void,
): Promise<ImportResult> {
  onProgress?.({ phase: "reading", current: 0, total: 1 })

  const [songsResult, wordsResult] = await Promise.all([
    readSongs(metadataFile),
    readWords(lyricsFile),
  ])

  try {
    const songs = songsResult.rows
    const total = songs.length

    // Start with a fresh target DB.
    await clearSongLibrary()
    const targetDb = await getOrCreateSongDb()

    targetDb.exec(SCHEMA_SQL)
    targetDb.exec("BEGIN TRANSACTION")

    const warnings: string[] = []
    let skipped = 0
    let imported = 0

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i]
      if (i % 25 === 0) {
        onProgress?.({ phase: "decoding", current: i, total })
        await Promise.resolve()
      }

      const rtf = wordsResult.byId.get(song.rowid)
      if (!rtf) {
        warnings.push(`song "${song.title ?? `#${song.rowid}`}" has no lyrics row`)
        skipped++
        continue
      }

      let lyrics: string
      try {
        lyrics = rtfToText(rtf)
      } catch (e) {
        warnings.push(`song "${song.title ?? `#${song.rowid}`}" RTF decode failed: ${(e as Error).message}`)
        skipped++
        continue
      }

      if (!song.title || !lyrics.trim()) {
        skipped++
        continue
      }

      targetDb.exec({
        sql: `INSERT INTO songs (id, title, author, copyright, reference_number, tags, lyrics) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        bind: [
          song.rowid,
          song.title,
          song.author,
          song.copyright,
          song.reference_number,
          song.tags,
          lyrics,
        ],
      })
      imported++
    }

    onProgress?.({ phase: "indexing", current: total, total })
    targetDb.exec("COMMIT")

    onProgress?.({ phase: "persisting", current: total, total })
    await persistSongDb(targetDb, {
      count: imported,
      imported_at: Date.now(),
    })

    onProgress?.({ phase: "done", current: total, total })

    return { count: imported, skipped, warnings }
  } finally {
    songsResult.close()
    wordsResult.close()
  }
}
