'use client'

import { useState } from 'react'
import { DEMO_STEPS } from '@/lib/missions'

type Props = { done: string[] }

/**
 * Živá ukázka v terminálu na 5 minut - přesně scénář z papírového zadání.
 * Kroky se odemykají postupně, aby se ukázka dala odprezentovat popořadě.
 */
export default function DemoPanel({ done }: Props) {
  const [openHint, setOpenHint] = useState<string | null>(null)
  const currentId = DEMO_STEPS.find((s) => !done.includes(s.id))?.id ?? null
  const doneCount = DEMO_STEPS.filter((s) => done.includes(s.id)).length

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-accent">Živá ukázka na 5 minut</h3>
        <p className="mt-1 text-xs leading-5 text-muted">
          Nacvičený scénář, který pak předvedete před třídou: vytvořit adresářovou strukturu,
          zkopírovat do ní soubor, přejmenovat ho, najít příkazem find a ukázat velikost složky.
          Losuje se, kdo skupinu prezentuje — zvládnout to musí každý.
        </p>
        <p className="mt-2 text-xs text-muted">
          Splněno <span className="text-accent">{doneCount}</span> / {DEMO_STEPS.length}
        </p>
      </div>

      <ol className="space-y-2">
        {DEMO_STEPS.map((step, i) => {
          const isDone = done.includes(step.id)
          const isCurrent = step.id === currentId
          return (
            <li
              key={step.id}
              className={[
                'rounded border px-3 py-2 text-xs leading-5',
                isDone
                  ? 'border-accent/50 bg-accent/5 text-muted'
                  : isCurrent
                    ? 'border-accent/70 bg-bg text-fg'
                    : 'border-line bg-bg text-muted opacity-60',
              ].join(' ')}
            >
              <div className="flex items-start gap-2">
                <span
                  className={[
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px]',
                    isDone
                      ? 'pop border-accent bg-accent text-bg'
                      : isCurrent
                        ? 'border-accent text-accent'
                        : 'border-line text-muted',
                  ].join(' ')}
                  aria-hidden
                >
                  {isDone ? '✓' : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  {!isDone && !isCurrent ? (
                    <span className="italic">Odemkne se po splnění předchozího kroku</span>
                  ) : (
                    step.text
                  )}
                </span>
              </div>

              {isCurrent && (
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
  )
}
