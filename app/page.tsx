'use client'

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import Terminal from '@/components/Terminal'
import FileTree from '@/components/FileTree'
import Login from '@/components/Login'
import Briefing from '@/components/Briefing'
import MissionPanel from '@/components/MissionPanel'
import DemoPanel from '@/components/DemoPanel'
import PeerTaskPanel from '@/components/PeerTaskPanel'
import Scoreboard from '@/components/Scoreboard'
import type { OutLine } from '@/lib/commands'
import { execute, promptFor } from '@/lib/commands'
import type { FsState, HistoryEntry } from '@/lib/fs'
import { getNode, initialFs } from '@/lib/fs'
import { formatTree } from '@/lib/format'
import { ALL_MISSION_STEPS, DEMO_STEPS, MISSIONS } from '@/lib/missions'
import { Member, PHASES, Profile, TAB_LABELS, TabId, roleName } from '@/lib/course'
import { PeerTask, emptyTask, evaluate, stepValid } from '@/lib/peerTask'
import { Criterion, share, sumEarned, gradeFor } from '@/lib/grading'

const STORAGE_KEY = 'zoo-terminal-state'
const STORAGE_VERSION = 2

// ---------------------------------------------------------------------------
// Stav aplikace
// ---------------------------------------------------------------------------

type AppState = {
  profile: Profile | null
  briefingSeen: boolean
  phase: number
  tab: TabId
  fs: FsState
  screen: OutLine[]
  history: HistoryEntry[]
  commands: string[]
  errors: number
  startedAt: number | null
  /** Splnene kroky misi - odemykaji se postupne. */
  doneSteps: string[]
  /** Splnene kroky zive ukazky. */
  demoDone: string[]
  /** Body za tahák - ten zpracovává jiný člen skupiny mimo aplikaci. */
  tahakPoints: number
  members: Member[]
  peerTask: PeerTask
  imported: PeerTask | null
  /** Indexy vyresenych kroku cizi ulohy. */
  solvedSteps: number[]
  celebrated: boolean
}

type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'login'; profile: Profile }
  | { type: 'accept' }
  | { type: 'run'; input: string; now: number }
  | { type: 'clear' }
  | { type: 'reset' }
  | { type: 'tab'; tab: TabId }
  | { type: 'phase'; phase: number }
  | { type: 'tahakPoints'; value: number }
  | { type: 'members'; members: Member[] }
  | { type: 'peerTask'; task: PeerTask }
  | { type: 'import'; task: PeerTask | null }
  | { type: 'celebrated' }

function welcome(): OutLine[] {
  return [
    'ZOO Plzen - evidencni server v1.0',
    'Napis "help" pro seznam prikazu, "tree" pro prehled adresaru.',
    '',
  ].map((t) => ({ segs: [{ text: t, kind: 'out' as const }] }))
}

function initialState(): AppState {
  return {
    profile: null,
    briefingSeen: false,
    phase: 1,
    tab: 'mise',
    fs: initialFs(),
    screen: welcome(),
    history: [],
    commands: [],
    errors: 0,
    startedAt: null,
    doneSteps: [],
    demoDone: [],
    tahakPoints: 0,
    members: [],
    peerTask: emptyTask('', ''),
    imported: null,
    solvedSteps: [],
    celebrated: false,
  }
}

/**
 * Postupne odemykani: zkusi splnit vzdy jen nejblizsi nesplneny krok.
 * Kdyz ho jeden prikaz splni, hned se zkousi dalsi - student tak neprijde
 * o postup, ani kdyz udela vic veci najednou, ale poradi zustava zachovane.
 */
