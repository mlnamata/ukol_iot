'use client'

import { useState } from 'react'
import type { Task } from '@/lib/tasks'
import { TOTAL_POINTS } from '@/lib/tasks'

type Props = {
  tasks: Task[]
  /** Id splnenych kroku. */
  done: string[]
  /** Id preskocenych kroku - vyrizene, ale bez bodu. */
  skipped: string[]
  points: number
  /** Ubehly cas v sekundach od prvniho prikazu. */
  elapsed: number
  onReset: () => void
  onShowTree: () => void
  onSkip: (id: string) => void
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TaskPanel({
  tasks,
  done,
  skipped,
  points,
  elapsed,
  onReset,
  onShowTree,
  onSkip,
}: Props) {
  const [openHint, setOpenHint] = useState<string | null>(null)

  // Aktualni krok = prvni, ktery neni ani splneny, ani preskoceny.
  const current =
    tasks.find((t) => !done.includes(t.id) && !skipped.includes(t.id)) ?? tasks[tasks.length - 1]

  const confirmSkip = (task: Task) => {
    const ok = window.confirm(
      `Opravdu přeskočit krok „${task.title}"? Nezískáš za něj body (${task.points} b). ` +
        'Pokud ho později přesto splníš, body se ti připíšou.',
    )
    if (ok) onSkip(task.id)
  }
  const progress = Math.round((points / TOTAL_POINTS) * 100)

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto rounded-lg border border-line bg-panel p-4">
      <header>
        <h1 className="text-base font-semibold text-accent">
          Cvičení: souborový systém Linuxu
        </h1>
        <p className="mt-1 text-xs leading-5 text-muted">
          U každého cvičení jsou uvedené příkazy — přepiš je do terminálu vlevo. Splněné cvičení se
          odškrtne samo. Tlačítkem „Vysvětlení" si zobrazíš, co jednotlivé příkazy dělají.
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
          const isSkipped = !isDone && skipped.includes(task.id)
          const isCurrent = !isDone && !isSkipped && task.id === current.id
          return (
            <li
              key={task.id}
              className={[
                'rounded-md border p-3 transition-colors',
                isDone
                  ? 'border-accent/50 bg-accent/5'
                  : isSkipped
                    ? 'border-line bg-bg opacity-60'
                    : isCurrent
                      ? 'border-line bg-bg'
                      : 'border-line bg-bg opacity-70',
              ].join(' ')}
            >
              <div className="flex items-start gap-2">
                <span
                  className={[
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs',
                    isDone
                      ? 'pop border-accent bg-accent text-bg'
                      : isSkipped
                        ? 'border-muted text-muted'
                        : 'border-line text-muted',
                  ].join(' ')}
                  aria-hidden
                >
                  {isDone ? '✓' : isSkipped ? '↷' : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h2
                    className={[
                      'text-sm font-semibold',
                      isDone ? 'text-accent' : 'text-fg',
                    ].join(' ')}
                  >
                    Cvičení {i + 1} — {task.title}{' '}
                    <span className="font-normal text-muted">({task.points} b)</span>
                    {isSkipped && (
                      <span className="ml-2 rounded border border-line px-1.5 py-0.5 text-[10px] font-normal text-muted">
                        přeskočeno, 0 b
                      </span>
                    )}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-muted">{task.intro}</p>

                  {/* Prikazy k prepsani do terminalu */}
                  <div className="mt-2 rounded border border-line bg-bg p-2">
                    {task.commands.map((cmd) => (
                      <div key={cmd} className="flex gap-2 text-xs leading-6">
                        <span className="shrink-0 select-none text-accent">$</span>
                        <code className="min-w-0 break-all text-fg">{cmd}</code>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => setOpenHint(openHint === task.id ? null : task.id)}
                      className="rounded border border-line px-2 py-1 text-[11px] text-muted hover:border-accent hover:text-accent"
                    >
                      {openHint === task.id ? 'Skrýt vysvětlení' : 'Vysvětlení'}
                    </button>
                    {isCurrent && (
                      <button
                        onClick={() => confirmSkip(task)}
                        className="rounded border border-line px-2 py-1 text-[11px] text-muted hover:border-danger hover:text-danger"
                      >
                        Přeskočit (bez bodů)
                      </button>
                    )}
                  </div>

                  {openHint === task.id && (
                    <ul className="fade-in mt-2 list-disc space-y-1 rounded border border-line bg-panel p-2 pl-6 text-[11px] leading-5 text-fg">
                      {task.explanation.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
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
