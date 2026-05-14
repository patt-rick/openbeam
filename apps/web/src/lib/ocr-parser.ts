import type { CustomTranslationFile } from "./local-translations"

interface BookDef {
  book_number: number
  name: string
  abbreviation: string
  testament: "OT" | "NT"
  aliases: string[]
}

// 66-book canonical table. Aliases are matched case-insensitively on a whole line.
const BOOKS: BookDef[] = [
  { book_number: 1, name: "Genesis", abbreviation: "Gen", testament: "OT", aliases: ["genesis", "gen", "ge", "gn"] },
  { book_number: 2, name: "Exodus", abbreviation: "Exod", testament: "OT", aliases: ["exodus", "exod", "exo", "ex"] },
  { book_number: 3, name: "Leviticus", abbreviation: "Lev", testament: "OT", aliases: ["leviticus", "lev", "lv"] },
  { book_number: 4, name: "Numbers", abbreviation: "Num", testament: "OT", aliases: ["numbers", "num", "nm", "nu"] },
  { book_number: 5, name: "Deuteronomy", abbreviation: "Deut", testament: "OT", aliases: ["deuteronomy", "deut", "dt"] },
  { book_number: 6, name: "Joshua", abbreviation: "Josh", testament: "OT", aliases: ["joshua", "josh", "jos"] },
  { book_number: 7, name: "Judges", abbreviation: "Judg", testament: "OT", aliases: ["judges", "judg", "jdg", "jg"] },
  { book_number: 8, name: "Ruth", abbreviation: "Ruth", testament: "OT", aliases: ["ruth", "rth", "ru"] },
  { book_number: 9, name: "1 Samuel", abbreviation: "1 Sam", testament: "OT", aliases: ["1 samuel", "1samuel", "i samuel", "first samuel", "1 sam", "1sam", "1 sm"] },
  { book_number: 10, name: "2 Samuel", abbreviation: "2 Sam", testament: "OT", aliases: ["2 samuel", "2samuel", "ii samuel", "second samuel", "2 sam", "2sam", "2 sm"] },
  { book_number: 11, name: "1 Kings", abbreviation: "1 Kgs", testament: "OT", aliases: ["1 kings", "1kings", "i kings", "first kings", "1 kgs", "1kgs", "1 ki"] },
  { book_number: 12, name: "2 Kings", abbreviation: "2 Kgs", testament: "OT", aliases: ["2 kings", "2kings", "ii kings", "second kings", "2 kgs", "2kgs", "2 ki"] },
  { book_number: 13, name: "1 Chronicles", abbreviation: "1 Chr", testament: "OT", aliases: ["1 chronicles", "1chronicles", "i chronicles", "first chronicles", "1 chr", "1chr", "1 ch"] },
  { book_number: 14, name: "2 Chronicles", abbreviation: "2 Chr", testament: "OT", aliases: ["2 chronicles", "2chronicles", "ii chronicles", "second chronicles", "2 chr", "2chr", "2 ch"] },
  { book_number: 15, name: "Ezra", abbreviation: "Ezra", testament: "OT", aliases: ["ezra", "ezr"] },
  { book_number: 16, name: "Nehemiah", abbreviation: "Neh", testament: "OT", aliases: ["nehemiah", "neh", "ne"] },
  { book_number: 17, name: "Esther", abbreviation: "Esth", testament: "OT", aliases: ["esther", "esth", "est"] },
  { book_number: 18, name: "Job", abbreviation: "Job", testament: "OT", aliases: ["job", "jb"] },
  { book_number: 19, name: "Psalms", abbreviation: "Ps", testament: "OT", aliases: ["psalms", "psalm", "ps", "psa"] },
  { book_number: 20, name: "Proverbs", abbreviation: "Prov", testament: "OT", aliases: ["proverbs", "prov", "prv", "pr"] },
  { book_number: 21, name: "Ecclesiastes", abbreviation: "Eccl", testament: "OT", aliases: ["ecclesiastes", "eccl", "ecc", "ec", "qoh", "qoheleth"] },
  { book_number: 22, name: "Song of Solomon", abbreviation: "Song", testament: "OT", aliases: ["song of solomon", "song of songs", "song", "sos", "canticles", "cant"] },
  { book_number: 23, name: "Isaiah", abbreviation: "Isa", testament: "OT", aliases: ["isaiah", "isa", "is"] },
  { book_number: 24, name: "Jeremiah", abbreviation: "Jer", testament: "OT", aliases: ["jeremiah", "jer", "je"] },
  { book_number: 25, name: "Lamentations", abbreviation: "Lam", testament: "OT", aliases: ["lamentations", "lam", "la"] },
  { book_number: 26, name: "Ezekiel", abbreviation: "Ezek", testament: "OT", aliases: ["ezekiel", "ezek", "eze", "ezk"] },
  { book_number: 27, name: "Daniel", abbreviation: "Dan", testament: "OT", aliases: ["daniel", "dan", "dn"] },
  { book_number: 28, name: "Hosea", abbreviation: "Hos", testament: "OT", aliases: ["hosea", "hos", "ho"] },
  { book_number: 29, name: "Joel", abbreviation: "Joel", testament: "OT", aliases: ["joel", "jl"] },
  { book_number: 30, name: "Amos", abbreviation: "Amos", testament: "OT", aliases: ["amos", "am"] },
  { book_number: 31, name: "Obadiah", abbreviation: "Obad", testament: "OT", aliases: ["obadiah", "obad", "ob"] },
  { book_number: 32, name: "Jonah", abbreviation: "Jonah", testament: "OT", aliases: ["jonah", "jon", "jnh"] },
  { book_number: 33, name: "Micah", abbreviation: "Mic", testament: "OT", aliases: ["micah", "mic", "mi"] },
  { book_number: 34, name: "Nahum", abbreviation: "Nah", testament: "OT", aliases: ["nahum", "nah", "na"] },
  { book_number: 35, name: "Habakkuk", abbreviation: "Hab", testament: "OT", aliases: ["habakkuk", "hab", "hb"] },
  { book_number: 36, name: "Zephaniah", abbreviation: "Zeph", testament: "OT", aliases: ["zephaniah", "zeph", "zep", "zp"] },
  { book_number: 37, name: "Haggai", abbreviation: "Hag", testament: "OT", aliases: ["haggai", "hag", "hg"] },
  { book_number: 38, name: "Zechariah", abbreviation: "Zech", testament: "OT", aliases: ["zechariah", "zech", "zec", "zc"] },
  { book_number: 39, name: "Malachi", abbreviation: "Mal", testament: "OT", aliases: ["malachi", "mal", "ml"] },
  { book_number: 40, name: "Matthew", abbreviation: "Matt", testament: "NT", aliases: ["matthew", "matt", "mt"] },
  { book_number: 41, name: "Mark", abbreviation: "Mark", testament: "NT", aliases: ["mark", "mrk", "mk", "mr"] },
  { book_number: 42, name: "Luke", abbreviation: "Luke", testament: "NT", aliases: ["luke", "luk", "lk"] },
  { book_number: 43, name: "John", abbreviation: "John", testament: "NT", aliases: ["john", "jhn", "jn"] },
  { book_number: 44, name: "Acts", abbreviation: "Acts", testament: "NT", aliases: ["acts", "act", "ac", "acts of the apostles"] },
  { book_number: 45, name: "Romans", abbreviation: "Rom", testament: "NT", aliases: ["romans", "rom", "ro", "rm"] },
  { book_number: 46, name: "1 Corinthians", abbreviation: "1 Cor", testament: "NT", aliases: ["1 corinthians", "1corinthians", "i corinthians", "first corinthians", "1 cor", "1cor", "1 co"] },
  { book_number: 47, name: "2 Corinthians", abbreviation: "2 Cor", testament: "NT", aliases: ["2 corinthians", "2corinthians", "ii corinthians", "second corinthians", "2 cor", "2cor", "2 co"] },
  { book_number: 48, name: "Galatians", abbreviation: "Gal", testament: "NT", aliases: ["galatians", "gal", "ga"] },
  { book_number: 49, name: "Ephesians", abbreviation: "Eph", testament: "NT", aliases: ["ephesians", "eph", "ephes"] },
  { book_number: 50, name: "Philippians", abbreviation: "Phil", testament: "NT", aliases: ["philippians", "phil", "php", "pp"] },
  { book_number: 51, name: "Colossians", abbreviation: "Col", testament: "NT", aliases: ["colossians", "col"] },
  { book_number: 52, name: "1 Thessalonians", abbreviation: "1 Thess", testament: "NT", aliases: ["1 thessalonians", "1thessalonians", "i thessalonians", "first thessalonians", "1 thess", "1thess", "1 th"] },
  { book_number: 53, name: "2 Thessalonians", abbreviation: "2 Thess", testament: "NT", aliases: ["2 thessalonians", "2thessalonians", "ii thessalonians", "second thessalonians", "2 thess", "2thess", "2 th"] },
  { book_number: 54, name: "1 Timothy", abbreviation: "1 Tim", testament: "NT", aliases: ["1 timothy", "1timothy", "i timothy", "first timothy", "1 tim", "1tim", "1 ti"] },
  { book_number: 55, name: "2 Timothy", abbreviation: "2 Tim", testament: "NT", aliases: ["2 timothy", "2timothy", "ii timothy", "second timothy", "2 tim", "2tim", "2 ti"] },
  { book_number: 56, name: "Titus", abbreviation: "Titus", testament: "NT", aliases: ["titus", "tit", "ti"] },
  { book_number: 57, name: "Philemon", abbreviation: "Phlm", testament: "NT", aliases: ["philemon", "phlm", "phm", "philem"] },
  { book_number: 58, name: "Hebrews", abbreviation: "Heb", testament: "NT", aliases: ["hebrews", "heb"] },
  { book_number: 59, name: "James", abbreviation: "Jas", testament: "NT", aliases: ["james", "jas", "jm"] },
  { book_number: 60, name: "1 Peter", abbreviation: "1 Pet", testament: "NT", aliases: ["1 peter", "1peter", "i peter", "first peter", "1 pet", "1pet", "1 pe"] },
  { book_number: 61, name: "2 Peter", abbreviation: "2 Pet", testament: "NT", aliases: ["2 peter", "2peter", "ii peter", "second peter", "2 pet", "2pet", "2 pe"] },
  { book_number: 62, name: "1 John", abbreviation: "1 John", testament: "NT", aliases: ["1 john", "1john", "i john", "first john", "1 jn", "1jn", "1 jo"] },
  { book_number: 63, name: "2 John", abbreviation: "2 John", testament: "NT", aliases: ["2 john", "2john", "ii john", "second john", "2 jn", "2jn", "2 jo"] },
  { book_number: 64, name: "3 John", abbreviation: "3 John", testament: "NT", aliases: ["3 john", "3john", "iii john", "third john", "3 jn", "3jn", "3 jo"] },
  { book_number: 65, name: "Jude", abbreviation: "Jude", testament: "NT", aliases: ["jude", "jud", "jd"] },
  { book_number: 66, name: "Revelation", abbreviation: "Rev", testament: "NT", aliases: ["revelation", "revelations", "rev", "rv", "apocalypse", "apoc", "the revelation of john", "the revelation of jesus christ"] },
]

