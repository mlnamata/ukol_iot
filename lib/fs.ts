// Virtualni souborovy system - ciste funkce, zadny React.
// Vse je drzeno v pameti jako strom uzlu.

export type FsDir = { type: 'dir'; name: string; children: Record<string, FsNode> }
export type FsFile = { type: 'file'; name: string; content: string; size: number }
export type FsNode = FsDir | FsFile

/** Domovsky adresar uzivatele. */
export const HOME = '/home/student'

/** Pevne datum pro vypis `ls -l` - drzi vystup deterministicky (zadny hydration mismatch). */
export const MTIME = 'Sep 21 09:00'

/** Celkovy stav simulace souboroveho systemu. */
export type FsState = {
  root: FsDir
  cwd: string
  /** Predchozi adresar pro `cd -`. */
  prevCwd: string
}

/** Jeden zaznam v historii prikazu - potrebuje ho kontrola kroku 3. */
export type HistoryEntry = {
  command: string
  cwd: string
  error: boolean
}

// ---------------------------------------------------------------------------
// Konstruktory uzlu
// ---------------------------------------------------------------------------

export function dir(name: string, children: Record<string, FsNode> = {}): FsDir {
  return { type: 'dir', name, children }
}

export function file(name: string, content: string): FsFile {
  return { type: 'file', name, content, size: content.length }
}

/** Slozi adresar z pole uzlu (klic = jmeno uzlu). */
function dirOf(name: string, nodes: FsNode[]): FsDir {
  const children: Record<string, FsNode> = {}
  for (const n of nodes) children[n.name] = n
  return { type: 'dir', name, children }
}

// ---------------------------------------------------------------------------
// Vychozi obsah
// ---------------------------------------------------------------------------

export function initialRoot(): FsDir {
  const zoo = dirOf('zoo', [
    dirOf('savci', [
      file('lev.txt', 'Panthera leo, 3 kusy, vybeh A'),
      file('slon.txt', 'Loxodonta africana, 2 kusy, vybeh B'),
      file('zebra.txt', 'Equus quagga, 5 kusu, vybeh B'),
    ]),
    dirOf('ptaci', [
      file('tucnak.txt', 'Pygoscelis papua, 12 kusu, bazen'),
      file('papousek.txt', 'Ara macao, 4 kusy, voliera'),
    ]),
    dirOf('plazi', [file('krokodyl.txt', 'Crocodylus niloticus, 1 kus, terarium')]),
    file('.skryty_plan.txt', 'Plan krmeni: 7:00 savci, 9:00 ptaci'),
    file('README.txt', 'Evidence zvirat v ZOO Plzen'),
  ])

  const student = dirOf('student', [
    zoo,
    dirOf('dokumenty', [file('smlouva.conf', 'typ=dodavka; krmivo=seno')]),
    file('.bashrc', '# nastaveni shellu'),
  ])

  return dirOf('', [
    dirOf('home', [student]),
    dirOf('etc', [
      file('hosts', '127.0.0.1 localhost'),
      file('passwd', 'root:x:0:0:root:/root:/bin/bash'),
      file('nginx.conf', 'worker_processes auto;'),
      file('ssh.conf', 'Port 22'),
    ]),
    dirOf('var', [dirOf('log', [file('syslog', 'system started')])]),
    dirOf('tmp', []),
    dirOf('usr', [dirOf('bin', []), dirOf('share', [])]),
  ])
}

export function initialFs(): FsState {
  return { root: initialRoot(), cwd: HOME, prevCwd: HOME }
}

// ---------------------------------------------------------------------------
// Prace s cestami
// ---------------------------------------------------------------------------

/** Normalizuje absolutni cestu - vyhodi `.`, zpracuje `..` a duplicitni lomitka. */
export function normalize(absPath: string): string {
  const parts = absPath.split('/')
  const out: string[] = []
  for (const part of parts) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      out.pop()
      continue
    }
    out.push(part)
  }
  return '/' + out.join('/')
}

/** Prevede libovolny zapis cesty (relativni, `~`, absolutni) na normalizovanou absolutni cestu. */
export function resolvePath(cwd: string, input: string): string {
  let p = input
  if (p === '~') p = HOME
  else if (p.startsWith('~/')) p = HOME + p.slice(1)
  if (!p.startsWith('/')) p = cwd + '/' + p
  return normalize(p)
}

/** Cesta rodicovskeho adresare. */
export function parentPath(absPath: string): string {
  const n = normalize(absPath)
  if (n === '/') return '/'
  const idx = n.lastIndexOf('/')
  return idx === 0 ? '/' : n.slice(0, idx)
}

