'use client'

import { Profile, PHASES, roleName } from '@/lib/course'

type Props = { profile: Profile; onAccept: () => void }

/** Uvodni zadani - pribeh, ktery student dostane hned po prihlaseni. */
export default function Briefing({ profile, onAccept }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="fade-in w-full max-w-2xl rounded-lg border border-line bg-panel p-6 sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
          Příchozí zpráva · Rada města Plzně
        </p>
        <h1 className="mt-2 text-xl font-semibold text-accent">
          Vítej, {profile.name}. Od dneška je ZOO tvoje.
        </h1>

        <div className="mt-5 space-y-3 text-sm leading-6 text-fg">
          <p>
            Rada města schválila rozšíření areálu. Za měsíc přijedou dva{' '}
            <strong className="text-fg">tapíři jihoameričtí</strong> a ty pro ně musíš připravit
            nový výběh.
          </p>
          <p>
            Jenže veškerá evidence zvířat běží na serveru, ke kterému se dostaneš{' '}
            <strong className="text-fg">jen přes terminál</strong>. Žádná myš, žádná okna. Jen
            příkazová řádka — a ta odpouští méně než ošetřovatelé.
          </p>
          <p className="text-muted">
            Úkol dostaneš rozdělený na dílčí kroky. Další krok se ti odemkne vždy až po splnění
            toho předchozího, takže se nemusíš bát, že něco přeskočíš.
          </p>
        </div>

        <div className="mt-5 rounded border border-line bg-bg p-4">
          <p className="text-xs text-muted">Co tě čeká</p>
          <ol className="mt-2 space-y-1 text-sm">
            {PHASES.map((p) => (
              <li key={p.id} className="flex gap-2">
                <span className="shrink-0 text-accent">{p.name}</span>
                <span className="text-muted">— {p.plan}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
          <span>
            Třída: <span className="text-fg">{profile.trida}</span>
          </span>
          <span>
            Skupina: <span className="text-fg">{profile.skupina}</span>
          </span>
          <span>
            Role: <span className="text-fg">{roleName(profile.role)}</span>
          </span>
          <span>
            Datum: <span className="text-fg">{profile.datum}</span>
          </span>
        </div>

        <button
          onClick={onAccept}
          className="mt-6 w-full rounded border border-accent bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent"
        >
          Přijmout úkol a otevřít terminál
        </button>
        <p className="mt-3 text-center text-[11px] text-muted">
          Tip: v terminálu napiš <span className="text-fg">help</span> pro seznam příkazů.
        </p>
      </div>
    </div>
  )
}
