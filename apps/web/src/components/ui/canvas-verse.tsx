import { useRef, useEffect, useState, memo } from "react"
import { renderVerse } from "@/lib/verse-renderer"
import type { BroadcastTheme, VerseRenderData } from "@/types"
import { cn } from "@/lib/utils"

interface CanvasVerseProps {
  theme: BroadcastTheme
  verse: VerseRenderData | null
  className?: string
}

export const CanvasVerse = memo(function CanvasVerse({
  theme,
  verse,
  className,
}: CanvasVerseProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Measure container width AND height so we can contain-fit within both.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      setContainerSize({ width: rect.width, height: rect.height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Render to canvas at display size — contain-fit: pick the larger axis that
  // still keeps the canvas inside the container, preserving aspect ratio.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || containerSize.width === 0 || containerSize.height === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const aspectRatio = theme.resolution.width / theme.resolution.height
    let displayW = containerSize.width
    let displayH = displayW / aspectRatio
    if (displayH > containerSize.height) {
      displayH = containerSize.height
      displayW = displayH * aspectRatio
    }

    canvas.width = displayW * dpr
    canvas.height = displayH * dpr
    canvas.style.width = `${displayW}px`
    canvas.style.height = `${displayH}px`

    ctx.scale(dpr, dpr)
    const scale = displayW / theme.resolution.width
    renderVerse(ctx, theme, verse, { scale })
  }, [theme, verse, containerSize])

  return (
    <div ref={containerRef} className={cn("flex h-full w-full items-center justify-center", className)}>
      <canvas ref={canvasRef} className="rounded-md" />
    </div>
  )
})