/** Posledni segment cesty. */
export function baseName(absPath: string): string {
  const n = normalize(absPath)
  if (n === '/') return '/'
  return n.slice(n.lastIndexOf('/') + 1)
}

/** Zkrati cestu pro prompt: `/home/student/zoo` -> `~/zoo`. */
export function prettyPath(absPath: string): string {
  if (absPath === HOME) return '~'
  if (absPath.startsWith(HOME + '/')) return '~' + absPath.slice(HOME.length)
  return absPath
}

// ---------------------------------------------------------------------------
// Ctení stromu
// ---------------------------------------------------------------------------

/** Vrati uzel na dane absolutni ceste, nebo null. */
export function getNode(root: FsDir, absPath: string): FsNode | null {
  const n = normalize(absPath)
  if (n === '/') return root
  let cur: FsNode = root
  for (const part of n.split('/').slice(1)) {
    if (cur.type !== 'dir') return null
    const next: FsNode | undefined = cur.children[part]
    if (!next) return null
    cur = next
  }
  return cur
}

export function isDir(node: FsNode | null | undefined): node is FsDir {
  return !!node && node.type === 'dir'
}

export function isFile(node: FsNode | null | undefined): node is FsFile {
  return !!node && node.type === 'file'
}

export function exists(root: FsDir, absPath: string): boolean {
  return getNode(root, absPath) !== null
}

/** Serazena jmena polozek adresare - skryte (tecka) jen pokud `all`. */
export function listNames(node: FsDir, all: boolean): string[] {
  return Object.keys(node.children)
    .filter((name) => all || !name.startsWith('.'))
    .sort((a, b) => a.localeCompare(b, 'en'))
}

/** Hluboka kopie uzlu - pouziva se pri `cp -r` i pri zapisech. */
export function cloneNode<T extends FsNode>(node: T): T {
  if (node.type === 'file') return { ...node }
  const children: Record<string, FsNode> = {}
  for (const [k, v] of Object.entries(node.children)) children[k] = cloneNode(v)
  return { type: 'dir', name: node.name, children } as T
}

export function cloneRoot(root: FsDir): FsDir {
  return cloneNode(root)
}

// ---------------------------------------------------------------------------
// Zapisove operace - pracuji nad jiz naklonovanym rootem, vraci chybovou hlasku nebo null
// ---------------------------------------------------------------------------

/** Vlozi uzel do rodice na ceste. Vraci chybu jako string, nebo null pri uspechu. */
function attach(root: FsDir, absPath: string, node: FsNode): string | null {
  const parent = getNode(root, parentPath(absPath))
  if (!isDir(parent)) return 'No such file or directory'
  const name = baseName(absPath)
  parent.children[name] = { ...node, name } as FsNode
  return null
}

export function makeDir(root: FsDir, absPath: string, parents: boolean): string | null {
  if (parents) {
    let cur: FsDir = root
    for (const part of normalize(absPath).split('/').slice(1)) {
      const next: FsNode | undefined = cur.children[part]
      if (!next) {
        const created = dir(part)
        cur.children[part] = created
        cur = created
      } else if (next.type === 'dir') {
        cur = next
      } else {
        return `mkdir: cannot create directory '${absPath}': File exists`
      }
    }
    return null
  }

  if (exists(root, absPath)) {
    return `mkdir: cannot create directory '${baseName(absPath)}': File exists`
  }
  const parent = getNode(root, parentPath(absPath))
  if (!isDir(parent)) {
    return `mkdir: cannot create directory '${absPath}': No such file or directory`
  }
  parent.children[baseName(absPath)] = dir(baseName(absPath))
  return null
}

export function touchFile(root: FsDir, absPath: string): string | null {
  const existing = getNode(root, absPath)
  if (existing) return null // existujici soubor se nemeni
  const parent = getNode(root, parentPath(absPath))
  if (!isDir(parent)) return `touch: cannot touch '${absPath}': No such file or directory`
  parent.children[baseName(absPath)] = file(baseName(absPath), '')
  return null
}

export function writeFile(
  root: FsDir,
  absPath: string,
  text: string,
  append: boolean,
): string | null {
  const existing = getNode(root, absPath)
  if (existing && existing.type === 'dir') {
    return `bash: ${absPath}: Is a directory`
  }
  const parent = getNode(root, parentPath(absPath))
  if (!isDir(parent)) return `bash: ${absPath}: No such file or directory`
  const prev = existing && existing.type === 'file' && append ? existing.content : ''
  const content = prev === '' ? text : prev + text
  parent.children[baseName(absPath)] = file(baseName(absPath), content)
  return null
}

