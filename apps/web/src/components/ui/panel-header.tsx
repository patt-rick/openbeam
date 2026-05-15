import * as React from "react"
import { MinusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const PanelMinimizeContext = React.createContext<(() => void) | null>(null)

export function PanelMinimizeProvider({
  onMinimize,
  children,
}: {
  onMinimize: () => void
  children: React.ReactNode
}) {
  return (
    <PanelMinimizeContext.Provider value={onMinimize}>
      {children}
    </PanelMinimizeContext.Provider>
  )
}

function PanelHeader({
  className,
  title,
  icon,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  title: string
  icon?: React.ReactNode
}) {
  const onMinimize = React.useContext(PanelMinimizeContext)
  return (
    <div
      data-slot="panel-header"
      className={cn(
        "flex min-h-11 items-center justify-between border-b border-border bg-card px-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
        className
      )}
      {...props}
    >
      <span className="flex items-center gap-2 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </span>
      <div className="flex items-center gap-1">
        {children}
        {onMinimize && (
          <button
            onClick={onMinimize}
            title="Minimize"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MinusIcon className="size-3" />
          </button>
        )}
      </div>
    </div>
  )
}

export { PanelHeader }
