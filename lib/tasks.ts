// Definice cviceni. Poradi i texty odpovidaji prezentaci, kterou skupina predvadi.
// Kazde cviceni ma cistou funkci check(root, history) -> boolean, ktera se vola
// po kazdem prikazu.

import { FsDir, FsNode, HistoryEntry, getNode, isDir, isFile, normalize, resolvePath } from './fs'
import { parse } from './commands'

export type Task = {
  id: string
  title: string
  /** Uvodni veta, kterou k cviceni rika prezentujici. */
  intro: string
  /** Prikazy k napsani do terminalu - odpovedi ke cviceni. */
  commands: string[]
  /** Co jednotlive prikazy delaji. */
  explanation: string[]
  points: number
  check: (root: FsDir, history: HistoryEntry[]) => boolean
}

const HOME = '/home/student'

// ---------------------------------------------------------------------------
// Pomocne funkce pro kontrolu podle historie prikazu
// ---------------------------------------------------------------------------

/** Prepinace prikazu rozlozene na jednotliva pismena: `-la` -> {l, a}. */
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

/** Argumenty bez prepinacu. Samotna pomlcka prepinac neni (`cd -`). */
function operandsOf(entry: HistoryEntry): string[] {
  const parsed = parse(entry.command)
  if (!parsed) return []
  return parsed.args
    .filter((a) => a.quoted || !a.value.startsWith('-') || a.value === '-')
    .map((a) => a.value)
}

/** Historie obsahuje uspesne provedeny prikaz `name`, ktery splni predikat. */
function ranOk(
  history: HistoryEntry[],
  name: string,
  predicate: (entry: HistoryEntry) => boolean = () => true,
): boolean {
  return history.some((e) => !e.error && parse(e.command)?.name === name && predicate(e))
}

/** Prikaz bezel se vsemi uvedenymi prepinaci. */
function ranWithFlags(history: HistoryEntry[], name: string, flags: string[]): boolean {
  return ranOk(history, name, (e) => {
    const f = flagsOf(e)
    return flags.every((x) => f.has(x))
  })
}

/** Nektery operand prikazu ukazuje na `target` nebo pod nej. */
function ranOnPath(entry: HistoryEntry, target: string): boolean {
  return operandsOf(entry).some((op) => {
    const abs = normalize(resolvePath(entry.cwd, op))
    return abs === target || abs.startsWith(target + '/')
  })
}

/** Rekurzivne najde prvni uzel daneho jmena kdekoliv ve stromu. */
function findByName(node: FsNode, name: string): FsNode | null {
  if (node.name === name) return node
  if (node.type !== 'dir') return null
  for (const child of Object.values(node.children)) {
    const hit = findByName(child, name)
    if (hit) return hit
  }
  return null
}

// ---------------------------------------------------------------------------
// Cviceni
// ---------------------------------------------------------------------------

