'use client'

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import Terminal from '@/components/Terminal'
import TaskPanel, { formatTime } from '@/components/TaskPanel'
import FileTree from '@/components/FileTree'
import type { OutLine } from '@/lib/commands'
import { execute, promptFor } from '@/lib/commands'
import type { FsState, HistoryEntry } from '@/lib/fs'
import { getNode, initialFs } from '@/lib/fs'
import { formatTree } from '@/lib/format'
import { TASKS, TOTAL_POINTS } from '@/lib/tasks'

const STORAGE_KEY = 'zoo-terminal-state'
const STORAGE_VERSION = 1

// ---------------------------------------------------------------------------
// Stav aplikace
// ---------------------------------------------------------------------------

type AppState = {
  fs: FsState
  /** Vypis na obrazovce terminalu. */
  screen: OutLine[]
  /** Historie pro vyhodnocovani kroku. */
  history: HistoryEntry[]
  /** Zadane prikazy pro sipky nahoru/dolu. */
  commands: string[]
  done: string[]
  errors: number
  startedAt: number | null
  finishedAt: number | null
}

type Action =
  | { type: 'run'; input: string; now: number }
  | { type: 'clear' }
  | { type: 'reset' }
  | { type: 'hydrate'; state: AppState }

function welcome(): OutLine[] {
  const text = [
    'ZOO Terminal v1.0 - simulator Linuxoveho terminalu',
    'Napis "help" pro seznam prikazu, "tree" pro prehled adresaru.',
    '',
  ]
  return text.map((t) => ({ segs: [{ text: t, kind: 'out' as const }] }))
}

function initialState(): AppState {
  return {
    fs: initialFs(),
    screen: welcome(),
    history: [],
    commands: [],
    done: [],
    errors: 0,
    startedAt: null,
    finishedAt: null,
  }
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return action.state
    case 'clear':
      return { ...state, screen: [] }
    case 'reset':
      return initialState()
    case 'run': {
      const input = action.input
      const promptLine: OutLine = {
        segs: [
          { text: promptFor(state.fs) + ' ', kind: 'prompt' },
          { text: input, kind: 'out' },
        ],
      }

      if (input.trim() === '') {
        return { ...state, screen: [...state.screen, promptLine] }
      }

      const result = execute(state.fs, input)
      const entry: HistoryEntry = { command: input, cwd: state.fs.cwd, error: result.error }
      const history = [...state.history, entry]

      // Splneny krok se uz nikdy neodskrtne zpet.
      const done = [...state.done]
      for (const task of TASKS) {
        if (!done.includes(task.id) && task.check(result.state.root, history)) {
          done.push(task.id)
        }
      }

      const screen = result.clear ? [] : [...state.screen, promptLine, ...result.lines]
      const allDone = done.length === TASKS.length

      return {
        ...state,
        fs: result.state,
        screen,
        history,
        commands: [...state.commands, input],
        done,
        errors: state.errors + (result.error ? 1 : 0),
        startedAt: state.startedAt ?? action.now,
        finishedAt: allDone ? (state.finishedAt ?? action.now) : state.finishedAt,
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Ulozeni do localStorage (nemusi byt dostupne - vse v try/catch)
// ---------------------------------------------------------------------------

function save(state: AppState): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, state }),
    )
  } catch {
    // localStorage nedostupny (privatni rezim, zakazane cookies) - pokracujeme bez ulozeni.
  }
}

function load(): AppState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as { version?: number }).version !== STORAGE_VERSION
    ) {
      return null
    }
    const candidate = (parsed as { state?: AppState }).state
    if (!candidate || !candidate.fs || candidate.fs.root?.type !== 'dir') return null
    return candidate
  } catch {
    return null
  }
}

function clearStorage(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignorujeme
  }
}

// ---------------------------------------------------------------------------
// Stranka
// ---------------------------------------------------------------------------

