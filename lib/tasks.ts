// Definice zadani. Kazdy krok ma cistou funkci check(root, history) -> boolean,
// ktera se vola po kazdem prikazu.

import { FsDir, HistoryEntry, getNode, isDir, isFile, normalize, resolvePath } from './fs'
import { parse } from './commands'

export type Task = {
  id: string
  title: string
  /** Kroky zadani vypsane v panelu. */
  bullets: string[]
  points: number
  /** Napoveda - navadi na spravny prepinac, nikdy neprozradi hotovy prikaz. */
  hint: string
  check: (root: FsDir, history: HistoryEntry[]) => boolean
}

const ZOO = '/home/student/zoo'

/** Prepinace uspesne provedeneho prikazu daneho jmena. */
function flagsOf(entry: HistoryEntry): Set<string> {
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

/** Historie obsahuje uspesny prikaz `name`, ktery splni predikat. */
function ranOk(
  history: HistoryEntry[],
  name: string,
  predicate: (entry: HistoryEntry) => boolean,
): boolean {
  return history.some((e) => {
    if (e.error) return false
    const parsed = parse(e.command)
    return parsed?.name === name && predicate(e)
  })
}

/** Cesta patri do stromu ~/zoo (vcetne nej sameho). */
function insideZoo(cwd: string, raw: string): boolean {
  const abs = normalize(resolvePath(cwd, raw))
  return abs === ZOO || abs.startsWith(ZOO + '/')
}

export const TASKS: Task[] = [
  {
    id: 'krok1',
    title: 'Novy vybeh',
    bullets: [
      'Jednim prikazem vytvor vnorene adresare ~/zoo/novy_vybeh/karantena.',
      'Do ~/zoo/novy_vybeh vytvor soubor tapir.txt.',
    ],
    points: 5,
    hint: 'Vnorene adresare jednim prikazem → podivej se na prepinac -p u mkdir. Prazdny soubor vytvoris prikazem, ktery se souboru jen "dotkne".',
    check: (root) => {
      const karantena = getNode(root, `${ZOO}/novy_vybeh/karantena`)
      const tapir = getNode(root, `${ZOO}/novy_vybeh/tapir.txt`)
      return isDir(karantena) && isFile(tapir)
    },
  },
  {
    id: 'krok2',
    title: 'Presun a uklid',
    bullets: [
      'Zkopiruj cely adresar ~/zoo/savci do ~/zoo/zaloha_savci.',
      'V ~/zoo/savci prejmenuj zebra.txt na zebra_vybeh_C.txt.',
      'Smaz cely adresar ~/zoo/novy_vybeh/karantena.',
    ],
    points: 5,
    hint: 'Adresar se nekopiruje bez prepinace -r. Prejmenovani je obycejne mv stary novy. Mazani adresare chce -r.',
    check: (root) => {
      const zaloha = getNode(root, `${ZOO}/zaloha_savci`)
      const zalohaOk =
        isDir(zaloha) &&
        ['lev.txt', 'slon.txt', 'zebra.txt'].every((n) => isFile(zaloha.children[n]))

      const savci = getNode(root, `${ZOO}/savci`)
      const savciOk =
        isDir(savci) &&
        isFile(savci.children['zebra_vybeh_C.txt']) &&
        savci.children['zebra.txt'] === undefined

      const karantenaPryc = getNode(root, `${ZOO}/novy_vybeh/karantena`) === null

      return zalohaOk && savciOk && karantenaPryc
    },
  },
  {
    id: 'krok3',
    title: 'Najdi a zmer',
    bullets: [
      'Najdi prikazem find vsechny soubory *.txt uvnitr ~/zoo.',
      'Zjisti velikost adresare ~/zoo v citelnem formatu.',
      'Vypis obsah ~/zoo vcetne skrytych souboru a s pravy.',
    ],
    points: 5,
    hint: 'U find potrebujes -name a vzor v uvozovkach. U du hledej prepinace -s a -h (lze spojit). U ls potrebujes zaroven -l a -a (poradi je jedno).',
    // Tento krok se kontroluje podle historie prikazu, ne podle stavu fs.
    check: (_root, history) => {
      const findOk = ranOk(history, 'find', (e) => {
        const parsed = parse(e.command)
        if (!parsed) return false
        const plain = parsed.args.map((a) => a.value)
        const nameIdx = plain.indexOf('-name')
        if (nameIdx === -1) return false
        const pattern = plain[nameIdx + 1]
        if (!pattern || !/^\*\.txt$/.test(pattern)) return false
        const start = plain.length > 0 && !plain[0].startsWith('-') ? plain[0] : '.'
        return insideZoo(e.cwd, start)
      })

      const duOk = ranOk(history, 'du', (e) => {
        const flags = flagsOf(e)
        return flags.has('s') && flags.has('h')
      })

      const lsOk = ranOk(history, 'ls', (e) => {
        const flags = flagsOf(e)
        return flags.has('l') && flags.has('a')
      })

      return findOk && duOk && lsOk
    },
  },
]

export const TOTAL_POINTS = TASKS.reduce((sum, t) => sum + t.points, 0)
