import type { Translation, Book, Verse } from "@/types"
import { BOOKS, matchBook } from "./ocr-parser"

const DB_NAME = "openbeam-local-translations"
const DB_VERSION = 1
const STORE = "translations"

export interface CustomTranslationFile {
  abbreviation: string
  title: string
  language: string
  books: Array<{
    book_number: number
    name: string
    abbreviation: string
    testament: "OT" | "NT"
    chapters: Array<{
      chapter: number
      verses: Array<{ verse: number; text: string }>
    }>
  }>
}

interface StoredTranslation {
  id: number
  abbreviation: string
  title: string
  language: string
  data: CustomTranslationFile
}

export const isLocalTranslationId = (id: number) => id < 0

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode)
    const store = transaction.objectStore(STORE)
    const result = fn(store)
    if (result instanceof IDBRequest) {
      result.onsuccess = () => resolve(result.result as T)
      result.onerror = () => reject(result.error)
    } else {
      result.then(resolve, reject)
    }
    transaction.onerror = () => reject(transaction.error)
  })
}

export function validateTranslationFile(raw: unknown): CustomTranslationFile {
  if (!raw || typeof raw !== "object") throw new Error("Not a JSON object")
  const f = raw as Partial<CustomTranslationFile>
  if (!f.abbreviation || !f.title || !f.language)
    throw new Error("Missing abbreviation, title, or language")
  if (!Array.isArray(f.books) || f.books.length === 0)
    throw new Error("books array is empty")
  for (const b of f.books) {
    if (
      typeof b.book_number !== "number" ||
      typeof b.name !== "string" ||
      !Array.isArray(b.chapters)
    )
      throw new Error(`Invalid book: ${JSON.stringify(b).slice(0, 80)}`)
  }
  return f as CustomTranslationFile
}

export interface JsonImportReport {
  format: "canonical" | "nested-book-chapter-verse"
  books: number
  chapters: number
  verses: number
  unknownBooks: string[]
}

/** Title-case + initials from a filename like "NEW INTERNATIONAL VERSION.json". */
export function deriveMetaFromFilename(filename: string): {
  abbreviation: string
  title: string
  language: string
} {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim()
  const words = base.split(/\s+/).filter(Boolean)
  const title = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
  const abbreviation = words
    .filter((w) => /^[a-z]/i.test(w))
    .map((w) => w[0].toUpperCase())
    .join("")
  return { abbreviation: abbreviation || "CUSTOM", title: title || "Custom", language: "en" }
}

/**
 * Parse a Bible JSON file in either OpenBeam's canonical shape or the common
 * nested `{ "Genesis": { "1": { "1": "In the beginning..." } } }` shape.
 * Metadata (abbreviation/title/language) is taken from the file when present,
 * otherwise from `fallback` (typically derived from the filename).
 */
export function parseTranslationJson(
  raw: unknown,
  fallback: { abbreviation: string; title: string; language: string },
): { file: CustomTranslationFile; report: JsonImportReport } {
  if (!raw || typeof raw !== "object") throw new Error("Not a JSON object")

  // Canonical shape: { abbreviation, title, language, books: [...] }
  const maybeCanonical = raw as Partial<CustomTranslationFile>
  if (Array.isArray(maybeCanonical.books)) {
    const file = validateTranslationFile({
      abbreviation: maybeCanonical.abbreviation || fallback.abbreviation,
      title: maybeCanonical.title || fallback.title,
      language: maybeCanonical.language || fallback.language,
      books: maybeCanonical.books,
    })
    let chapters = 0
    let verses = 0
    for (const b of file.books) {
      chapters += b.chapters.length
      for (const c of b.chapters) verses += c.verses.length
    }
    return {
      file,
      report: { format: "canonical", books: file.books.length, chapters, verses, unknownBooks: [] },
    }
  }

  // Nested shape: { [bookName]: { [chapter]: { [verse]: text } } }
  const nested = raw as Record<string, unknown>
  const books: CustomTranslationFile["books"] = []
  const unknownBooks: string[] = []
  let totalChapters = 0
  let totalVerses = 0

  for (const [bookName, chaptersObj] of Object.entries(nested)) {
    if (!chaptersObj || typeof chaptersObj !== "object" || Array.isArray(chaptersObj)) continue
    const def = matchBook(bookName) ?? BOOKS.find((b) => b.name.toLowerCase() === bookName.toLowerCase())
    if (!def) {
      unknownBooks.push(bookName)
      continue
    }
    const chapters: CustomTranslationFile["books"][number]["chapters"] = []
    for (const [chKey, versesObj] of Object.entries(chaptersObj as Record<string, unknown>)) {
      const chapterNum = parseInt(chKey, 10)
      if (!Number.isFinite(chapterNum)) continue
      if (!versesObj || typeof versesObj !== "object" || Array.isArray(versesObj)) continue
      const verses: Array<{ verse: number; text: string }> = []
      for (const [vKey, vText] of Object.entries(versesObj as Record<string, unknown>)) {
        const verseNum = parseInt(vKey, 10)
        if (!Number.isFinite(verseNum) || typeof vText !== "string") continue
        verses.push({ verse: verseNum, text: vText })
      }
      if (verses.length === 0) continue
      verses.sort((a, b) => a.verse - b.verse)
      chapters.push({ chapter: chapterNum, verses })
      totalVerses += verses.length
    }
    if (chapters.length === 0) continue
    chapters.sort((a, b) => a.chapter - b.chapter)
    totalChapters += chapters.length
    books.push({
      book_number: def.book_number,
      name: def.name,
      abbreviation: def.abbreviation,
      testament: def.testament,
      chapters,
    })
  }

  if (books.length === 0)
    throw new Error("No recognizable Bible books found in JSON")

  books.sort((a, b) => a.book_number - b.book_number)
  return {
    file: {
      abbreviation: fallback.abbreviation,
      title: fallback.title,
      language: fallback.language,
      books,
    },
    report: {
      format: "nested-book-chapter-verse",
      books: books.length,
      chapters: totalChapters,
      verses: totalVerses,
      unknownBooks,
    },
  }
}

