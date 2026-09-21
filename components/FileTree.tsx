'use client'

import { useEffect } from 'react'

type Props = {
  open: boolean
  lines: string[]
  onClose: () => void
}

/** Modal se stromem aktualniho souboroveho systemu. */
export default function FileTree({ open, lines, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="fade-in flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-line bg-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Strom souborového systému"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-accent">Strom souborového systému</h2>
          <button
            onClick={onClose}
            className="rounded border border-line px-2 py-1 text-xs text-muted hover:text-fg"
          >
            Zavřít (Esc)
          </button>
        </div>
        <pre className="term-scroll overflow-auto p-4 text-[13px] leading-6 text-fg">
          {lines.join('\n')}
        </pre>
      </div>
    </div>
  )
}
