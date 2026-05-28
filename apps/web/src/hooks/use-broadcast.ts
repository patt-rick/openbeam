import { useEffect, useMemo } from "react"
import { useBroadcastStore } from "@/stores/broadcast-store"
import { useBibleStore } from "@/stores/bible-store"
import type { VerseRenderData } from "@/types"
import type { Verse } from "@/types"

export function toVerseRenderData(verse: Verse, translation: string): VerseRenderData {
  return {
    reference: `${verse.book_name} ${verse.chapter}:${verse.verse} (${translation})`,
    segments: [{ verseNumber: verse.verse, text: verse.text }],
  }
}

export function deriveLiveVerse({
  isLive,
  selectedVerse,
  translation,
}: {
  isLive: boolean
  selectedVerse: Verse | null
  translation: string
}): VerseRenderData | null {
  if (!isLive || !selectedVerse) return null
  return toVerseRenderData(selectedVerse, translation)
}

/**
 * Drive `liveVerse` from selectedVerse + isLive + active translation.
 * Mount once at the app root so panel visibility never breaks broadcast.
 */
export function useDriveLiveVerse() {
  const isLive = useBroadcastStore((s) => s.isLive)
  const selectedVerse = useBibleStore((s) => s.selectedVerse)
  const translations = useBibleStore((s) => s.translations)
  const activeTranslationId = useBibleStore((s) => s.activeTranslationId)

  const translation =
    translations.find((t) => t.id === activeTranslationId)?.abbreviation ?? "KJV"

  const verseData = useMemo(
    () => deriveLiveVerse({ isLive, selectedVerse, translation }),
    [isLive, selectedVerse, translation],
  )

  useEffect(() => {
    useBroadcastStore.getState().setLiveVerse(verseData)
  }, [verseData])
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
