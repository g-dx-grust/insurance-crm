'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { PenLine, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Point {
  x: number
  y: number
}

export function SignaturePadField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const isEmpty = !value

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-border bg-bg p-3">
        <div
          className="flex h-28 items-center justify-center rounded-sm border border-border bg-[color:var(--color-bg-secondary)] bg-contain bg-center bg-no-repeat"
          style={value ? { backgroundImage: `url(${value})` } : undefined}
        >
          {isEmpty && <p className="text-xs text-text-muted">署名未入力</p>}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-text-muted">
            {isEmpty ? '署名未入力' : '署名入力済み'}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            <PenLine className="size-3.5" />
            {isEmpty ? 'サインを入力' : 'サインを編集'}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="inset-3 top-3 left-3 h-[calc(100dvh-1.5rem)] max-w-none translate-x-0 translate-y-0 grid-rows-[auto_1fr_auto] gap-0 rounded-md p-0 sm:max-w-none"
        >
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle>電子サイン</DialogTitle>
          </DialogHeader>
          <SignatureCanvas value={value} onChange={onChange} />
          <DialogFooter className="mx-0 mb-0 rounded-b-md border-t border-border bg-[color:var(--color-bg-secondary)] px-5 py-3">
            <Button type="button" variant="outline" onClick={() => onChange('')}>
              <RotateCcw className="size-4" />
              クリア
            </Button>
            <Button type="button" onClick={() => setOpen(false)}>
              完了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SignatureCanvas({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<Point | null>(null)
  const valueRef = useRef(value)

  const prepareCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.floor(rect.width * ratio))
    canvas.height = Math.max(1, Math.floor(rect.height * ratio))

    const context = canvas.getContext('2d')
    if (!context) return

    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, rect.width, rect.height)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 2.4
    context.strokeStyle =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-text')
        .trim() || 'currentColor'

    if (valueRef.current) {
      const image = new Image()
      image.onload = () => {
        context.drawImage(image, 0, 0, rect.width, rect.height)
      }
      image.src = valueRef.current
    }
  }, [])

  useEffect(() => {
    valueRef.current = value
    prepareCanvas()
  }, [prepareCanvas, value])

  useEffect(() => {
    prepareCanvas()
    const canvas = canvasRef.current
    if (!canvas) return

    const observer = new ResizeObserver(() => prepareCanvas())
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [prepareCanvas])

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const commitCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    valueRef.current = dataUrl
    onChange(dataUrl)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    const point = getPoint(event)
    lastPointRef.current = point

    const context = canvasRef.current?.getContext('2d')
    if (!context) return
    context.beginPath()
    context.arc(point.x, point.y, 1.2, 0, Math.PI * 2)
    context.fillStyle = context.strokeStyle
    context.fill()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const lastPoint = lastPointRef.current
    if (!canvas || !context || !lastPoint) return

    const nextPoint = getPoint(event)
    context.beginPath()
    context.moveTo(lastPoint.x, lastPoint.y)
    context.lineTo(nextPoint.x, nextPoint.y)
    context.stroke()
    lastPointRef.current = nextPoint
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastPointRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    commitCanvas()
  }

  return (
    <div className="min-h-0 p-4">
      <div className="h-full rounded-md border border-border bg-bg p-2">
        <canvas
          ref={canvasRef}
          className="block h-full min-h-96 w-full touch-none rounded-sm bg-[color:var(--color-bg-secondary)]"
          aria-label="電子サイン入力欄"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
    </div>
  )
}
