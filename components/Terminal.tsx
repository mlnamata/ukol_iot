'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { OutLine, Seg } from '@/lib/commands'
import { completions } from '@/lib/commands'
import type { FsState } from '@/lib/fs'

type Props = {
  /** Vypis na obrazovce - kazdy radek je pole barevnych segmentu. */
  screen: OutLine[]
  prompt: string
  fsState: FsState
  /** Historie zadanych prikazu (nejstarsi prvni) pro sipky nahoru/dolu. */
  commandHistory: string[]
  onSubmit: (command: string) => void
  onClear: () => void
}

const KIND_CLASS: Record<Seg['kind'], string> = {
  out: 'text-fg',
  err: 'text-danger',
  dir: 'text-dir',
  prompt: 'text-accent',
}

/** Nejdelsi spolecny prefix - pouziva se pri doplnovani tabulatorem. */
function commonPrefix(values: string[]): string {
  if (values.length === 0) return ''
  let prefix = values[0]
  for (const v of values.slice(1)) {
    let i = 0
    while (i < prefix.length && i < v.length && prefix[i] === v[i]) i++
    prefix = prefix.slice(0, i)
  }
  return prefix
}

export default function Terminal({
  screen,
  prompt,
  fsState,
  commandHistory,
  onSubmit,
  onClear,
}: Props) {
  const [input, setInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Autoscroll dolu po kazdem prikazu.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [screen, suggestions])

  const rendered = useMemo(
    () =>
      screen.map((line, i) => (
        <div key={i} className="whitespace-pre-wrap break-words leading-6">
          {line.segs.length === 0 ? (
            <>&nbsp;</>
          ) : (
            line.segs.map((seg, j) => (
              <span key={j} className={KIND_CLASS[seg.kind]}>
                {seg.text}
              </span>
            ))
          )}
        </div>
      )),
    [screen],
  )

  const submit = () => {
    const value = input
    setInput('')
    setHistoryIndex(null)
    setSuggestions([])
    onSubmit(value)
  }

  const handleTab = () => {
    const { prefix, matches } = completions(fsState, input)
    if (matches.length === 0) return
    const completed = commonPrefix(matches)
    if (completed.length > prefix.length) {
      setInput(input.slice(0, input.length - prefix.length) + completed)
      setSuggestions([])
    } else if (matches.length > 1) {
      setSuggestions(matches)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      handleTab()
      return
    }
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      onClear()
      return
    }
    if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault()
      setInput('')
      setHistoryIndex(null)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length === 0) return
      const next = historyIndex === null ? commandHistory.length - 1 : Math.max(0, historyIndex - 1)
      setHistoryIndex(next)
      setInput(commandHistory[next])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex === null) return
      const next = historyIndex + 1
      if (next >= commandHistory.length) {
        setHistoryIndex(null)
        setInput('')
      } else {
        setHistoryIndex(next)
        setInput(commandHistory[next])
      }
    }
  }

  return (
    <div
      className="term-scroll flex h-full flex-col overflow-y-auto rounded-lg border border-line bg-bg p-4 text-[13px] sm:text-sm"
      onClick={() => inputRef.current?.focus()}
      role="presentation"
    >
      <div className="flex-1">
        {rendered}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 py-1 text-muted">
            {suggestions.map((s) => (
              <span key={s} className={s.endsWith('/') ? 'text-dir' : 'text-fg'}>
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Vstupni radek je vzdy dole */}
      <div className="mt-1 flex items-start gap-2">
        <span className="shrink-0 text-accent">{prompt}</span>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="Příkazová řádka"
            className="w-full bg-transparent text-fg caret-transparent outline-none"
          />
          <span
            className="pointer-events-none absolute top-0 select-none"
            style={{ left: `${input.length}ch` }}
            aria-hidden
          >
            <span className="cursor text-accent">▋</span>
          </span>
        </div>
      </div>
      <div ref={bottomRef} />
    </div>
  )
}
