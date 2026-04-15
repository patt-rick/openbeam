import type { CustomTranslationFile } from "./local-translations"

// 66-book default names/testaments keyed by Zefania bnumber (1..66 canonical order).
const BOOK_META: Array<{ name: string; abbreviation: string; testament: "OT" | "NT" }> = [
  { name: "Genesis", abbreviation: "Gen", testament: "OT" },
  { name: "Exodus", abbreviation: "Exod", testament: "OT" },
  { name: "Leviticus", abbreviation: "Lev", testament: "OT" },
  { name: "Numbers", abbreviation: "Num", testament: "OT" },
  { name: "Deuteronomy", abbreviation: "Deut", testament: "OT" },
  { name: "Joshua", abbreviation: "Josh", testament: "OT" },
  { name: "Judges", abbreviation: "Judg", testament: "OT" },
  { name: "Ruth", abbreviation: "Ruth", testament: "OT" },
  { name: "1 Samuel", abbreviation: "1 Sam", testament: "OT" },
  { name: "2 Samuel", abbreviation: "2 Sam", testament: "OT" },
  { name: "1 Kings", abbreviation: "1 Kgs", testament: "OT" },
  { name: "2 Kings", abbreviation: "2 Kgs", testament: "OT" },
  { name: "1 Chronicles", abbreviation: "1 Chr", testament: "OT" },
  { name: "2 Chronicles", abbreviation: "2 Chr", testament: "OT" },
  { name: "Ezra", abbreviation: "Ezra", testament: "OT" },
  { name: "Nehemiah", abbreviation: "Neh", testament: "OT" },
  { name: "Esther", abbreviation: "Esth", testament: "OT" },
  { name: "Job", abbreviation: "Job", testament: "OT" },
  { name: "Psalms", abbreviation: "Ps", testament: "OT" },
  { name: "Proverbs", abbreviation: "Prov", testament: "OT" },
  { name: "Ecclesiastes", abbreviation: "Eccl", testament: "OT" },
  { name: "Song of Solomon", abbreviation: "Song", testament: "OT" },
  { name: "Isaiah", abbreviation: "Isa", testament: "OT" },
  { name: "Jeremiah", abbreviation: "Jer", testament: "OT" },
  { name: "Lamentations", abbreviation: "Lam", testament: "OT" },
  { name: "Ezekiel", abbreviation: "Ezek", testament: "OT" },
  { name: "Daniel", abbreviation: "Dan", testament: "OT" },
  { name: "Hosea", abbreviation: "Hos", testament: "OT" },
  { name: "Joel", abbreviation: "Joel", testament: "OT" },
  { name: "Amos", abbreviation: "Amos", testament: "OT" },
  { name: "Obadiah", abbreviation: "Obad", testament: "OT" },
  { name: "Jonah", abbreviation: "Jonah", testament: "OT" },
  { name: "Micah", abbreviation: "Mic", testament: "OT" },
  { name: "Nahum", abbreviation: "Nah", testament: "OT" },
  { name: "Habakkuk", abbreviation: "Hab", testament: "OT" },
  { name: "Zephaniah", abbreviation: "Zeph", testament: "OT" },
  { name: "Haggai", abbreviation: "Hag", testament: "OT" },
  { name: "Zechariah", abbreviation: "Zech", testament: "OT" },
  { name: "Malachi", abbreviation: "Mal", testament: "OT" },
  { name: "Matthew", abbreviation: "Matt", testament: "NT" },
  { name: "Mark", abbreviation: "Mark", testament: "NT" },
  { name: "Luke", abbreviation: "Luke", testament: "NT" },
  { name: "John", abbreviation: "John", testament: "NT" },
  { name: "Acts", abbreviation: "Acts", testament: "NT" },
  { name: "Romans", abbreviation: "Rom", testament: "NT" },
  { name: "1 Corinthians", abbreviation: "1 Cor", testament: "NT" },
  { name: "2 Corinthians", abbreviation: "2 Cor", testament: "NT" },
  { name: "Galatians", abbreviation: "Gal", testament: "NT" },
  { name: "Ephesians", abbreviation: "Eph", testament: "NT" },
  { name: "Philippians", abbreviation: "Phil", testament: "NT" },
  { name: "Colossians", abbreviation: "Col", testament: "NT" },
  { name: "1 Thessalonians", abbreviation: "1 Thess", testament: "NT" },
  { name: "2 Thessalonians", abbreviation: "2 Thess", testament: "NT" },
  { name: "1 Timothy", abbreviation: "1 Tim", testament: "NT" },
  { name: "2 Timothy", abbreviation: "2 Tim", testament: "NT" },
  { name: "Titus", abbreviation: "Titus", testament: "NT" },
  { name: "Philemon", abbreviation: "Phlm", testament: "NT" },
  { name: "Hebrews", abbreviation: "Heb", testament: "NT" },
  { name: "James", abbreviation: "Jas", testament: "NT" },
  { name: "1 Peter", abbreviation: "1 Pet", testament: "NT" },
  { name: "2 Peter", abbreviation: "2 Pet", testament: "NT" },
  { name: "1 John", abbreviation: "1 John", testament: "NT" },
  { name: "2 John", abbreviation: "2 John", testament: "NT" },
  { name: "3 John", abbreviation: "3 John", testament: "NT" },
  { name: "Jude", abbreviation: "Jude", testament: "NT" },
  { name: "Revelation", abbreviation: "Rev", testament: "NT" },
]