function stripCommonPrefixes(s: string): string {
  return s
    .replace(/^the (book|gospel|acts|revelation|letter|epistle)s? (of|according to|to|from)(\s+the)?\s+/i, "")
    .replace(/^the (first|second|third) (book|letter|epistle) (of|to|from)(\s+the)?\s+/i, (_m, ord) => {
      const n = ord.toLowerCase() === "first" ? "1 " : ord.toLowerCase() === "second" ? "2 " : "3 "
      return n
    })
    .replace(/^(i|ii|iii)\s+/i, (m) => {
      const v = m.trim().toLowerCase()
      return v === "i" ? "1 " : v === "ii" ? "2 " : "3 "
    })
    .trim()
}

function matchBook(rawLine: string): BookDef | null {
  const trimmed = rawLine.trim().toLowerCase().replace(/\s+/g, " ")
  if (!trimmed || trimmed.length > 40) return null
  const normalized = stripCommonPrefixes(trimmed).replace(/[.:]+$/g, "").trim()
  for (const b of BOOKS) {
    if (b.aliases.includes(normalized)) return b
    // Allow "genesis 1" style where book name is followed by a chapter number
    const m = normalized.match(/^(.+?)\s+\d+$/)
    if (m && b.aliases.includes(m[1])) return b
  }
  return null
}

