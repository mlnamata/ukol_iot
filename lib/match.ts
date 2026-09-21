// Pomocne funkce pro rozpoznani, jaky prikaz student skutecne spustil.
// Pouzivaji je mise, tahak i uloha pro jinou skupinu.

import { HistoryEntry, normalize, resolvePath } from './fs'
import { parse } from './commands'

/** Jmeno prikazu (prvni slovo). */
export function nameOf(entry: HistoryEntry): string {
  return parse(entry.command)?.name ?? ''
}

/** Prepinace prikazu rozlozene na jednotliva pismena: `-la` -> {l, a}. */
export function flagsOf(entry: HistoryEntry): Set<string> {
  const parsed = parse(entry.command)
  const flags = new Set<string>()
  if (!parsed) return flags
  for (const a of parsed.args) {
    if (!a.quoted && a.value.startsWith('-') && !a.value.startsWith('--') && a.value.length > 1) {
      for (const ch of a.value.slice(1)) flags.add(ch)
    }
  }
  return flags
}

/**
 * Argumenty bez prepinacu. Samotna pomlcka prepinac neni - `cd -` znamena
 * "predchozi adresar", takze se musi chovat jako operand (stejne jako v commands.ts).
 */
export function operandsOf(entry: HistoryEntry): string[] {
  const parsed = parse(entry.command)
  if (!parsed) return []
  return parsed.args
    .filter((a) => a.quoted || !a.value.startsWith('-') || a.value === '-')
    .map((a) => a.value)
}

/** Vsechny argumenty vcetne prepinacu, v puvodnim poradi. */
export function rawArgsOf(entry: HistoryEntry): string[] {
  return parse(entry.command)?.args.map((a) => a.value) ?? []
}

/** Absolutni cesta operandu vzhledem k adresari, ve kterem prikaz bezel. */
export function absOperand(entry: HistoryEntry, operand: string): string {
  return normalize(resolvePath(entry.cwd, operand))
}

/** Prvni operand prevedeny na absolutni cestu, nebo null. */
export function firstAbsOperand(entry: HistoryEntry): string | null {
  const ops = operandsOf(entry)
  return ops.length > 0 ? absOperand(entry, ops[0]) : null
}

/** Historie obsahuje uspesne provedeny prikaz `name`, ktery splni predikat. */
export function ranOk(
  history: HistoryEntry[],
  name: string,
  predicate: (entry: HistoryEntry) => boolean = () => true,
): boolean {
  return history.some((e) => !e.error && nameOf(e) === name && predicate(e))
}

/** Prvni uspesny prikaz `name` splnujici predikat - pouziva tahak pro ukazku. */
export function firstOk(
  history: HistoryEntry[],
  name: string,
  predicate: (entry: HistoryEntry) => boolean = () => true,
): HistoryEntry | null {
  return history.find((e) => !e.error && nameOf(e) === name && predicate(e)) ?? null
}

/** Prikaz `name` byl spusten se vsemi uvedenymi prepinaci. */
export function ranWithFlags(history: HistoryEntry[], name: string, flags: string[]): boolean {
  return ranOk(history, name, (e) => {
    const f = flagsOf(e)
    return flags.every((x) => f.has(x))
  })
}
