'use client'

import { Member, ROLES, RoleId } from '@/lib/course'
import { Criterion, GRADE_SCALE, gradeFor, sumEarned } from '@/lib/grading'

type Props = {
  criteria: Criterion[]
  members: Member[]
  onMembersChange: (members: Member[]) => void
  /** Body za kritérium, které aplikace neměří (tahák řeší jiný člen skupiny). */
  onEarnedChange: (value: number) => void
}

/** Hodnocení podle tabulky ze zadání - pět kritérií, 100 bodů, výsledná známka. */
export default function Scoreboard({
  criteria,
  members,
  onMembersChange,
  onEarnedChange,
}: Props) {
  const total = sumEarned(criteria)
  const grade = gradeFor(total)

  const addMember = () => {
    onMembersChange([
      ...members,
      { id: `m${Date.now()}`, name: '', role: 'clen', rating: 3 },
    ])
  }

  const setMember = (id: string, patch: Partial<Member>) => {
    onMembersChange(members.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-md border border-line bg-bg p-3">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="pb-1.5 font-normal">Kritérium</th>
              <th className="w-12 pb-1.5 text-right font-normal">Max.</th>
              <th className="w-14 pb-1.5 text-right font-normal">Získáno</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((c) => (
              <tr key={c.id} className="border-b border-line/50 align-top">
                <td className="py-1.5 pr-2">
                  <span className="text-fg">{c.label}</span>
                  <span className="block text-muted">{c.note}</span>
                </td>
                <td className="py-1.5 text-right tabular-nums text-muted">{c.max}</td>
                <td className="py-1.5 text-right">
                  {c.editable ? (
                    <input
                      type="number"
                      min={0}
                      max={c.max}
                      value={c.earned}
                      onChange={(e) => onEarnedChange(Number(e.target.value))}
                      aria-label={`Body za ${c.label}`}
                      className="w-12 rounded border border-line bg-panel px-1 py-0.5 text-right text-[11px] tabular-nums text-fg outline-none focus:border-accent"
                    />
                  ) : (
                    <span
                      className={['tabular-nums', c.earned === c.max ? 'text-accent' : 'text-fg'].join(
                        ' ',
                      )}
                    >
                      {c.earned}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="pt-2 text-fg">Celkem</td>
              <td className="pt-2 text-right tabular-nums text-muted">100</td>
              <td className="pt-2 text-right tabular-nums text-accent">{total}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-3 flex items-center justify-between rounded border border-accent/40 bg-accent/5 px-3 py-2">
          <span className="text-xs text-muted">Výsledná známka</span>
          <span className="text-lg font-semibold text-accent">{grade}</span>
        </div>
        <p className="mt-1.5 text-[11px] text-muted">
          {GRADE_SCALE.map((g) => `${g.grade} = ${g.label}`).join(' · ')}
        </p>
      </section>

      <section className="rounded-md border border-line bg-bg p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-fg">Vzájemné hodnocení členů skupiny</h3>
          <button
            onClick={addMember}
            className="rounded border border-line px-2 py-1 text-[11px] text-fg hover:border-accent hover:text-accent"
          >
            + Člen
          </button>
        </div>
        <p className="mt-1 text-[11px] leading-5 text-muted">
          Ohodnoťte spolupráci každého člena 0–3 body. Průměr se přepočítá na 15 bodů kritéria
          „Spolupráce".
        </p>

        {members.length === 0 ? (
          <p className="mt-2 text-[11px] italic text-muted">
            Zatím nikdo — přidejte členy skupiny a ohodnoťte se navzájem.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-1.5">
                <input
                  value={m.name}
                  onChange={(e) => setMember(m.id, { name: e.target.value })}
                  placeholder="Jméno"
                  className="min-w-0 flex-1 rounded border border-line bg-panel px-2 py-1 text-[11px] text-fg outline-none focus:border-accent"
                />
                <select
                  value={m.role}
                  onChange={(e) => setMember(m.id, { role: e.target.value as RoleId })}
                  className="rounded border border-line bg-panel px-1.5 py-1 text-[11px] text-fg outline-none focus:border-accent"
                >
                  {ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-0.5">
                  {[0, 1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setMember(m.id, { rating: n })}
                      aria-label={`${n} bodů`}
                      className={[
                        'h-6 w-6 rounded border text-[11px]',
                        m.rating === n
                          ? 'border-accent bg-accent/15 text-accent'
                          : 'border-line text-muted hover:text-fg',
                      ].join(' ')}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => onMembersChange(members.filter((x) => x.id !== m.id))}
                  aria-label="Odebrat člena"
                  className="rounded border border-line px-1.5 py-1 text-[11px] text-muted hover:border-danger hover:text-danger"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