export const TASKS: Task[] = [
  {
    id: 'cv1',
    title: 'Kde jsme a co tu je',
    intro:
      'Na začátku si ověříme, v jakém adresáři se nacházíme a jaké soubory tu máme, a můžeme si zobrazit i včetně skrytých.',
    commands: ['pwd', 'ls', 'ls -la'],
    explanation: [
      'pwd zobrazí absolutní cestu k aktuálnímu adresáři.',
      'ls zobrazí všechny složky a soubory v aktuálním adresáři.',
      'ls s parametrem -la vypíše všechny soubory a složky včetně skrytých (začínajících tečkou) s podrobnými informacemi.',
    ],
    points: 5,
    check: (_root, h) =>
      ranOk(h, 'pwd') &&
      ranOk(h, 'ls', (e) => flagsOf(e).size === 0) &&
      ranWithFlags(h, 'ls', ['l', 'a']),
  },
  {
    id: 'cv2',
    title: 'Struktura ZOO jedním příkazem',
    intro:
      'Nyní vytvoříme celou strukturu naší ZOO jedním příkazem pomocí přepínače -p. Vytvoříme pavilon šelem a pavilon ptáků.',
    commands: ['mkdir -p zoo/pavilon_selem zoo/pavilon_ptaku', 'ls -R'],
    explanation: [
      'Mohli bychom udělat pouze mkdir a pak se tam přemístit pomocí cd a tvořit další složky. Lepší je přidat k mkdir parametr -p: ten vytvoří nejen složku, ale za lomítkem i další podsložku.',
      'Parametr -p tedy vytvoří nadřazenou složku zoo i její podsložky najednou.',
      'ls -R pak ukáže celou vytvořenou strukturu včetně podadresářů.',
    ],
    points: 5,
    check: (root, h) =>
      isDir(getNode(root, `${HOME}/zoo/pavilon_selem`)) &&
      isDir(getNode(root, `${HOME}/zoo/pavilon_ptaku`)) &&
      ranWithFlags(h, 'mkdir', ['p']) &&
      ranWithFlags(h, 'ls', ['R']),
  },
  {
    id: 'cv3',
    title: 'Vytvoření, kopírování a přejmenování souboru',
    intro:
      'Přesuneme se do pavilonu šelem, vytvoříme soubor se zvířetem, zkopírujeme ho k ptákům a přejmenujeme.',
    commands: [
      'cd zoo/pavilon_selem',
      'touch zvirata.txt',
      'cp zvirata.txt ../pavilon_ptaku/',
      'mv zvirata.txt lev.txt',
      'ls -l',
    ],
    explanation: [
      'cd nás přesune do složky, neboli k šelmám.',
      'touch vytvoří prázdný soubor zvirata.txt.',
      'cp zkopíruje soubor do druhé složky za použití relativní cesty .. (o úroveň výš). Šlo by to i přesnou cestou, ale to bychom si ji napřed museli zjistit přes pwd. Dvě tečky se dají řetězit lomítkem — kdyby byl pavilon ptáků o dvě úrovně výš, napsali bychom cp zvirata.txt ../../pavilon_ptaku/',
      'mv přejmenuje původní soubor na lev.txt. Kdybychom za něj dali lomítko a cestu, soubor by místo přejmenování přesunul.',
      'ls -l nakonec ukáže výsledek s podrobnostmi.',
    ],
    points: 5,
    check: (root) => {
      const selem = getNode(root, `${HOME}/zoo/pavilon_selem`)
      const ptaku = getNode(root, `${HOME}/zoo/pavilon_ptaku`)
      return (
        isDir(selem) &&
        isDir(ptaku) &&
        isFile(selem.children['lev.txt']) &&
        selem.children['zvirata.txt'] === undefined &&
        isFile(ptaku.children['zvirata.txt'])
      )
    },
  },
  {
    id: 'cv4',
    title: 'Hledání souboru',
    intro:
      'Teď se přesuneme zpátky na začátek, o dvě úrovně výš, a ukážeme si hledání souboru příkazem find.',
    commands: ['cd ../..', 'find zoo -name "lev.txt"'],
    explanation: [
      'cd ../.. nás vrátí o dvě úrovně výš, zpátky do domovského adresáře.',
      'find prohledá složku zoo a najde přesnou cestu k souboru lev.txt.',
      'Kdyby mělo find u sebe jen zoo bez -name, vypsalo by celý obsah složky.',
    ],
    points: 5,
    check: (_root, h) =>
      ranOk(h, 'find', (e) => /-name\s+["']?lev\.txt["']?/.test(e.command) && ranOnPath(e, `${HOME}/zoo`)),
  },
  {
    id: 'cv5',
    title: 'Velikost složky a místo na disku',
    intro:
      'Na závěr zkontrolujeme, kolik místa naše ZOO zabírá a kolik volného místa máme na disku.',
    commands: ['du -sh zoo', 'df -h'],
    explanation: [
      'du -sh zobrazí celkovou velikost složky. Přepínač -s dělá souhrn za celou složku, -h ji vypíše v čitelném formátu.',
      'df -h ukáže zaplnění celého disku.',
    ],
    points: 5,
    check: (_root, h) =>
      ranOk(h, 'du', (e) => {
        const f = flagsOf(e)
        return f.has('s') && f.has('h') && ranOnPath(e, `${HOME}/zoo`)
      }) && ranWithFlags(h, 'df', ['h']),
  },
  {
    id: 'cv6',
    title: 'Mazání souboru a složky',
    intro:
      'Pokud bychom chtěli odstranit soubor nebo adresář, použijeme rm. Pozor: koš v terminálu neexistuje.',
    commands: ['rm zoo/pavilon_ptaku/zvirata.txt', 'rm -r zoo'],
    explanation: [
      'rm smaže soubor. Uvádíme buď jen název, pokud jsme ve složce, kde soubor je, nebo celou cestu k němu.',
      'Na celou složku rm samo nestačí — přidáme parametr -r a název složky, čímž se smaže složka i všechno v ní.',
    ],
    points: 5,
    check: (root, h) =>
      ranOk(h, 'rm', (e) => !flagsOf(e).has('r')) &&
      ranWithFlags(h, 'rm', ['r']) &&
      findByName(root, 'zoo') === null,
  },
]

export const TOTAL_POINTS = TASKS.reduce((sum, t) => sum + t.points, 0)
