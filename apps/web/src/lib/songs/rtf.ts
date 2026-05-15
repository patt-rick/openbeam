const GROUP_DESTINATIONS = new Set([
  "fonttbl",
  "colortbl",
  "stylesheet",
  "info",
  "pict",
  "header",
  "footer",
  "headerl",
  "headerr",
  "headerf",
  "footerl",
  "footerr",
  "footerf",
  "filetbl",
  "themedata",
  "latentstyles",
  "datastore",
  "operator",
  "listtable",
  "listoverridetable",
  "rsidtbl",
  "generator",
  "xmlnstbl",
])

function appendPara(out: string[]) {
  // Always push a newline for each paragraph mark. An empty paragraph between two real
  // paragraphs is RTF's blank-line stanza break — collapsing consecutive newlines here would
  // destroy it. The final cleanup caps runs at \n\n.
  out.push("\n")
}

export function rtfToText(rtf: string): string {
  const out: string[] = []
  const stack: { ignore: boolean; ucSkip: number }[] = [{ ignore: false, ucSkip: 1 }]
  let i = 0
  const n = rtf.length

  while (i < n) {
    const ch = rtf[i]

    if (ch === "{") {
      const top = stack[stack.length - 1]
      stack.push({ ignore: top.ignore, ucSkip: top.ucSkip })
      i++
      continue
    }

    if (ch === "}") {
      if (stack.length > 1) stack.pop()
      i++
      continue
    }

    if (ch === "\\") {
      const next = rtf[i + 1]
      if (next === "\\" || next === "{" || next === "}") {
        if (!stack[stack.length - 1].ignore) out.push(next)
        i += 2
        continue
      }
      if (next === "'") {
        const hex = rtf.slice(i + 2, i + 4)
        if (!stack[stack.length - 1].ignore && /^[0-9a-fA-F]{2}$/.test(hex)) {
          const code = parseInt(hex, 16)
          out.push(String.fromCharCode(code))
        }
        i += 4
        continue
      }
      if (next === "*") {
        // \* marks the current group as an ignorable destination per the RTF spec ("If you don't
        // understand what follows, drop the whole group"). We don't recognize any optional
        // destinations specifically, so ignore the entire group unconditionally. Without this,
        // tables like \pnseclvlN — which contain literal '(' ')' '.' inside nested \pntxta/\pntxtb
        // groups — leak their content into the output.
        stack[stack.length - 1].ignore = true
        i += 2
        continue
      }
      if (next === "\n" || next === "\r") {
        if (!stack[stack.length - 1].ignore) appendPara(out)
        i += 2
        continue
      }

      // Control word: \<letters>[-]?[digits]? followed by optional single space
      let j = i + 1
      while (j < n && /[a-zA-Z]/.test(rtf[j])) j++
      const word = rtf.slice(i + 1, j)
      let paramStart = j
      if (rtf[j] === "-") j++
      while (j < n && /[0-9]/.test(rtf[j])) j++
      const param = j > paramStart ? parseInt(rtf.slice(paramStart, j), 10) : null
      if (rtf[j] === " ") j++ // delimiter space is consumed

      if (word === "u" && param !== null) {
        if (!stack[stack.length - 1].ignore) {
          out.push(String.fromCodePoint(param < 0 ? param + 0x10000 : param))
        }
        // Skip ucSkip following character tokens (each is either a control word or a single char).
        let skipped = 0
        const ucSkip = stack[stack.length - 1].ucSkip
        while (skipped < ucSkip && j < n) {
          if (rtf[j] === "\\") {
            // Skip a single control word
            j++
            if (rtf[j] === "'") {
              j += 3
            } else {
              while (j < n && /[a-zA-Z]/.test(rtf[j])) j++
              if (rtf[j] === "-") j++
              while (j < n && /[0-9]/.test(rtf[j])) j++
              if (rtf[j] === " ") j++
            }
          } else if (rtf[j] === "{" || rtf[j] === "}") {
            break
          } else {
            j++
          }
          skipped++
        }
        i = j
        continue
      }

      if (word === "uc" && param !== null) {
        stack[stack.length - 1].ucSkip = param
        i = j
        continue
      }

      if (GROUP_DESTINATIONS.has(word)) {
        stack[stack.length - 1].ignore = true
        i = j
        continue
      }

      if (!stack[stack.length - 1].ignore) {
        if (word === "par" || word === "line" || word === "sect") {
          appendPara(out)
        } else if (word === "tab") {
          out.push("\t")
        } else if (word === "emdash") {
          out.push("—")
        } else if (word === "endash") {
          out.push("–")
        } else if (word === "lquote") {
          out.push("‘")
        } else if (word === "rquote") {
          out.push("’")
        } else if (word === "ldblquote") {
          out.push("“")
        } else if (word === "rdblquote") {
          out.push("”")
        } else if (word === "bullet") {
          out.push("•")
        }
        // Other control words (formatting like \b, \fs28, etc.) are silently dropped.
      }

      i = j
      continue
    }

    if (ch === "\r" || ch === "\n") {
      i++
      continue
    }

    if (!stack[stack.length - 1].ignore) {
      out.push(ch)
    }
    i++
  }

  // Collapse runs of 3+ newlines, trim each line, drop the leading rtf-header artifact line if any.
  return out
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