export interface XmlParseReport {
  books: number
  chapters: number
  verses: number
  format: "zefania" | "osis"
}

// OSIS book IDs (case-insensitive match) → 1..66
const OSIS_BOOKS: Record<string, number> = {
  gen: 1, exod: 2, lev: 3, num: 4, deut: 5, josh: 6, judg: 7, ruth: 8,
  "1sam": 9, "2sam": 10, "1kgs": 11, "2kgs": 12, "1chr": 13, "2chr": 14,
  ezra: 15, neh: 16, esth: 17, job: 18, ps: 19, prov: 20, eccl: 21, song: 22,
  isa: 23, jer: 24, lam: 25, ezek: 26, dan: 27, hos: 28, joel: 29, amos: 30,
  obad: 31, jonah: 32, mic: 33, nah: 34, hab: 35, zeph: 36, hag: 37, zech: 38, mal: 39,
  matt: 40, mark: 41, luke: 42, john: 43, acts: 44, rom: 45,
  "1cor": 46, "2cor": 47, gal: 48, eph: 49, phil: 50, col: 51,
  "1thess": 52, "2thess": 53, "1tim": 54, "2tim": 55, titus: 56, phlm: 57,
  heb: 58, jas: 59, "1pet": 60, "2pet": 61,
  "1john": 62, "2john": 63, "3john": 64, jude: 65, rev: 66,
}

export function parseBibleXml(
  xmlText: string,
  fallback: { abbreviation: string; title: string; language: string },
): { file: CustomTranslationFile; report: XmlParseReport } {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml")
  const parseErr = doc.querySelector("parsererror")
  if (parseErr) throw new Error("Invalid XML: " + parseErr.textContent?.slice(0, 120))
  const root = doc.documentElement
  if (!root) throw new Error("Empty XML document")
  const tag = root.tagName.toLowerCase()
  if (tag === "xmlbible" || tag === "x") {
    return parseZefaniaXml(xmlText, fallback)
  }
  if (tag === "osis") {
    return parseOsisXml(doc, fallback)
  }
  throw new Error(`Unsupported XML root <${root.tagName}>. Expected <XMLBIBLE> (Zefania) or <osis>.`)
}

