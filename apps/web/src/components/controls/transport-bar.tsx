import { useState } from "react"
import { LevelMeter } from "@/components/ui/level-meter"
import { LiveIndicator } from "@/components/ui/live-indicator"
import { Badge } from "@/components/ui/badge"
import { MicIcon, PaletteIcon, CastIcon, SunIcon, MoonIcon, LayoutIcon, CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SettingsDialog } from "@/components/settings-dialog"
import { ThemeDesigner } from "@/components/broadcast/theme-designer"
import { BroadcastSettings } from "@/components/broadcast/broadcast-settings"
import {
  useAudioStore,
  useTranscriptStore,
  useBroadcastStore,
  useLayoutStore,
  TOP_PANEL_LABELS,
  TOP_PANEL_ORDER,
} from "@/stores"
import { useTheme } from "@/components/theme-provider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function TransportBar() {
  const { theme, setTheme } = useTheme()
  const audioLevel = useAudioStore((s) => s.level)
  const isTranscribing = useTranscriptStore((s) => s.isTranscribing)
  const [broadcastOpen, setBroadcastOpen] = useState(false)

  return (
    <div
      data-slot="transport-bar"
      className="col-span-4 flex h-14 items-center justify-between border-b border-border  bg-card px-3"
    >
      {/* Left: Logo + Plan Badge */}
      <div className="flex items-center gap-2.5">
        <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
          openbeam
        </span>
        <Badge variant="outline" className="text-[0.5625rem] uppercase">
          Free
        </Badge>
      </div>

      {/* Right: Audio + Status + Settings */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <MicIcon className="size-3.5 text-muted-foreground" />
          <LevelMeter level={audioLevel.rms} bars={4} />
        </div>
        <LiveIndicator active={isTranscribing} />
        <Button
          variant="ghost"
          size="icon-sm"
          title="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <SunIcon className="size-3.5" />
          ) : (
            <MoonIcon className="size-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Broadcast Settings"
          data-tour="broadcast"
          onClick={() => setBroadcastOpen(true)}
        >
          <CastIcon className="size-3.5" />
        </Button>
        <BroadcastSettings open={broadcastOpen} onOpenChange={setBroadcastOpen} />
        <Button
          variant="ghost"
          size="icon-sm"
          title="Theme Designer"
          data-tour="theme"
          onClick={() => useBroadcastStore.getState().setDesignerOpen(true)}
        >
          <PaletteIcon className="size-3.5" />
        </Button>
        <ThemeDesigner />
        <PanelVisibilityMenu />
        <SettingsDialog />
      </div>
    </div>
  )
}

function PanelVisibilityMenu() {
  const visible = useLayoutStore((s) => s.topPanelVisible)
  const toggle = useLayoutStore((s) => s.togglePanelVisible)
  const visibleCount = Object.values(visible).filter(Boolean).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" title="Show / hide panels">
          <LayoutIcon className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 gap-1 p-2">
        <div className="px-2 py-1 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
          Top row panels
        </div>
        {TOP_PANEL_ORDER.map((id) => {
          const checked = visible[id]
          const isLast = checked && visibleCount === 1
          return (
            <button
              key={id}
              disabled={isLast}
              onClick={() => toggle(id)}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>{TOP_PANEL_LABELS[id]}</span>
              {checked && <CheckIcon className="size-3.5 text-primary" />}
            </button>
          )
        })}
        <div className="px-2 pt-1 text-[0.5625rem] text-muted-foreground">
          Drag dividers to resize. Click the chevron in any panel to minimize it.
        </div>
      </PopoverContent>
    </Popover>
  )
}
