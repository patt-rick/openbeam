import { useBroadcastStore } from "@/stores/broadcast-store"
import type { VerseRenderData } from "@/types"
import type { Verse } from "@/types"
import type { Song } from "@/types/song"
import type { Stanza } from "@/lib/songs/stanzas"

export function toVerseRenderData(verse: Verse, translation: string): VerseRenderData {
  return {
    reference: `${verse.book_name} ${verse.chapter}:${verse.verse} (${translation})`,
    segments: [{ verseNumber: verse.verse, text: verse.text }],
  }
}

export function toSongRenderData(
  song: Song,
  stanzas: Stanza[],
  stanzaIndex: number,
): VerseRenderData | null {
  if (stanzas.length === 0) return null
  const idx = Math.max(0, Math.min(stanzaIndex, stanzas.length - 1))
  const stanza = stanzas[idx]
  const stanzaLabel = stanza.label
    ? stanza.label
    : stanzas.length > 1
    ? `${idx + 1} / ${stanzas.length}`
    : ""
  const reference = stanzaLabel ? `${song.title} · ${stanzaLabel}` : song.title
  const footerParts: string[] = []
  if (song.author) footerParts.push(song.author)
  if (song.copyright) footerParts.push(`© ${song.copyright}`)
  return {
    reference,
    segments: [{ text: stanza.text }],
    footer: footerParts.length > 0 ? footerParts.join(" · ") : undefined,
  }
}

export function deriveLiveVerse({
  isLive,
  selectedVerse,
  selectedSong,
  selectedStanzas,
  currentStanzaIndex,
  translation,
}: {
  isLive: boolean
  selectedVerse: Verse | null
  selectedSong: Song | null
  selectedStanzas: Stanza[]
  currentStanzaIndex: number
  translation: string
}): VerseRenderData | null {
  if (!isLive) return null
  if (selectedSong) return toSongRenderData(selectedSong, selectedStanzas, currentStanzaIndex)
  if (selectedVerse) return toVerseRenderData(selectedVerse, translation)
  return null
}

export const broadcastActions = {
  setLiveVerse: (verse: VerseRenderData | null) =>
    useBroadcastStore.getState().setLiveVerse(verse),
  setLive: (live: boolean) =>
    useBroadcastStore.getState().setLive(live),
  getActiveTheme: () => {
    const s = useBroadcastStore.getState()
    return s.themes.find((t) => t.id === s.activeThemeId) ?? s.themes[0]
  },
}
