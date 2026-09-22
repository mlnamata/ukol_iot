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
      'Na začátku si ověříme, v jakém adresáři na naší základně se nacházíme a jaké soubory tu máme. Můžeme si je zobrazit i včetně skrytých.',
    commands: ['pwd', 'ls', 'ls -la'],
    explanation: [
      'pwd zobrazí absolutní cestu k aktuálnímu adresáři.',
      'ls zobrazí všechny složky a soubory v aktuálním adresáři.',
      'ls s parametrem -la vypíše všechny soubory a složky včetně skrytých (začínajících tečkou) s podrobnými informacemi.',
    ],
    points: 5,
    check: (_root, h) => ranOk(h, 'pwd') && ranOk(h, 'ls'),
  },
  {
    id: 'cv2',
    title: 'Struktura agentury jedním příkazem',
    intro:
      'Nyní vytvoříme celou strukturu naší vesmírné agentury jedním příkazem pomocí přepínače -p. Vytvoříme složky pro misi na Mars a misi na Měsíc.',
    commands: ['mkdir -p agentura/mise_mars agentura/mise_mesic', 'ls -R'],
    explanation: [
      'Mohli bychom udělat pouze mkdir a pak se tam přemístit pomocí cd a tvořit další složky. Lepší je přidat k mkdir parametr -p: ten vytvoří nejen složku, ale za lomítkem i další podsložku.',
      'Parametr -p tedy vytvoří nadřazenou složku agentura i její podsložky najednou.',
      'ls -R pak ukáže celou vytvořenou strukturu včetně podadresářů.',
    ],
    points: 5,
    check: (root, h) =>
      isDir(getNode(root, `${HOME}/agentura/mise_mars`)) &&
      isDir(getNode(root, `${HOME}/agentura/mise_mesic`)),
  },
  {
    id: 'cv3',
    title: 'Vytvoření, kopírování a přejmenování souboru',
    intro:
      'Přesuneme se do složky mise na Mars, vytvoříme soubor se seznamem astronautů, zkopírujeme ho k měsíční misi a přejmenujeme.',
    commands: [
      'cd agentura/mise_mars',
      'touch astronauti.txt',
      'cp astronauti.txt ../mise_mesic/',
      'mv astronauti.txt velitel.txt',
      'ls -l',
    ],
    explanation: [
      'cd nás přesune do složky, v tomto případě k misi na Mars.',
      'touch vytvoří prázdný soubor astronauti.txt.',
      'cp zkopíruje soubor do druhé složky za použití relativní cesty .. (o úroveň výš). Dvě tečky se dají řetězit lomítkem — kdyby byla složka o dvě úrovně výš, napsali bychom cp astronauti.txt ../../mise_mesic/',
      'mv přejmenuje původní soubor na velitel.txt. Kdybychom za něj dali lomítko a cestu, soubor by místo přejmenování přesunul.',
      'ls -l nakonec ukáže výsledek s podrobnostmi.',
    ],
    points: 5,
    check: (root) => {
      const mars = getNode(root, `${HOME}/agentura/mise_mars`)
      const mesic = getNode(root, `${HOME}/agentura/mise_mesic`)
      return (
        isDir(mars) &&
        isDir(mesic) &&
        isFile(mars.children['velitel.txt']) &&
        mars.children['astronauti.txt'] === undefined &&
        isFile(mesic.children['astronauti.txt'])
      )
    },
  },
  {
    id: 'cv4',
    title: 'Hledání souboru',
    intro:
      'Teď se přesuneme zpátky na začátek, o dvě úrovně výš, a ukážeme si hledání souboru s velitelem příkazem find.',
    commands: ['cd ../..', 'find agentura -name "velitel.txt"'],
    explanation: [
      'cd ../.. nás vrátí o dvě úrovně výš, zpátky do domovského adresáře.',
      'find prohledá složku agentura a najde přesnou cestu k souboru velitel.txt.',
      'Kdyby mělo find u sebe jen agentura bez -name, vypsalo by celý obsah složky.',
    ],
    points: 5,
    check: (_root, h) => ranOk(h, 'find'),
  },
  {
    id: 'cv5',
    title: 'Velikost složky a místo na disku',
    intro:
      'Na závěr zkontrolujeme, kolik dat naše agentura zabírá a kolik volného místa máme v datovém úložišti.',
    commands: ['du -sh agentura', 'df -h'],
    explanation: [
      'du -sh zobrazí celkovou velikost složky. Přepínač -s dělá souhrn za celou složku, -h ji vypíše v čitelném formátu.',
      'df -h ukáže zaplnění celého disku.',
    ],
    points: 5,
    check: (_root, h) => ranOk(h, 'du') && ranOk(h, 'df'),
  },
  {
    id: 'cv6',
    title: 'Mazání souboru a složky',
    intro:
      'Pokud bychom chtěli stará data smazat, použijeme rm. Pozor: koš v terminálu neexistuje.',
    commands: ['rm agentura/mise_mesic/astronauti.txt', 'rm -r agentura'],
    explanation: [
      'rm smaže soubor. Uvádíme buď jen název, pokud jsme ve složce, kde soubor je, nebo celou cestu k němu.',
      'Na celou složku rm samo nestačí — přidáme parametr -r a název složky, čímž se smaže složka i všechno v ní.',
    ],
    points: 5,
    check: (root) => findByName(root, 'agentura') === null,
  },
]

export type TaskGroup = {
  id: string
  title: string
  tasks: Task[]
}

export const TASK_GROUPS: TaskGroup[] = [
  {
    id: 'g1',
    title: '1. Základy a adresářová struktura',
    tasks: [TASKS[0], TASKS[1]],
  },
  {
    id: 'g2',
    title: '2. Práce se soubory a vyhledávání',
    tasks: [TASKS[2], TASKS[3]],
  },
  {
    id: 'g3',
    title: '3. Správa disku a úklid',
    tasks: [TASKS[4], TASKS[5]],
  },
]

export const TOTAL_POINTS = TASKS.reduce((sum, t) => sum + t.points, 0)
