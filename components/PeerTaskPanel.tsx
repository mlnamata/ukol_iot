'use client'

import { useMemo, useState } from 'react'
import {
  CHECK_LABELS,
  CheckKind,
  PeerCheck,
  PeerTask,
  decodeTask,
  describeCheck,
  encodeTask,
  stepValid,
} from '@/lib/peerTask'

type Props = {
  task: PeerTask
  onTaskChange: (task: PeerTask) => void
  imported: PeerTask | null
  onImport: (task: PeerTask | null) => void
  solvedSteps: number[]
}

const INPUT =
  'w-full rounded border border-line bg-panel px-2 py-1.5 text-[11px] text-fg outline-none focus:border-accent'

/** Úloha pro jinou skupinu: sestavení vlastní a řešení cizí. */
export default function PeerTaskPanel({
  task,
  onTaskChange,
  imported,
  onImport,
  solvedSteps,
}: Props) {
  const [mode, setMode] = useState<'build' | 'solve'>('build')
  const [code, setCode] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const validSteps = task.steps.filter(stepValid).length
  const exportCode = useMemo(
    () => (validSteps === task.steps.length && task.title.trim() ? encodeTask(task) : null),
    [task, validSteps],
  )

  const setStep = (i: number, patch: Partial<PeerTask['steps'][number]>) => {
    const steps = task.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s))
    onTaskChange({ ...task, steps })
  }

  const setCheck = (i: number, patch: Partial<PeerCheck>) => {
    setStep(i, { check: { ...task.steps[i].check, ...patch } })
  }

  const doImport = () => {
    const parsed = decodeTask(code)
    if (!parsed) {
      setImportError('Kód se nepodařilo načíst. Zkontroluj, že jsi ho zkopíroval celý.')
      return
    }
    setImportError(null)
    onImport(parsed)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1 rounded border border-line bg-bg p-1">
        {(
          [
            ['build', 'Sestavit úlohu'],
            ['solve', 'Řešit cizí úlohu'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={[
              'flex-1 rounded px-2 py-1.5 text-[11px]',
              mode === id ? 'bg-accent/10 text-accent' : 'text-muted hover:text-fg',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'build' ? (
        <>
          <p className="text-xs leading-5 text-muted">
            Sestav pro jinou skupinu úlohu o třech krocích. U každého kroku vyber, jak se{' '}
            <strong className="text-fg">strojově ověří</strong> správný výsledek — bez toho úloha
            neplatí.
          </p>

          <label className="text-[11px] text-muted">
            Název úlohy
            <input
              value={task.title}
              onChange={(e) => onTaskChange({ ...task, title: e.target.value })}
              placeholder="např. Nová voliéra pro papoušky"
              className={`mt-1 ${INPUT}`}
            />
          </label>

          {task.steps.map((step, i) => {
            const valid = stepValid(step)
            return (
              <section
                key={i}
                className={[
                  'rounded-md border p-3',
                  valid ? 'border-accent/50 bg-accent/5' : 'border-line bg-bg',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-fg">Krok {i + 1}</h4>
                  <span className={['text-[11px]', valid ? 'text-accent' : 'text-muted'].join(' ')}>
                    {valid ? '✓ ověřitelný' : 'nedokončeno'}
                  </span>
                </div>

                <div className="mt-2 space-y-2">
                  <input
                    value={step.title}
                    onChange={(e) => setStep(i, { title: e.target.value })}
                    placeholder="Krátký název kroku"
                    className={INPUT}
                  />
                  <textarea
                    value={step.instruction}
                    onChange={(e) => setStep(i, { instruction: e.target.value })}
                    rows={2}
                    placeholder="Zadání pro druhou skupinu — co přesně má udělat"
                    className={`resize-none ${INPUT}`}
                  />

                  <div className="rounded border border-line/60 bg-panel p-2">
                    <p className="text-[11px] text-muted">Jak se ověří výsledek</p>
                    <select
                      value={step.check.kind}
                      onChange={(e) => setCheck(i, { kind: e.target.value as CheckKind })}
                      className={`mt-1 ${INPUT}`}
                    >
                      {(Object.keys(CHECK_LABELS) as CheckKind[]).map((k) => (
                        <option key={k} value={k}>
                          {CHECK_LABELS[k]}
                        </option>
                      ))}
                    </select>

                    {step.check.kind === 'command-used' ? (
                      <div className="mt-1.5 flex gap-1.5">
                        <input
                          value={step.check.command}
                          onChange={(e) => setCheck(i, { command: e.target.value })}
                          placeholder="příkaz, např. mkdir"
                          className={INPUT}
                        />
                        <input
                          value={step.check.flags}
                          onChange={(e) => setCheck(i, { flags: e.target.value })}
                          placeholder="přepínače, např. p"
                          className={INPUT}
                        />
                      </div>
                    ) : (
                      <input
                        value={step.check.path}
                        onChange={(e) => setCheck(i, { path: e.target.value })}
                        placeholder="cesta, např. ~/zoo/voliera"
                        className={`mt-1.5 ${INPUT}`}
                      />
                    )}

                    {step.check.kind === 'file-contains' && (
                      <input
                        value={step.check.text}
                        onChange={(e) => setCheck(i, { text: e.target.value })}
                        placeholder="text, který musí soubor obsahovat"
                        className={`mt-1.5 ${INPUT}`}
                      />
                    )}

                    <p className="mt-1.5 text-[11px] text-muted">
                      Ověření: <span className="text-fg">{describeCheck(step.check)}</span>
                    </p>
                  </div>
                </div>
              </section>
            )
          })}

          <div className="rounded-md border border-line bg-bg p-3">
            <p className="text-[11px] text-muted">
              Kód k předání jiné skupině ({validSteps} / {task.steps.length} kroků hotovo)
            </p>
            {exportCode ? (
              <>
                <textarea
                  readOnly
                  value={exportCode}
                  rows={3}
                  onFocus={(e) => e.currentTarget.select()}
                  className={`mt-1.5 resize-none font-mono ${INPUT}`}
                />
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(exportCode).then(
                      () => setCopied(true),
                      () => setCopied(false),
                    )
                  }}
                  className="mt-1.5 rounded border border-line px-3 py-1.5 text-[11px] text-fg hover:border-accent hover:text-accent"
                >
                  {copied ? 'Zkopírováno ✓' : 'Zkopírovat kód'}
                </button>
              </>
            ) : (
              <p className="mt-1 text-[11px] italic text-muted">
                Kód se vygeneruje, až budou vyplněné všechny tři kroky a název úlohy.
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-xs leading-5 text-muted">
            Vlož kód úlohy od jiné skupiny a vyřeš ji v terminálu. Kroky se odemykají postupně.
          </p>

          <div className="rounded-md border border-line bg-bg p-3">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={3}
              placeholder="ZOO1-…"
              className={`resize-none font-mono ${INPUT}`}
            />
            <div className="mt-1.5 flex gap-2">
              <button
                onClick={doImport}
                className="rounded border border-accent bg-accent/10 px-3 py-1.5 text-[11px] text-accent"
              >
                Načíst úlohu
              </button>
              {imported && (
                <button
                  onClick={() => {
                    onImport(null)
                    setCode('')
                  }}
                  className="rounded border border-line px-3 py-1.5 text-[11px] text-muted hover:border-danger hover:text-danger"
                >
                  Odebrat
                </button>
              )}
            </div>
            {importError && <p className="mt-1.5 text-[11px] text-danger">{importError}</p>}
          </div>

          {imported && (
            <section className="rounded-md border border-line bg-bg p-3">
              <h4 className="text-sm font-semibold text-accent">{imported.title}</h4>
              <p className="text-[11px] text-muted">
                Autor: {imported.author || '—'} · {imported.skupina || '—'}
              </p>

              <ol className="mt-3 space-y-2">
                {imported.steps.map((step, i) => {
                  const isDone = solvedSteps.includes(i)
                  const isCurrent = !isDone && solvedSteps.length === i
                  return (
                    <li
                      key={i}
                      className={[
                        'rounded border px-2.5 py-2 text-[11px] leading-5',
                        isDone
                          ? 'border-accent/50 bg-accent/5 text-muted'
                          : isCurrent
                            ? 'border-accent/70 bg-panel text-fg'
                            : 'border-line bg-panel text-muted opacity-60',
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
                        <div className="min-w-0 flex-1">
                          <strong className="text-fg">{step.title}</strong>
                          {isDone || isCurrent ? (
                            <>
                              <p>{step.instruction}</p>
                              <p className="mt-1 text-muted">
                                Ověření: {describeCheck(step.check)}
                              </p>
                            </>
                          ) : (
                            <p className="italic">Odemkne se po splnění předchozího kroku</p>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          )}
        </>
      )}
    </div>
  )
}
