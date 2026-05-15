export interface VerseSegment {
  verseNumber?: number
  text: string
}

export interface VerseRenderData {
  reference: string
  segments: VerseSegment[]
  /** Optional credit line rendered small at the canvas bottom. Used for song author/copyright. */
  footer?: string
}