function parseOsisXml(
  doc: Document,
  fallback: { abbreviation: string; title: string; language: string },
): { file: CustomTranslationFile; report: XmlParseReport } {
  const title =
    fallback.title ||
    doc.querySelector("work > title, header title, title")?.textContent?.trim() ||
    "Untitled"
  const langAttr =
    doc.querySelector("work > language")?.textContent?.trim() ||
    doc.documentElement.getAttribute("xml:lang") ||
    ""
  const language = (fallback.language || langAttr || "en").toLowerCase().slice(0, 5)
  const abbreviation = fallback.abbreviation || title.split(/\s+/)[0].slice(0, 6).toUpperCase()

  // Collect all <verse> elements that carry osisID (start-milestone or container).
  const verseEls = Array.from(doc.getElementsByTagName("verse")).filter((v) =>
    v.hasAttribute("osisID"),
  )

  const bookMap = new Map<number, CustomTranslationFile["books"][number]>()

  const ensureBook = (bn: number) => {
    let b = bookMap.get(bn)
    if (!b) {
      const meta = BOOK_META[bn - 1]
      b = {
        book_number: bn,
        name: meta.name,
        abbreviation: meta.abbreviation,
        testament: meta.testament,
        chapters: [],
      }
      bookMap.set(bn, b)
    }
    return b
  }
  const ensureChapter = (bn: number, cn: number) => {
    const b = ensureBook(bn)
    let c = b.chapters.find((ch) => ch.chapter === cn)
    if (!c) {
      c = { chapter: cn, verses: [] }
      b.chapters.push(c)
    }
    return c
  }

  for (let i = 0; i < verseEls.length; i++) {
    const v = verseEls[i]
    const osisId = v.getAttribute("osisID") ?? ""
    // osisID can be "Gen.1.1" or "Gen.1.1-Gen.1.3" (range). Use the first ref only.
    const first = osisId.split(/[,\s]+/)[0].split("-")[0]
    const parts = first.split(".")
    if (parts.length < 3) continue
    const bn = OSIS_BOOKS[parts[0].toLowerCase()]
    const cn = parseInt(parts[1], 10)
    const vn = parseInt(parts[2], 10)
    if (!bn || !cn || !vn) continue

    let text = ""
    // Container form: <verse osisID="...">text</verse> (no sID/eID)
    if (!v.hasAttribute("sID") && !v.hasAttribute("eID") && v.textContent) {
      text = extractText(v)
    } else {
      // Milestone form: text between this sID and the next <verse> (sID or eID).
      text = collectMilestoneText(v, verseEls[i + 1])
    }
    text = text.replace(/\s+/g, " ").trim()
    if (text) {
      ensureChapter(bn, cn).verses.push({ verse: vn, text })
    }
  }

  const books = Array.from(bookMap.values())
    .map((b) => ({
      ...b,
      chapters: b.chapters
        .map((c) => ({ ...c, verses: c.verses.slice().sort((x, y) => x.verse - y.verse) }))
        .sort((x, y) => x.chapter - y.chapter),
    }))
    .sort((a, b) => a.book_number - b.book_number)

  if (books.length === 0)
    throw new Error("No <verse osisID='...'> elements found in the OSIS document.")

  return {
    file: { abbreviation, title, language, books },
    report: {
      format: "osis",
      books: books.length,
      chapters: books.reduce((n, b) => n + b.chapters.length, 0),
      verses: books.reduce((n, b) => n + b.chapters.reduce((m, c) => m + c.verses.length, 0), 0),
    },
  }
}

// Skip notes, titles, references, study material when extracting verse text.
const SKIP_TAGS = new Set(["note", "title", "reference", "milestone", "figure", "index"])

function extractText(el: Element): string {
  let out = ""
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) {
      out += n.nodeValue ?? ""
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const e = n as Element
      if (SKIP_TAGS.has(e.tagName.toLowerCase())) return
      for (const c of Array.from(e.childNodes)) walk(c)
    }
  }
  for (const c of Array.from(el.childNodes)) walk(c)
  return out
}

