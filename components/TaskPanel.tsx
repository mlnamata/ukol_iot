'use client'

import { useState } from 'react'
import type { Task } from '@/lib/tasks'
import { TOTAL_POINTS } from '@/lib/tasks'

type Props = {
  tasks: Task[]
  /** Id splnenych kroku. */
  done: string[]
  points: number
  /** Ubehly cas v sekundach od prvniho prikazu. */
  elapsed: number
  onReset: () => void
  onShowTree: () => void
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TaskPanel({ tasks, done, points, elapsed, onReset, onShowTree }: Props) {
  const [openHint, setOpenHint] = useState<string | null>(null)

  // Aktualni krok = prvni nesplneny.
  const current = tasks.find((t) => !done.includes(t.id)) ?? tasks[tasks.length - 1]
  const progress = Math.round((points / TOTAL_POINTS) * 100)

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto rounded-lg border border-line bg-panel p-4">
      <header>
        <h1 className="text-base font-semibold text-accent">Úloha: Evidence ZOO v terminálu</h1>
        <p className="mt-1 text-xs leading-5 text-muted">
          Plň kroky psaním skutečných příkazů do terminálu vlevo. Splněný krok se odškrtne sám.
        </p>
      </header>

      {/* Body, progress a stopky */}
      <section className="rounded-md border border-line bg-bg p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Body</span>
          <span className="font-semibold text-accent">
            {points} / {TOTAL_POINTS}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span>Čas</span>
          <span className="tabular-nums text-fg">{formatTime(elapsed)}</span>
        </div>
      </section>

      {/* Karty kroku */}
      <ol className="flex flex-col gap-3">
        {tasks.map((task, i) => {
          const isDone = done.includes(task.id)
          const isCurrent = !isDone && task.id === current.id
          return (
            <li
              key={task.id}
              className={[
                'rounded-md border p-3 transition-colors',
                isDone
                  ? 'border-accent/50 bg-accent/5'
                  : isCurrent
                    ? 'border-line bg-bg'
                    : 'border-line bg-bg opacity-70',
              ].join(' ')}
            >
              <div className="flex items-start gap-2">
                <span
                  className={[
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs',
                    isDone ? 'pop border-accent bg-accent text-bg' : 'border-line text-muted',
                  ].join(' ')}
                  aria-hidden
                >
                  {isDone ? '✓' : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h2
                    className={[
                      'text-sm font-semibold',
                      isDone ? 'text-accent' : 'text-fg',
                    ].join(' ')}
                  >
                    Krok {i + 1} — {task.title}{' '}
                    <span className="font-normal text-muted">({task.points} b)</span>
                  </h2>
                  <ul className="mt-1 list-disc pl-4 text-xs leading-5 text-muted">
                    {task.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  {openHint === task.id && (
                    <p className="fade-in mt-2 rounded border border-line bg-panel p-2 text-xs leading-5 text-fg">
                      💡 {task.hint}
                    </p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      {/* Ovladaci tlacitka */}
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <button
          onClick={() => setOpenHint(openHint === current.id ? null : current.id)}
          className="rounded border border-line px-3 py-1.5 text-xs text-fg hover:border-accent hover:text-accent"
        >
          Nápověda
        </button>
        <button
          onClick={onShowTree}
          className="rounded border border-line px-3 py-1.5 text-xs text-fg hover:border-accent hover:text-accent"
        >
          Strom
        </button>
        <button
          onClick={onReset}
          className="rounded border border-line px-3 py-1.5 text-xs text-fg hover:border-danger hover:text-danger"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