function matchChapterHeading(rawLine: string, currentBook: BookDef | null): number | null {
  const s = rawLine.trim()
  if (!s) return null
  let m = s.match(/^chapter\s+(\d+)\.?$/i)
  if (m) return parseInt(m[1], 10)
  m = s.match(/^(\d+)\.?$/)
  if (m && s.length <= 4) return parseInt(m[1], 10)
  if (currentBook) {
    const low = s.toLowerCase().replace(/\s+/g, " ")
    for (const alias of currentBook.aliases) {
      const rx = new RegExp(`^${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(\\d+)\\.?$`, "i")
      const mm = low.match(rx)
      if (mm) return parseInt(mm[1], 10)
    }
  }
  return null
}

// Verse start: `1 `, `1:1 `, `1.1 `, or OCR-style `1In` (digit glued to next word's capital).
const VERSE_START = /^(\d+)(?::(\d+))?[\s.\u00A0]+(.+)$/
const VERSE_GLUED = /^(\d+)([A-Z].+)$/

export interface OcrParseOptions {
  abbreviation: string
  title: string
  language: string
}

export interface OcrParseReport {
  books: number
  chapters: number
  verses: number
  warnings: string[]
}

export function parseOcrBibleText(
  text: string,
  opts: OcrParseOptions,
): { file: CustomTranslationFile; report: OcrParseReport } {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\u00AD/g, "").trimEnd())

  const warnings: string[] = []
  const bookMap = new Map<number, CustomTranslationFile["books"][number]>()

  let currentBook: BookDef | null = null
  let currentChapter: CustomTranslationFile["books"][number]["chapters"][number] | null = null
  let currentVerse: { verse: number; text: string } | null = null

  const ensureBook = (b: BookDef) => {
    let existing = bookMap.get(b.book_number)
    if (!existing) {
      existing = {
        book_number: b.book_number,
        name: b.name,
        abbreviation: b.abbreviation,
        testament: b.testament,
        chapters: [],
      }
      bookMap.set(b.book_number, existing)
    }
    return existing
  }

  const ensureChapter = (chapter: number) => {
    if (!currentBook) return null
    const bookEntry = ensureBook(currentBook)
    let ch = bookEntry.chapters.find((c) => c.chapter === chapter)
    if (!ch) {
      ch = { chapter, verses: [] }
      bookEntry.chapters.push(ch)
    }
    return ch
  }

  const pushVerse = () => {
    if (currentVerse && currentChapter) {
      const cleaned = currentVerse.text.replace(/\s+/g, " ").trim()
      if (cleaned) {
        currentChapter.verses.push({ verse: currentVerse.verse, text: cleaned })
      }
    }
    currentVerse = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    // Page-number-only line
    if (/^\d{1,4}$/.test(line) && line.length <= 4 && !currentChapter) continue

    const book = matchBook(line)
    if (book) {
      pushVerse()
      currentBook = book
      currentChapter = null
      // If the heading was "Genesis 1", also set chapter
      const m = line.toLowerCase().trim().match(/\s+(\d+)\.?$/)
      if (m) currentChapter = ensureChapter(parseInt(m[1], 10))
      continue
    }

    const chapterNum = matchChapterHeading(line, currentBook)
    if (chapterNum !== null && currentBook) {
      pushVerse()
      currentChapter = ensureChapter(chapterNum)
      continue
    }

    let m = line.match(VERSE_START)
    if (!m) {
      const g = line.match(VERSE_GLUED)
      if (g) m = [line, g[1], undefined as unknown as string, g[2]] as RegExpMatchArray
    }
    if (m && currentBook) {
      const a = parseInt(m[1], 10)
      const b = m[2] ? parseInt(m[2], 10) : null
      const rest = m[3]
      if (b !== null) {
        pushVerse()
        currentChapter = ensureChapter(a)
        currentVerse = { verse: b, text: rest }
      } else {
        if (!currentChapter) {
          // Assume chapter 1 if we saw a book header but no chapter heading
          currentChapter = ensureChapter(1)
        }
        pushVerse()
        currentVerse = { verse: a, text: rest }
      }
      continue
    }

    if (currentVerse) {
      currentVerse.text += " " + line
    } else if (!currentBook) {
      // Pre-book preamble; ignore
    } else {
      // Orphan line inside a book but no verse context
      warnings.push(`Skipped line in ${currentBook.name}: "${line.slice(0, 60)}"`)
    }
  }
  pushVerse()

  const books = Array.from(bookMap.values())
    .map((b) => ({
      ...b,
      chapters: b.chapters
        .map((c) => ({ ...c, verses: c.verses.slice().sort((x, y) => x.verse - y.verse) }))
        .sort((x, y) => x.chapter - y.chapter),
    }))
    .sort((a, b) => a.book_number - b.book_number)

  if (books.length === 0) {
    throw new Error(
      "No recognizable book headings found. Ensure book names appear on their own line (e.g., 'Genesis' or 'GENESIS').",
    )
  }

  const file: CustomTranslationFile = {
    abbreviation: opts.abbreviation,
    title: opts.title,
    language: opts.language,
    books,
  }

  const report: OcrParseReport = {
    books: books.length,
    chapters: books.reduce((n, b) => n + b.chapters.length, 0),
    verses: books.reduce((n, b) => n + b.chapters.reduce((m, c) => m + c.verses.length, 0), 0),
    warnings: warnings.slice(0, 20),
  }
  return { file, report }
}
