// Uloha pro jinou skupinu: tri kroky, jasne zadani a strojove overitelny vysledek.
// Uloha se predava jako kod (base64), ktery druha skupina vlozi a vyresi.

import { FsDir, HistoryEntry, getNode, isDir, isFile, normalize, resolvePath } from './fs'
import { flagsOf, nameOf } from './match'

export type CheckKind =
  | 'dir-exists'
  | 'file-exists'
  | 'file-contains'
  | 'not-exists'
  | 'command-used'

export type PeerCheck = {
  kind: CheckKind
  /** Cesta, ktere se kontrola tyka (u command-used se nepouziva). */
  path: string
  /** Hledany text u file-contains. */
  text: string
  /** Jmeno prikazu u command-used. */
  command: string
  /** Pozadovane prepinace u command-used, napr. "rh". */
  flags: string
}

export type PeerStep = { title: string; instruction: string; check: PeerCheck }

export type PeerTask = {
  title: string
  author: string
  skupina: string
  steps: PeerStep[]
}

export const CHECK_LABELS: Record<CheckKind, string> = {
  'dir-exists': 'existuje adresář',
  'file-exists': 'existuje soubor',
  'file-contains': 'soubor obsahuje text',
  'not-exists': 'cesta už neexistuje',
  'command-used': 'byl použit příkaz',
}

export function emptyCheck(): PeerCheck {
  return { kind: 'dir-exists', path: '', text: '', command: '', flags: '' }
}

export function emptyTask(author: string, skupina: string): PeerTask {
  return {
    title: '',
    author,
    skupina,
    steps: [
      { title: '', instruction: '', check: emptyCheck() },
      { title: '', instruction: '', check: emptyCheck() },
      { title: '', instruction: '', check: emptyCheck() },
    ],
  }
}

/** Lidsky citelny popis kontroly - druha skupina hned vidi, jak se uloha overi. */
export function describeCheck(check: PeerCheck): string {
  switch (check.kind) {
    case 'file-contains':
      return `soubor ${check.path || '…'} obsahuje text „${check.text || '…'}"`
    case 'command-used':
      return `byl úspěšně použit příkaz ${check.command || '…'}${
        check.flags ? ` s přepínači -${check.flags}` : ''
      }`
    case 'not-exists':
      return `cesta ${check.path || '…'} už neexistuje`
    case 'dir-exists':
      return `existuje adresář ${check.path || '…'}`
    case 'file-exists':
      return `existuje soubor ${check.path || '…'}`
  }
}

/** Kontrola je vyplnena natolik, ze jde vyhodnotit. */
export function checkValid(check: PeerCheck): boolean {
  if (check.kind === 'command-used') return check.command.trim().length > 0
  if (check.kind === 'file-contains') {
    return check.path.trim().length > 0 && check.text.trim().length > 0
  }
  return check.path.trim().length > 0
}

/** Krok je pouzitelny pro jinou skupinu: ma nazev, zadani i overitelny vysledek. */
export function stepValid(step: PeerStep): boolean {
  return (
    step.title.trim().length >= 3 &&
    step.instruction.trim().length >= 10 &&
    checkValid(step.check)
  )
}

/** Vyhodnoceni kontroly proti stavu souboroveho systemu a historii prikazu. */
export function evaluate(check: PeerCheck, root: FsDir, history: HistoryEntry[]): boolean {
  if (!checkValid(check)) return false

  if (check.kind === 'command-used') {
    const wanted = check.command.trim()
    const wantedFlags = check.flags.replace(/-/g, '').split('')
    return history.some((e) => {
      if (e.error || nameOf(e) !== wanted) return false
      const f = flagsOf(e)
      return wantedFlags.every((x) => f.has(x))
    })
  }

  const abs = normalize(resolvePath('/home/student', check.path.trim()))
  const node = getNode(root, abs)

  switch (check.kind) {
    case 'dir-exists':
      return isDir(node)
    case 'file-exists':
      return isFile(node)
    case 'not-exists':
      return node === null
    case 'file-contains':
      return isFile(node) && node.content.includes(check.text.trim())
  }
}

// ---------------------------------------------------------------------------
// Predavani ulohy mezi skupinami
// ---------------------------------------------------------------------------

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function fromBase64(code: string): string {
  const binary = atob(code)
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** Kod, ktery skupina predá jine skupine. */
export function encodeTask(task: PeerTask): string {
  return 'ZOO1-' + toBase64(JSON.stringify(task)).replace(/=+$/, '')
}

export function decodeTask(code: string): PeerTask | null {
  try {
    const trimmed = code.trim().replace(/^ZOO1-/, '')
    const padded = trimmed + '='.repeat((4 - (trimmed.length % 4)) % 4)
    const parsed: unknown = JSON.parse(fromBase64(padded))
    if (typeof parsed !== 'object' || parsed === null) return null
    const task = parsed as PeerTask
    if (!Array.isArray(task.steps) || task.steps.length === 0) return null
    if (!task.steps.every((s) => s && typeof s.title === 'string' && s.check)) return null
    return task
  } catch {
    return null
  }
}
