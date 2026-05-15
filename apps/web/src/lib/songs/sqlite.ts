import sqlite3InitModule from "@sqlite.org/sqlite-wasm"

type Sqlite3Static = Awaited<ReturnType<typeof sqlite3InitModule>>
type SqliteDb = InstanceType<Sqlite3Static["oo1"]["DB"]>

const IDB_NAME = "openbeam-songs"
const IDB_VERSION = 1
const STORE = "library"
const KEY_BYTES = "db-bytes"
const KEY_META = "meta"

let sqlite3Cache: Sqlite3Static | null = null
let dbCache: SqliteDb | null = null

export interface LibraryMeta {
  count: number
  imported_at: number
}

export async function getSqlite3(): Promise<Sqlite3Static> {
  if (sqlite3Cache) return sqlite3Cache
  sqlite3Cache = await sqlite3InitModule({
    print: () => {},
    printErr: (msg: string) => console.warn("[sqlite-wasm]", msg),
  })
  return sqlite3Cache
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbGet<T>(key: string): Promise<T | undefined> {
  return openIdb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly")
        const req = tx.objectStore(STORE).get(key)
        req.onsuccess = () => resolve(req.result as T | undefined)
        req.onerror = () => reject(req.error)
      }),
  )
}

function idbPut(key: string, value: unknown): Promise<void> {
  return openIdb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite")
        tx.objectStore(STORE).put(value, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

function idbDelete(key: string): Promise<void> {
  return openIdb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite")
        tx.objectStore(STORE).delete(key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

/** Materializes a sqlite-wasm DB instance from a byte buffer (or returns a fresh empty DB). */
function deserializeDb(sqlite3: Sqlite3Static, bytes: Uint8Array | null): SqliteDb {
  const db = new sqlite3.oo1.DB(":memory:", "c") as SqliteDb
  if (!bytes) return db

  const p = sqlite3.wasm.allocFromTypedArray(bytes)
  const rc = sqlite3.capi.sqlite3_deserialize(
    (db as unknown as { pointer: number }).pointer,
    "main",
    p,
    bytes.byteLength,
    bytes.byteLength,
    sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE | sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE,
  )
  if (rc !== 0) {
    sqlite3.wasm.dealloc(p)
    throw new Error(`sqlite3_deserialize failed: rc=${rc}`)
  }
  return db
}

function serializeDb(sqlite3: Sqlite3Static, db: SqliteDb): Uint8Array {
  return sqlite3.capi.sqlite3_js_db_export((db as unknown as { pointer: number }).pointer)
}

export async function loadSongDb(): Promise<SqliteDb | null> {
  if (dbCache) return dbCache
  const bytes = await idbGet<Uint8Array>(KEY_BYTES)
  if (!bytes) return null
  const sqlite3 = await getSqlite3()
  dbCache = deserializeDb(sqlite3, bytes)
  return dbCache
}

export async function getOrCreateSongDb(): Promise<SqliteDb> {
  const existing = await loadSongDb()
  if (existing) return existing
  const sqlite3 = await getSqlite3()
  dbCache = deserializeDb(sqlite3, null)
  return dbCache
}

export async function persistSongDb(db: SqliteDb, meta: LibraryMeta): Promise<void> {
  const sqlite3 = await getSqlite3()
  const bytes = serializeDb(sqlite3, db)
  await idbPut(KEY_BYTES, bytes)
  await idbPut(KEY_META, meta)
}

export async function getLibraryMeta(): Promise<LibraryMeta | null> {
  return (await idbGet<LibraryMeta>(KEY_META)) ?? null
}

export async function clearSongLibrary(): Promise<void> {
  if (dbCache) {
    try {
      dbCache.close()
    } catch (e) {
      console.warn("[songs] close failed:", e)
    }
    dbCache = null
  }
  await idbDelete(KEY_BYTES)
  await idbDelete(KEY_META)
}

/** Build an in-memory DB from a File. Caller is responsible for closing it. */
export async function openInMemoryFromFile(file: File): Promise<SqliteDb> {
  const sqlite3 = await getSqlite3()
  const buf = new Uint8Array(await file.arrayBuffer())
  return deserializeDb(sqlite3, buf)
}

export type { SqliteDb }