// For milestone <verse sID="..."/>, collect following siblings until we hit the next verse marker.
function collectMilestoneText(start: Element, nextVerse: Element | undefined): string {
  let out = ""
  // Walk the document in order from `start`, collecting text until we reach `nextVerse` or any <verse eID>.
  const range = document.createRange()
  range.setStartAfter(start)
  if (nextVerse) {
    range.setEndBefore(nextVerse)
  } else {
    // End at document end
    range.setEndAfter(start.ownerDocument.documentElement)
  }
  const frag = range.cloneContents()
  // Strip skip-tags from the fragment.
  const container = frag.ownerDocument?.createElement("div") ?? document.createElement("div")
  container.appendChild(frag)
  container.querySelectorAll(Array.from(SKIP_TAGS).join(",")).forEach((n) => n.remove())
  out = container.textContent ?? ""
  return out
}

export function parseZefaniaXml(
  xmlText: string,
  fallback: { abbreviation: string; title: string; language: string },
): { file: CustomTranslationFile; report: XmlParseReport } {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml")
  const parseErr = doc.querySelector("parsererror")
  if (parseErr) throw new Error("Invalid XML: " + parseErr.textContent?.slice(0, 120))

  const root = doc.documentElement
  if (!root || root.tagName.toUpperCase() !== "XMLBIBLE") {
    throw new Error(`Not a Zefania XML (root is <${root?.tagName ?? "?"}>, expected <XMLBIBLE>)`)
  }

  const info = root.querySelector("INFORMATION")
  const infoTitle = info?.querySelector("title")?.textContent?.trim()
  const infoLang = info?.querySelector("language")?.textContent?.trim()
  const infoIdentifier = info?.querySelector("identifier")?.textContent?.trim()

  const title = fallback.title || infoTitle || "Untitled"
  const abbreviation = fallback.abbreviation || infoIdentifier || title.slice(0, 6).toUpperCase()
  const language = (fallback.language || infoLang || "en").toLowerCase().slice(0, 5)

  const books: CustomTranslationFile["books"] = []

  for (const bookEl of Array.from(root.querySelectorAll("BIBLEBOOK"))) {
    const bnRaw = bookEl.getAttribute("bnumber")
    const bn = bnRaw ? parseInt(bnRaw, 10) : NaN
    if (!bn || bn < 1 || bn > 66) continue
    const meta = BOOK_META[bn - 1]
    const bname = bookEl.getAttribute("bname")?.trim() || meta.name
    const bsname = bookEl.getAttribute("bsname")?.trim() || meta.abbreviation

    const chapters: CustomTranslationFile["books"][number]["chapters"] = []
    for (const chEl of Array.from(bookEl.querySelectorAll("CHAPTER"))) {
      const cn = parseInt(chEl.getAttribute("cnumber") ?? "", 10)
      if (!cn) continue
      const verses: { verse: number; text: string }[] = []
      for (const vEl of Array.from(chEl.querySelectorAll("VERS"))) {
        const vn = parseInt(vEl.getAttribute("vnumber") ?? "", 10)
        if (!vn) continue
        const text = (vEl.textContent ?? "").replace(/\s+/g, " ").trim()
        if (text) verses.push({ verse: vn, text })
      }
      if (verses.length) chapters.push({ chapter: cn, verses })
    }
    if (chapters.length) {
      books.push({
        book_number: bn,
        name: bname,
        abbreviation: bsname,
        testament: meta.testament,
        chapters,
      })
    }
  }

  if (books.length === 0) throw new Error("No BIBLEBOOK/CHAPTER/VERS content found")

  books.sort((a, b) => a.book_number - b.book_number)

  return {
    file: { abbreviation, title, language, books },
    report: {
      format: "zefania",
      books: books.length,
      chapters: books.reduce((n, b) => n + b.chapters.length, 0),
      verses: books.reduce((n, b) => n + b.chapters.reduce((m, c) => m + c.verses.length, 0), 0),
    },
  }
}