export function removeNode(root: FsDir, absPath: string, recursive: boolean): string | null {
  const node = getNode(root, absPath)
  if (!node) return `rm: cannot remove '${absPath}': No such file or directory`
  if (node.type === 'dir' && !recursive) {
    return `rm: cannot remove '${baseName(absPath)}': Is a directory`
  }
  const parent = getNode(root, parentPath(absPath))
  if (!isDir(parent)) return `rm: cannot remove '${absPath}': No such file or directory`
  delete parent.children[baseName(absPath)]
  return null
}

/**
 * Kopiruje zdroj do cile. Pokud je cil existujici adresar, kopiruje se dovnitr
 * pod puvodnim jmenem - stejne jako v realnem `cp`.
 */
export function copyNode(
  root: FsDir,
  srcAbs: string,
  dstAbs: string,
  recursive: boolean,
): string | null {
  const src = getNode(root, srcAbs)
  if (!src) return `cp: cannot stat '${srcAbs}': No such file or directory`
  if (src.type === 'dir' && !recursive) {
    return `cp: -r not specified; omitting directory '${baseName(srcAbs)}'`
  }
  const dstNode = getNode(root, dstAbs)
  const target = isDir(dstNode) ? normalize(dstAbs + '/' + baseName(srcAbs)) : dstAbs
  if (normalize(target) === normalize(srcAbs)) {
    return `cp: '${srcAbs}' and '${target}' are the same file`
  }
  return attach(root, target, cloneNode(src)) === null
    ? null
    : `cp: cannot create '${target}': No such file or directory`
}

/** Presun nebo prejmenovani. */
export function moveNode(root: FsDir, srcAbs: string, dstAbs: string): string | null {
  const src = getNode(root, srcAbs)
  if (!src) return `mv: cannot stat '${srcAbs}': No such file or directory`
  const dstNode = getNode(root, dstAbs)
  const target = isDir(dstNode) ? normalize(dstAbs + '/' + baseName(srcAbs)) : dstAbs
  if (normalize(target) === normalize(srcAbs)) return null
  if (normalize(target).startsWith(normalize(srcAbs) + '/')) {
    return `mv: cannot move '${srcAbs}' to a subdirectory of itself, '${target}'`
  }
  const copy = cloneNode(src)
  const err = attach(root, target, copy)
  if (err) return `mv: cannot move '${srcAbs}' to '${target}': ${err}`
  const parent = getNode(root, parentPath(srcAbs))
  if (isDir(parent)) delete parent.children[baseName(srcAbs)]
  return null
}

// ---------------------------------------------------------------------------
// find / du
// ---------------------------------------------------------------------------

/** Prevede zastupne znaky `*` a `?` na regularni vyraz. */
export function globToRegExp(pattern: string): RegExp {
  let out = '^'
  for (const ch of pattern) {
    if (ch === '*') out += '.*'
    else if (ch === '?') out += '.'
    else out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(out + '$')
}

export type FindFilter = { name?: string; typeOf?: 'f' | 'd' }

/** Rekurzivni pruchod od `absPath` vcetne, v poradi jako realny `find`. */
export function findPaths(root: FsDir, absPath: string, filter: FindFilter): string[] {
  const start = getNode(root, absPath)
  if (!start) return []
  const re = filter.name ? globToRegExp(filter.name) : null
  const out: string[] = []

  const walk = (node: FsNode, path: string) => {
    const matchesType =
      !filter.typeOf || (filter.typeOf === 'f' ? node.type === 'file' : node.type === 'dir')
    const matchesName = !re || re.test(baseName(path) === '/' ? '' : baseName(path))
    if (matchesType && matchesName) out.push(path)
    if (node.type === 'dir') {
      for (const name of Object.keys(node.children).sort((a, b) => a.localeCompare(b, 'en'))) {
        walk(node.children[name], path === '/' ? '/' + name : path + '/' + name)
      }
    }
  }

  walk(start, normalize(absPath))
  return out
}

const BLOCK = 4096

/** Velikost uzlu v bajtech po blocich - stejny princip jako realne `du`. */
export function diskUsage(node: FsNode): number {
  if (node.type === 'file') {
    return Math.max(BLOCK, Math.ceil(node.size / BLOCK) * BLOCK)
  }
  let total = BLOCK
  for (const child of Object.values(node.children)) total += diskUsage(child)
  return total
}
