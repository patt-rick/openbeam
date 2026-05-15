import { Fragment, useRef, useState } from "react"
import { ChevronRightIcon } from "lucide-react"
import { TransportBar } from "@/components/controls/transport-bar"
import { TranscriptPanel } from "@/components/panels/transcript-panel"
import { PreviewPanel } from "@/components/panels/preview-panel"
import { LiveOutputPanel } from "@/components/panels/live-output-panel"
import { QueuePanel } from "@/components/panels/queue-panel"
import { SearchPanel } from "@/components/panels/search-panel"
import { DetectionsPanel } from "@/components/panels/detections-panel"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ImperativePanelHandle,
} from "@/components/ui/resizable"
import { PanelMinimizeProvider } from "@/components/ui/panel-header"
import {
  useLayoutStore,
  TOP_PANEL_LABELS,
  TOP_PANEL_ORDER,
  type TopPanelId,
} from "@/stores"
import { cn } from "@/lib/utils"

const panelContent: Record<TopPanelId, React.ReactNode> = {
  transcript: <TranscriptPanel />,
  preview: <PreviewPanel />,
  liveOutput: <LiveOutputPanel />,
  queue: <QueuePanel />,
}

function CollapsedStrip({
  label,
  onExpand,
}: {
  label: string
  onExpand: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center gap-2 rounded-lg border border-border bg-card py-2">
      <button
        onClick={onExpand}
        title="Expand"
        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronRightIcon className="size-3.5" />
      </button>
      <button
        onClick={onExpand}
        title="Expand"
        className="flex-1 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        style={{ writingMode: "vertical-rl" }}
      >
        {label}
      </button>
    </div>
  )
}

function TopPanel({
  id,
  defaultSize,
  onlyVisible,
}: {
  id: TopPanelId
  defaultSize: number
  onlyVisible: boolean
}) {
  const ref = useRef<ImperativePanelHandle>(null)
  const [collapsed, setCollapsed] = useState(false)
  const label = TOP_PANEL_LABELS[id]
  const order = TOP_PANEL_ORDER.indexOf(id)

  return (
    <ResizablePanel
      ref={ref}
      id={id}
      order={order}
      defaultSize={defaultSize}
      collapsible={!onlyVisible}
      collapsedSize={4}
      minSize={12}
      onCollapse={() => setCollapsed(true)}
      onExpand={() => setCollapsed(false)}
    >
      <div className="h-full *:h-full">
        {collapsed ? (
          <CollapsedStrip label={label} onExpand={() => ref.current?.expand()} />
        ) : onlyVisible ? (
          panelContent[id]
        ) : (
          <PanelMinimizeProvider onMinimize={() => ref.current?.collapse()}>
            {panelContent[id]}
          </PanelMinimizeProvider>
        )}
      </div>
    </ResizablePanel>
  )
}

export function Dashboard() {
  const topPanelVisible = useLayoutStore((s) => s.topPanelVisible)
  const visibleIds = TOP_PANEL_ORDER.filter((id) => topPanelVisible[id])
  const onlyVisible = visibleIds.length === 1

  return (
    <div
      style={{
        position: "fixed",
        inset: "0px",
        display: "grid",
        gridTemplateRows: "56px minmax(0, 2fr) minmax(0, 3fr)",
        overflow: "hidden",
      }}
      className="bg-background"
    >
      {/* Row 1: Transport Bar */}
      <div className="col-span-4">
        <TransportBar />
      </div>

      {/* Row 2: 4 resizable panels */}
      <div className={cn("col-span-4 flex min-h-0 h-full px-3 pt-3 pb-0")}>
        <ResizablePanelGroup
          direction="horizontal"
          autoSaveId="openbeam:top-row"
          className="h-full flex-1"
        >
          {visibleIds.map((id, idx) => (
            <Fragment key={id}>
              {idx > 0 && <ResizableHandle withHandle className="mx-1.5" />}
              <TopPanel
                id={id}
                defaultSize={100 / visibleIds.length}
                onlyVisible={onlyVisible}
              />
            </Fragment>
          ))}
        </ResizablePanelGroup>
      </div>

      {/* Row 3: Search + Detections */}
      <div className="col-span-4 grid min-h-0 grid-cols-[2fr_1fr] gap-3 px-3 pb-3 pt-3">
        <SearchPanel />
        <DetectionsPanel />
      </div>
    </div>
  )
}
