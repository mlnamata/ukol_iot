'use client'

import { useEffect, useState } from 'react'
import { Profile, ROLES, RoleId } from '@/lib/course'

type Props = { onLogin: (profile: Profile) => void }

/** Prihlaseni do systemu ZOO - vyplni hlavicku zadani (trida, datum, skupina, role). */
export default function Login({ onLogin }: Props) {
  const [name, setName] = useState('')
  const [trida, setTrida] = useState('')
  const [skupina, setSkupina] = useState('Skupina 1')
  const [datum, setDatum] = useState('')
  const [role, setRole] = useState<RoleId>('tester')

  // Dnesni datum az na klientu, jinak by nesedela hydratace.
  useEffect(() => {
    setDatum(new Date().toISOString().slice(0, 10))
  }, [])

  const ready = name.trim().length >= 2 && trida.trim().length >= 1

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready) return
    onLogin({ name: name.trim(), trida: trida.trim(), skupina, datum, role })
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="fade-in w-full max-w-lg rounded-lg border border-line bg-panel p-6"
      >
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">
          Projektová výuka · 4. ročník · 3 vyučovací hodiny
        </p>
        <h1 className="mt-2 text-xl font-semibold text-accent">
          ZOO Plzeň — interní systém správy areálu
        </h1>
        <p className="mt-1 text-sm text-muted">
          Základy operačního systému Linux — souborový systém a navigace
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-xs text-muted">
            Jméno a příjmení
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jan Novák"
              className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
            />
          </label>
          <label className="text-xs text-muted">
            Třída
            <input
              value={trida}
              onChange={(e) => setTrida(e.target.value)}
              placeholder="4.A"
              className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
            />
          </label>
          <label className="text-xs text-muted">
            Skupina
            <input
              value={skupina}
              onChange={(e) => setSkupina(e.target.value)}
              className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
            />
          </label>
          <label className="text-xs text-muted">
            Datum
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className="mt-1 w-full rounded border border-line bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent"
            />
          </label>
        </div>

        <fieldset className="mt-5">
          <legend className="text-xs text-muted">Tvoje role ve skupině</legend>
          <div className="mt-2 flex flex-col gap-1.5">
            {ROLES.map((r) => (
              <label
                key={r.id}
                className={[
                  'flex cursor-pointer items-start gap-2 rounded border px-3 py-2 text-xs',
                  role === r.id ? 'border-accent bg-accent/5' : 'border-line bg-bg',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="role"
                  checked={role === r.id}
                  onChange={() => setRole(r.id)}
                  className="mt-0.5 accent-[#4ade80]"
                />
                <span>
                  <span className="font-semibold text-fg">{r.name}</span>
                  <span className="text-muted"> — {r.duty}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={!ready}
          className="mt-6 w-full rounded border border-accent bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-muted"
        >
          Přihlásit se do systému
        </button>
        <p className="mt-3 text-center text-[11px] text-muted">
          Pracuješ pouze ve svém virtuálním stroji, ne na školním serveru.
        </p>
      </form>
    </div>
  )
}