function advance<T extends { id: string }>(
  steps: T[],
  done: string[],
  passes: (step: T) => boolean,
): string[] {
  const result = [...done]
  for (;;) {
    const next = steps.find((s) => !result.includes(s.id))
    if (!next || !passes(next)) break
    result.push(next.id)
  }
  return result
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return action.state
    case 'login':
      return {
        ...state,
        profile: action.profile,
        peerTask: emptyTask(action.profile.name, action.profile.skupina),
        members: [
          {
            id: 'me',
            name: action.profile.name,
            role: action.profile.role,
            rating: 3,
          },
        ],
      }
    case 'accept':
      return { ...state, briefingSeen: true }
    case 'tab':
      return { ...state, tab: action.tab }
    case 'phase': {
      const phase = PHASES.find((p) => p.id === action.phase)
      return { ...state, phase: action.phase, tab: phase?.tabs[0] ?? state.tab }
    }
    case 'tahakPoints':
      return { ...state, tahakPoints: Math.max(0, Math.min(30, Math.round(action.value))) }
    case 'members':
      return { ...state, members: action.members }
    case 'peerTask':
      return { ...state, peerTask: action.task }
    case 'import':
      return { ...state, imported: action.task, solvedSteps: [] }
    case 'celebrated':
      return { ...state, celebrated: true }
    case 'clear':
      return { ...state, screen: [] }
    case 'reset': {
      const fresh = initialState()
      // Prihlaseni i slozeni skupiny zustava, resetuje se jen prace.
      return {
        ...fresh,
        profile: state.profile,
        briefingSeen: state.briefingSeen,
        phase: state.phase,
        tab: state.tab,
        members: state.members,
        peerTask: state.peerTask,
      }
    }
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
      const root = result.state.root

      const doneSteps = advance(ALL_MISSION_STEPS, state.doneSteps, (s) => s.check(root, history))
      const demoDone = advance(DEMO_STEPS, state.demoDone, (s) => s.check(root, history))

      // Cizi uloha se resi take popořadě.
      const solvedSteps = [...state.solvedSteps]
      if (state.imported) {
        for (;;) {
          const i = solvedSteps.length
          const step = state.imported.steps[i]
          if (!step || !evaluate(step.check, root, history)) break
          solvedSteps.push(i)
        }
      }

      return {
        ...state,
        fs: result.state,
        screen: result.clear ? [] : [...state.screen, promptLine, ...result.lines],
        history,
        commands: [...state.commands, input],
        errors: state.errors + (result.error ? 1 : 0),
        startedAt: state.startedAt ?? action.now,
        doneSteps,
        demoDone,
        solvedSteps,
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Ulozeni do localStorage (nemusi byt dostupne - vse v try/catch)
// ---------------------------------------------------------------------------

function save(state: AppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, state }))
  } catch {
    // localStorage nedostupny (privatni rezim) - pokracujeme bez ukladani.
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
    return { ...initialState(), ...candidate }
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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Stranka
// ---------------------------------------------------------------------------

export default function Page() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const [hydrated, setHydrated] = useState(false)
  const [treeOpen, setTreeOpen] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const saved = load()
    if (saved) dispatch({ type: 'hydrate', state: saved })
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) save(state)
  }, [state, hydrated])

  // Stopky bezi od prvniho prikazu.
  useEffect(() => {
    if (state.startedAt === null) {
      setElapsed(0)
      return
    }
    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - (state.startedAt as number)) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [state.startedAt])

  const handleSubmit = useCallback((input: string) => {
    if (input.trim().split(/\s+/)[0] === 'reset') {
      if (window.confirm('Opravdu vrátit souborový systém i postup do výchozího stavu?')) {
        dispatch({ type: 'reset' })
      }
      return
    }
    dispatch({ type: 'run', input, now: Date.now() })
  }, [])

  const handleReset = useCallback(() => {
    if (window.confirm('Opravdu vrátit souborový systém i postup do výchozího stavu?')) {
      dispatch({ type: 'reset' })
    }
  }, [])

  const treeLines = useMemo(() => {
    const node = getNode(state.fs.root, state.fs.cwd)
    return node ? formatTree(node, state.fs.cwd, true) : ['(prázdné)']
  }, [state.fs])

  // Hodnoceni podle tabulky ze zadani.
  const criteria = useMemo<Criterion[]>(() => {
    const taskSteps = state.peerTask.title.trim()
      ? state.peerTask.steps.filter(stepValid).length
      : 0
    const importedTotal = state.imported?.steps.length ?? 3
    const avgRating =
      state.members.length > 0
        ? state.members.reduce((s, m) => s + m.rating, 0) / state.members.length
        : 0

    return [
      {
        id: 'tahak',
        label: 'Tahák — věcná správnost, funkční příklady, přehlednost',
        max: 30,
        earned: state.tahakPoints,
        note: 'zpracovává jiný člen skupiny mimo aplikaci — body doplňte ručně',
        editable: true,
      },
      {
        id: 'ukazka',
        label: 'Živá ukázka — příkazy fungují, vylosovaný žák je umí vysvětlit',
        max: 25,
        earned: share(state.demoDone.length, DEMO_STEPS.length, 25),
        note: `${state.demoDone.length} / ${DEMO_STEPS.length} kroků nacvičeno`,
      },
      {
        id: 'uloha',
        label: 'Kvalita připravené úlohy — jasné zadání, ověřitelný výsledek',
        max: 15,
        earned: share(taskSteps, 3, 15),
        note: `${taskSteps} / 3 kroky ověřitelné`,
      },
      {
        id: 'reseni',
        label: 'Vyřešení úlohy od jiné skupiny',
        max: 15,
        earned: share(state.solvedSteps.length, importedTotal, 15),
        note: state.imported
          ? `${state.solvedSteps.length} / ${importedTotal} kroků vyřešeno`
          : 'zatím nenačtena žádná cizí úloha',
      },
      {
        id: 'spoluprace',
        label: 'Spolupráce — vzájemné hodnocení členů skupiny',
        max: 15,
        earned: Math.round((avgRating / 3) * 15),
        note:
          state.members.length > 0
            ? `průměr ${avgRating.toFixed(1)} / 3 od ${state.members.length} členů`
            : 'zatím nevyplněno',
      },
    ]
  }, [state])

  const total = sumEarned(criteria)
  const missionsDone = state.doneSteps.length === ALL_MISSION_STEPS.length

  if (!hydrated) return <div className="min-h-screen bg-bg" />
  if (!state.profile) return <Login onLogin={(profile) => dispatch({ type: 'login', profile })} />
  if (!state.briefingSeen) {
    return <Briefing profile={state.profile} onAccept={() => dispatch({ type: 'accept' })} />
  }

  const profile = state.profile
  const phase = PHASES.find((p) => p.id === state.phase) ?? PHASES[0]

  return (
    <main className="mx-auto flex min-h-screen max-w-[1500px] flex-col gap-3 p-3 lg:h-screen">
      {/* Hlavicka - udaje ze zadani, casovy plan, body */}
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-line bg-panel px-4 py-2.5">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-accent">
            ZOO Plzeň — evidence areálu
          </h1>
          <p className="truncate text-[11px] text-muted">
            {profile.name} · {profile.trida} · {profile.skupina} · {roleName(profile.role)} ·{' '}
            {profile.datum}
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          {PHASES.map((p) => (
            <button
              key={p.id}
              onClick={() => dispatch({ type: 'phase', phase: p.id })}
              title={p.plan}
              className={[
                'rounded border px-2 py-1 text-[11px]',
                p.id === state.phase
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-line text-muted hover:text-fg',
              ].join(' ')}
            >
              {p.name}
            </button>
          ))}
        </div>

        <p className="hidden min-w-0 flex-1 truncate text-[11px] text-muted xl:block">
          {phase.plan}
        </p>

        <div className="ml-auto flex items-center gap-3 text-[11px]">
          <span className="text-muted">
            Čas <span className="tabular-nums text-fg">{formatTime(elapsed)}</span>
          </span>
          <span className="text-muted">
            Body{' '}
            <span className="tabular-nums text-accent">
              {total} / 100
            </span>
          </span>
          <span className="rounded border border-accent/40 bg-accent/5 px-2 py-0.5 text-accent">
            známka {gradeFor(total)}
          </span>
          <button
            onClick={handleReset}
            className="rounded border border-line px-2 py-1 text-muted hover:border-danger hover:text-danger"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3 lg:min-h-0 lg:flex-row">
        <section className="h-[55vh] lg:h-auto lg:min-h-0 lg:basis-[58%]">
          <Terminal
            screen={state.screen}
            prompt={promptFor(state.fs)}
            fsState={state.fs}
            commandHistory={state.commands}
            onSubmit={handleSubmit}
            onClear={() => dispatch({ type: 'clear' })}
          />
        </section>

        <aside className="flex min-h-0 flex-col rounded-lg border border-line bg-panel lg:basis-[42%]">
          {/* Zalozky - zvyraznene jsou ty, ktere patri k aktualni hodine */}
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-line p-2">
            {(Object.keys(TAB_LABELS) as TabId[]).map((id) => {
              const inPhase = phase.tabs.includes(id)
              return (
                <button
                  key={id}
                  onClick={() => dispatch({ type: 'tab', tab: id })}
                  className={[
                    'shrink-0 rounded px-2.5 py-1.5 text-[11px]',
                    state.tab === id
                      ? 'bg-accent/10 text-accent'
                      : inPhase
                        ? 'text-fg hover:bg-bg'
                        : 'text-muted hover:bg-bg',
                  ].join(' ')}
                >
                  {TAB_LABELS[id]}
                  {!inPhase && <span className="ml-1 opacity-60">·</span>}
                </button>
              )
            })}
          </nav>

          <div className="term-scroll min-h-0 flex-1 overflow-y-auto p-3">
            {state.tab === 'mise' && (
              <MissionPanel done={state.doneSteps} onShowTree={() => setTreeOpen(true)} />
            )}
            {state.tab === 'ukazka' && <DemoPanel done={state.demoDone} />}
            {state.tab === 'uloha' && (
              <PeerTaskPanel
                task={state.peerTask}
                onTaskChange={(task) => dispatch({ type: 'peerTask', task })}
                imported={state.imported}
                onImport={(task) => dispatch({ type: 'import', task })}
                solvedSteps={state.solvedSteps}
              />
            )}
            {state.tab === 'hodnoceni' && (
              <Scoreboard
                criteria={criteria}
                members={state.members}
                onMembersChange={(members) => dispatch({ type: 'members', members })}
                onEarnedChange={(value) => dispatch({ type: 'tahakPoints', value })}
              />
            )}
          </div>
        </aside>
      </div>

      <FileTree open={treeOpen} lines={treeLines} onClose={() => setTreeOpen(false)} />

      {missionsDone && !state.celebrated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="fade-in w-full max-w-lg rounded-lg border border-accent/60 bg-panel p-6">
            <h2 className="text-lg font-semibold text-accent">🎉 Všechny mise splněny</h2>
            <p className="mt-2 text-sm leading-6 text-fg">
              Výběh pro tapíry stojí, evidence je zálohovaná a revize prošla. Zvládl jsi{' '}
              {MISSIONS.length} misí a {ALL_MISSION_STEPS.length} dílčích kroků za{' '}
              {formatTime(elapsed)} pomocí {state.commands.length} příkazů ({state.errors} chyb).
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">
              Teď tě čeká 2. hodina: nacvičit živou ukázku a sestavit úlohu pro jinou skupinu.
              Tahák zpracovává kolega.
            </p>
            <button
              onClick={() => {
                dispatch({ type: 'celebrated' })
                dispatch({ type: 'phase', phase: 2 })
              }}
              className="mt-5 w-full rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-semibold text-accent"
            >
              Pokračovat na 2. hodinu
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
