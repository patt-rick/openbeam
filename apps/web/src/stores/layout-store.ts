import { create } from "zustand"

const STORAGE_KEY = "openbeam:layout"

export type TopPanelId = "transcript" | "preview" | "liveOutput" | "queue"

export const TOP_PANEL_LABELS: Record<TopPanelId, string> = {
  transcript: "Transcript",
  preview: "Preview",
  liveOutput: "Live output",
  queue: "Queue",
}

export const TOP_PANEL_ORDER: TopPanelId[] = ["transcript", "preview", "liveOutput", "queue"]

interface LayoutState {
  topPanelVisible: Record<TopPanelId, boolean>
  togglePanelVisible: (id: TopPanelId) => void
  setPanelVisible: (id: TopPanelId, visible: boolean) => void
}

function load(): Partial<LayoutState["topPanelVisible"]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return {}
}

function persist(visible: LayoutState["topPanelVisible"]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visible))
  } catch {
    // ignore
  }
}

const persisted = load()

const defaultVisible: Record<TopPanelId, boolean> = {
  transcript: persisted.transcript ?? true,
  preview: persisted.preview ?? true,
  liveOutput: persisted.liveOutput ?? true,
  queue: persisted.queue ?? true,
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  topPanelVisible: defaultVisible,
  togglePanelVisible: (id) => {
    const current = get().topPanelVisible
    const next = { ...current, [id]: !current[id] }
    if (!Object.values(next).some(Boolean)) return // keep at least one visible
    set({ topPanelVisible: next })
    persist(next)
  },
  setPanelVisible: (id, visible) => {
    const next = { ...get().topPanelVisible, [id]: visible }
    if (!Object.values(next).some(Boolean)) return
    set({ topPanelVisible: next })
    persist(next)
  },
}))
