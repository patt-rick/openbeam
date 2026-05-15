export interface Song {
  id: number
  title: string
  author: string | null
  copyright: string | null
  reference_number: string | null
  tags: string | null
  lyrics: string
}

export interface SongSearchResult {
  song: Song
  snippet: string
}

export interface SongLibraryStats {
  count: number
  imported_at: number
}
