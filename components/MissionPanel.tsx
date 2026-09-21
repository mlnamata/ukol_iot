'use client'

import { useState } from 'react'
import { MISSIONS, Mission, Step } from '@/lib/missions'

type Props = {
  done: string[]
  onShowTree: () => void
}

type StepState = 'done' | 'current' | 'locked'

/** Seznam misí. Další krok se odemyká až po splnění předchozího. */
export default function MissionPanel({ done, onShowTree }: Props) {
  const [openHint, setOpenHint] = useState<string | null>(null)

  const missionDone = (m: Mission) => m.steps.every((s) => done.includes(s.id))
  const currentIndex = MISSIONS.findIndex((m) => !missionDone(m))
  const activeIndex = currentIndex === -1 ? MISSIONS.length - 1 : currentIndex

  const stepState = (mission: Mission, step: Step, missionIndex: number): StepState => {
    if (done.includes(step.id)) return 'done'
    if (missionIndex !== activeIndex) return 'locked'
    const firstOpen = mission.steps.find((s) => !done.includes(s.id))
    return firstOpen?.id === step.id ? 'current' : 'locked'
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-5 text-muted">
        Úkol je rozdělený na mise a ty na dílčí kroky. Splň vždy aktuální krok — další se odemkne
        sám. Splněné kroky se už neodemykají zpět.
      </p>

      {MISSIONS.map((mission, mi) => {
        const finished = missionDone(mission)
        const locked = mi > activeIndex
        const doneCount = mission.steps.filter((s) => done.includes(s.id)).length

        return (
          <section
            key={mission.id}
            className={[
              'rounded-md border transition-colors',
              finished
                ? 'border-accent/50 bg-accent/5'
                : locked
                  ? 'border-line bg-bg opacity-50'
                  : 'border-line bg-bg',
            ].join(' ')}
          >
            <header className="flex items-start gap-2 border-b border-line/60 p-3">
              <span
                className={[
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px]',
                  finished
                    ? 'pop border-accent bg-accent text-bg'
                    : locked
                      ? 'border-line text-muted'
                      : 'border-accent text-accent',
                ].join(' ')}
                aria-hidden
              >
                {finished ? '✓' : locked ? '🔒' : mi + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className={['text-sm font-semibold', finished ? 'text-accent' : 'text-fg'].join(' ')}>
                  Mise {mi + 1} — {mission.title}
                </h3>
                <p className="text-[11px] text-muted">
                  {doneCount} / {mission.steps.length} kroků
                </p>
              </div>
            </header>

            {!locked && (
              <div className="space-y-2 p-3">
                <p className="rounded border border-line/60 bg-panel p-2 text-[11px] leading-5 text-muted">
                  {mission.story}
                </p>

                <ol className="space-y-1.5">
                  {mission.steps.map((step, si) => {
                    const state = stepState(mission, step, mi)
                    return (
                      <li
                        key={step.id}
                        className={[
                          'rounded border px-2.5 py-2 text-xs leading-5',
                          state === 'done'
                            ? 'border-accent/40 bg-accent/5 text-muted'
                            : state === 'current'
                              ? 'border-accent/70 bg-bg text-fg'
                              : 'border-line bg-bg text-muted opacity-60',
                        ].join(' ')}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={[
                              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px]',
                              state === 'done'
                                ? 'pop border-accent bg-accent text-bg'
                                : state === 'current'
                                  ? 'border-accent text-accent'
                                  : 'border-line text-muted',
                            ].join(' ')}
                            aria-hidden
                          >
                            {state === 'done' ? '✓' : state === 'locked' ? '·' : si + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            {state === 'locked' ? (
                              <span className="italic">Odemkne se po splnění předchozího kroku</span>
                            ) : (
                              step.text
                            )}
                          </span>
                        </div>

                        {state === 'current' && (
                          <div className="mt-1.5 pl-6">
                            <button
                              onClick={() => setOpenHint(openHint === step.id ? null : step.id)}
                              className="text-[11px] text-muted underline decoration-dotted hover:text-accent"
                            >
                              {openHint === step.id ? 'Skrýt nápovědu' : 'Nápověda'}
                            </button>
                            {openHint === step.id && (
                              <p className="fade-in mt-1.5 rounded border border-line bg-panel p-2 text-[11px] leading-5 text-fg">
                                💡 {step.hint}
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}
          </section>
        )
      })}

      <button
        onClick={onShowTree}
        className="self-start rounded border border-line px-3 py-1.5 text-xs text-fg hover:border-accent hover:text-accent"
      >
        Zobrazit strom areálu
      </button>
    </div>
  )
}
