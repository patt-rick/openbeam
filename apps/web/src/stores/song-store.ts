import { create } from "zustand"

import { getLibraryMeta } from "@/lib/songs/sqlite"
import { parseLyrics, type Stanza } from "@/lib/songs/stanzas"
import type { Song, SongSearchResult } from "@/types/song"

interface SongState {
  libraryCount: number
  libraryImportedAt: number | null
  query: string
  results: SongSearchResult[]
  selectedSong: Song | null
  selectedStanzas: Stanza[]
  currentStanzaIndex: number
  searching: boolean

  setQuery: (q: string) => void
  setResults: (r: SongSearchResult[]) => void
  setSelectedSong: (s: Song | null) => void
  setStanzaIndex: (idx: number) => void
  nextStanza: () => void
  prevStanza: () => void
  setSearching: (b: boolean) => void
  refreshLibraryMeta: () => Promise<void>
  setLibrary: (count: number, importedAt: number | null) => void
}

export const useSongStore = create<SongState>((set, get) => ({
  libraryCount: 0,
  libraryImportedAt: null,
  query: "",
  results: [],
  selectedSong: null,
  selectedStanzas: [],
  currentStanzaIndex: 0,
  searching: false,

  setQuery: (query) => set({ query }),
  setResults: (results) => set({ results }),
  setSelectedSong: (song) => {
    const stanzas = song ? parseLyrics(song.lyrics) : []
    set({
      selectedSong: song,
      selectedStanzas: stanzas,
      currentStanzaIndex: 0,
    })
  },
  setStanzaIndex: (idx) => {
    const max = get().selectedStanzas.length - 1
    if (max < 0) return
    const clamped = Math.max(0, Math.min(idx, max))
    set({ currentStanzaIndex: clamped })
  },
  nextStanza: () => {
    const { currentStanzaIndex, selectedStanzas } = get()
    if (currentStanzaIndex < selectedStanzas.length - 1) {
      set({ currentStanzaIndex: currentStanzaIndex + 1 })
    }
  },
  prevStanza: () => {
    const { currentStanzaIndex } = get()
    if (currentStanzaIndex > 0) {
      set({ currentStanzaIndex: currentStanzaIndex - 1 })
    }
  },
  setSearching: (searching) => set({ searching }),
  setLibrary: (libraryCount, libraryImportedAt) => set({ libraryCount, libraryImportedAt }),
  refreshLibraryMeta: async () => {
    const meta = await getLibraryMeta()
    set({
      libraryCount: meta?.count ?? 0,
      libraryImportedAt: meta?.imported_at ?? null,
    })
  },
}))
