// Hodnoceni podle tabulky z papiru - pet kriterii, celkem 100 bodu, z toho znamka.

export type Criterion = {
  id: string
  label: string
  max: number
  earned: number
  /** Jak se body ziskavaji - zobrazi se pod kriteriem. */
  note: string
  /** Kriterium, ktere aplikace nemeri a zadava se rucne (resi ho jiny clen skupiny). */
  editable?: boolean
}

export const GRADE_SCALE: { grade: number; min: number; label: string }[] = [
  { grade: 1, min: 90, label: '90–100 bodů' },
  { grade: 2, min: 75, label: '75–89 bodů' },
  { grade: 3, min: 60, label: '60–74 bodů' },
  { grade: 4, min: 45, label: '45–59 bodů' },
  { grade: 5, min: 0, label: 'méně než 45 bodů' },
]

export function gradeFor(total: number): number {
  return GRADE_SCALE.find((g) => total >= g.min)?.grade ?? 5
}

/** Rozdeli max bodu podle podilu splnenych polozek. */
export function share(done: number, total: number, max: number): number {
  if (total === 0) return 0
  return Math.round((done / total) * max)
}

export function sumEarned(criteria: Criterion[]): number {
  return criteria.reduce((sum, c) => sum + c.earned, 0)
}