export async function listLocalTranslations(): Promise<Translation[]> {
  const rows = await tx<StoredTranslation[]>("readonly", (s) => s.getAll())
  return rows.map((r) => ({
    id: r.id,
    abbreviation: r.abbreviation,
    title: r.title,
    language: r.language,
    is_copyrighted: false,
    is_downloaded: true,
  }))
}

export async function addLocalTranslation(
  file: CustomTranslationFile,
): Promise<Translation> {
  const id = -Date.now()
  const record: StoredTranslation = {
    id,
    abbreviation: file.abbreviation,
    title: file.title,
    language: file.language,
    data: file,
  }
  await tx("readwrite", (s) => s.add(record))
  return {
    id,
    abbreviation: record.abbreviation,
    title: record.title,
    language: record.language,
    is_copyrighted: false,
    is_downloaded: true,
  }
}

export async function deleteLocalTranslation(id: number): Promise<void> {
  await tx("readwrite", (s) => s.delete(id))
}

async function getStored(id: number): Promise<StoredTranslation | null> {
  const row = await tx<StoredTranslation | undefined>("readonly", (s) =>
    s.get(id),
  )
  return row ?? null
}

export async function getLocalBooks(translationId: number): Promise<Book[]> {
  const row = await getStored(translationId)
  if (!row) return []
  return row.data.books.map((b, i) => ({
    id: i + 1,
    translation_id: translationId,
    book_number: b.book_number,
    name: b.name,
    abbreviation: b.abbreviation,
    testament: b.testament,
  }))
}

export async function getLocalChapter(
  translationId: number,
  bookNumber: number,
  chapter: number,
): Promise<Verse[]> {
  const row = await getStored(translationId)
  if (!row) return []
  const book = row.data.books.find((b) => b.book_number === bookNumber)
  if (!book) return []
  const ch = book.chapters.find((c) => c.chapter === chapter)
  if (!ch) return []
  return ch.verses.map((v, i) => ({
    id: i + 1,
    translation_id: translationId,
    book_number: bookNumber,
    book_name: book.name,
    book_abbreviation: book.abbreviation,
    chapter,
    verse: v.verse,
    text: v.text,
  }))
}

export async function getLocalVerse(
  translationId: number,
  bookNumber: number,
  chapter: number,
  verse: number,
): Promise<Verse | null> {
  const verses = await getLocalChapter(translationId, bookNumber, chapter)
  return verses.find((v) => v.verse === verse) ?? null
}

export async function searchLocalVerses(
  query: string,
  translationId: number,
  limit = 50,
): Promise<Verse[]> {
  const row = await getStored(translationId)
  if (!row) return []
  const q = query.trim().toLowerCase()
  if (!q) return []
  const out: Verse[] = []
  for (const book of row.data.books) {
    for (const ch of book.chapters) {
      for (const v of ch.verses) {
        if (v.text.toLowerCase().includes(q)) {
          out.push({
            id: out.length + 1,
            translation_id: translationId,
            book_number: book.book_number,
            book_name: book.name,
            book_abbreviation: book.abbreviation,
            chapter: ch.chapter,
            verse: v.verse,
            text: v.text,
          })
          if (out.length >= limit) return out
        }
      }
    }
  }
  return out
}
