// Ramec projektove vyuky - role, casovy plan a udaje o studentovi z hlavicky papiru.

export type RoleId = 'zapisovatel' | 'tester' | 'autor' | 'kontrolor' | 'clen'

export type Role = { id: RoleId; name: string; duty: string }

/** Role ve skupine přesně podle zadání. */
export const ROLES: Role[] = [
  { id: 'zapisovatel', name: 'Zapisovatel', duty: 'vede poznámky, píše tahák' },
  { id: 'tester', name: 'Tester příkazů', duty: 'ověřuje v terminálu, že každý příklad funguje' },
  { id: 'autor', name: 'Autor úlohy', duty: 'sestavuje úlohy pro jinou skupinu' },
  { id: 'kontrolor', name: 'Kontrolor', duty: 'hlídá čas, správnost a úplnost výstupů' },
  { id: 'clen', name: 'Člen', duty: 'pomáhá tam, kde je potřeba' },
]

export type Phase = { id: number; name: string; plan: string; tabs: TabId[] }

export type TabId = 'mise' | 'ukazka' | 'uloha' | 'hodnoceni'

/** Časový plán tří vyučovacích hodin. */
export const PHASES: Phase[] = [
  {
    id: 1,
    name: '1. hodina',
    plan: 'rozdělení rolí, studium příkazů, každý příkaz vyzkoušet',
    tabs: ['mise'],
  },
  {
    id: 2,
    name: '2. hodina',
    plan: 'tahák, příprava ukázky a úlohy pro jinou skupinu',
    tabs: ['ukazka', 'uloha'],
  },
  {
    id: 3,
    name: '3. hodina',
    plan: 'ukázky všech skupin, řešení úlohy od jiné skupiny',
    tabs: ['ukazka', 'uloha', 'hodnoceni'],
  },
]

export const TAB_LABELS: Record<TabId, string> = {
  mise: 'Mise',
  ukazka: 'Živá ukázka',
  uloha: 'Úloha',
  hodnoceni: 'Hodnocení',
}

/** Jeden clen skupiny vcetne vzajemneho hodnoceni (0-3 body). */
export type Member = { id: string; name: string; role: RoleId; rating: number }

/** Udaje vyplnene pri prihlaseni - hlavicka papiru. */
export type Profile = {
  name: string
  trida: string
  skupina: string
  datum: string
  role: RoleId
}

export function roleName(id: RoleId): string {
  return ROLES.find((r) => r.id === id)?.name ?? 'Člen'
}