export default function Page() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const [hydrated, setHydrated] = useState(false)
  const [treeOpen, setTreeOpen] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [victoryClosed, setVictoryClosed] = useState(false)

  // Nacteni ulozeneho stavu az na klientu - jinak by nesedela hydratace.
  useEffect(() => {
    const saved = load()
    if (saved) dispatch({ type: 'hydrate', state: saved })
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) save(state)
  }, [state, hydrated])

  // Stopky bezi od prvniho prikazu do splneni posledniho kroku.
  useEffect(() => {
    if (state.startedAt === null) {
      setElapsed(0)
      return
    }
    const end = state.finishedAt
    const tick = () => {
      const now = end ?? Date.now()
      setElapsed(Math.max(0, Math.floor((now - (state.startedAt as number)) / 1000)))
    }
    tick()
    if (end !== null) return
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [state.startedAt, state.finishedAt])

  const handleSubmit = useCallback((input: string) => {
    if (input.trim().split(/\s+/)[0] === 'reset') {
      const confirmed = window.confirm(
        'Opravdu vrátit souborový systém i zadání do výchozího stavu? Veškerý postup bude ztracen.',
      )
      if (confirmed) {
        clearStorage()
        dispatch({ type: 'reset' })
        setVictoryClosed(false)
        setShowSummary(false)
      }
      return
    }
    dispatch({ type: 'run', input, now: Date.now() })
  }, [])

  const handleReset = useCallback(() => {
    if (
      window.confirm(
        'Opravdu vrátit souborový systém i zadání do výchozího stavu? Veškerý postup bude ztracen.',
      )
    ) {
      clearStorage()
      dispatch({ type: 'reset' })
      setVictoryClosed(false)
      setShowSummary(false)
    }
  }, [])

  const treeLines = useMemo(() => {
    const node = getNode(state.fs.root, state.fs.cwd)
    return node ? formatTree(node, state.fs.cwd, true) : ['(prázdné)']
  }, [state.fs])

  const points = useMemo(
    () => TASKS.filter((t) => state.done.includes(t.id)).reduce((sum, t) => sum + t.points, 0),
    [state.done],
  )

  const allDone = state.done.length === TASKS.length

  return (
    <main className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-4 p-4 lg:h-screen">
      <div className="flex flex-1 flex-col gap-4 lg:min-h-0 lg:flex-row">
        <section className="h-[60vh] lg:h-auto lg:min-h-0 lg:basis-[65%]">
          <Terminal
            screen={state.screen}
            prompt={promptFor(state.fs)}
            fsState={state.fs}
            commandHistory={state.commands}
            onSubmit={handleSubmit}
            onClear={() => dispatch({ type: 'clear' })}
          />
        </section>
        <aside className="lg:min-h-0 lg:basis-[35%]">
          <TaskPanel
            tasks={TASKS}
            done={state.done}
            points={points}
            elapsed={elapsed}
            onReset={handleReset}
            onShowTree={() => setTreeOpen(true)}
          />
        </aside>
      </div>

      <FileTree open={treeOpen} lines={treeLines} onClose={() => setTreeOpen(false)} />

      {allDone && !victoryClosed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="fade-in w-full max-w-lg rounded-lg border border-accent/60 bg-panel p-6">
            <h2 className="text-lg font-semibold text-accent">🎉 Hotovo! Všechny kroky splněny</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded border border-line bg-bg p-3">
                <dt className="text-xs text-muted">Body</dt>
                <dd className="text-accent">
                  {points} / {TOTAL_POINTS}
                </dd>
              </div>
              <div className="rounded border border-line bg-bg p-3">
                <dt className="text-xs text-muted">Čas</dt>
                <dd className="tabular-nums">{formatTime(elapsed)}</dd>
              </div>
              <div className="rounded border border-line bg-bg p-3">
                <dt className="text-xs text-muted">Použité příkazy</dt>
                <dd className="tabular-nums">{state.commands.length}</dd>
              </div>
              <div className="rounded border border-line bg-bg p-3">
                <dt className="text-xs text-muted">Chyby</dt>
                <dd className="tabular-nums text-danger">{state.errors}</dd>
              </div>
            </dl>

            {showSummary && (
              <pre className="term-scroll mt-4 max-h-56 overflow-auto rounded border border-line bg-bg p-3 text-xs leading-5">
                {state.commands.map((c, i) => `${String(i + 1).padStart(3)}  ${c}`).join('\n')}
              </pre>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => setShowSummary((v) => !v)}
                className="rounded border border-line px-3 py-1.5 text-xs hover:border-accent hover:text-accent"
              >
                {showSummary ? 'Skrýt přehled' : 'Zobrazit přehled příkazů, které jsem použil'}
              </button>
              <button
                onClick={() => setVictoryClosed(true)}
                className="rounded border border-accent bg-accent/10 px-3 py-1.5 text-xs text-accent"
              >
                Zavřít
              </button>
              <button
                onClick={handleReset}
                className="rounded border border-line px-3 py-1.5 text-xs hover:border-danger hover:text-danger"
              >
                Začít znovu
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
