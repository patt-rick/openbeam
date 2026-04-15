import type { Translation, Book, Verse } from "@/types"

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
