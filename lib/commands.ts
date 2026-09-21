// Parser prikazove radky + jeden handler na kazdy prikaz. Ciste funkce bez Reactu.

import {
  FsDir,
  FsState,
  HOME,
  baseName,
  cloneRoot,
  copyNode,
  diskUsage,
  findPaths,
  getNode,
  isDir,
  listNames,
  makeDir,
  moveNode,
  normalize,
  parentPath,
  prettyPath,
  removeNode,
  resolvePath,
  touchFile,
  writeFile,
} from './fs'
import { formatDf, formatDu, formatLsLong, formatLsShort, formatTree } from './format'

export type SegKind = 'out' | 'err' | 'dir' | 'prompt'
export type Seg = { text: string; kind: SegKind }
export type OutLine = { segs: Seg[] }

export type ExecResult = {
  state: FsState
  lines: OutLine[]
  error: boolean
  /** Prikaz `clear` / Ctrl+L - smaz vystup. */
  clear: boolean
  /** Prikaz `reset` - UI se zepta na potvrzeni. */
  askReset: boolean
}

export const COMMANDS = [
  'pwd',
  'ls',
  'cd',
  'mkdir',
  'touch',
  'cat',
  'echo',
  'cp',
  'mv',
  'rm',
  'find',
  'du',
  'df',
  'tree',
  'clear',
  'help',
  'reset',
] as const

// ---------------------------------------------------------------------------
// Pomocne funkce pro vystup
// ---------------------------------------------------------------------------

const out = (text: string): OutLine => ({ segs: [{ text, kind: 'out' }] })
const err = (text: string): OutLine => ({ segs: [{ text, kind: 'err' }] })

function ok(state: FsState, lines: OutLine[] = []): ExecResult {
  return { state, lines, error: false, clear: false, askReset: false }
}

function fail(state: FsState, message: string): ExecResult {
  return { state, lines: [err(message)], error: true, clear: false, askReset: false }
}

/** Bash rozbali `~` jeste pred spustenim prikazu - vystup proto ukazuje plnou cestu. */
function displayPath(raw: string): string {
  if (raw === '~') return HOME
  if (raw.startsWith('~/')) return HOME + raw.slice(1)
  return raw
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export type Token = { value: string; quoted: boolean }
export type ParsedCommand = {
  name: string
  args: Token[]
  /** Cil presmerovani, pokud je v radku `>` nebo `>>`. */
  redirect: { target: string; append: boolean } | null
}

/** Rozdeli radek na tokeny - respektuje uvozovky a operatory `>` / `>>`. */
export function tokenize(input: string): { tokens: Token[]; ops: { index: number; append: boolean }[] } {
  const tokens: Token[] = []
  const ops: { index: number; append: boolean }[] = []
  let current = ''
  let quoted = false
  let hasCurrent = false
  let quote: '"' | "'" | null = null

  const push = () => {
    if (hasCurrent) {
      tokens.push({ value: current, quoted })
      current = ''
      quoted = false
      hasCurrent = false
    }
  }

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quote) {
      if (ch === quote) quote = null
      else {
        current += ch
        hasCurrent = true
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      quoted = true
      hasCurrent = true
      continue
    }
    if (ch === ' ' || ch === '\t') {
      push()
      continue
    }
    if (ch === '>') {
      push()
      const append = input[i + 1] === '>'
      if (append) i++
      ops.push({ index: tokens.length, append })
      continue
    }
    current += ch
    hasCurrent = true
  }
  push()
  return { tokens, ops }
}

export function parse(input: string): ParsedCommand | null {
  const { tokens, ops } = tokenize(input)
  if (tokens.length === 0) return null
  let redirect: ParsedCommand['redirect'] = null
  let args = tokens.slice(1)

  if (ops.length > 0) {
    const op = ops[ops.length - 1]
    const targetToken = tokens[op.index]
    redirect = { target: targetToken ? targetToken.value : '', append: op.append }
    args = tokens.slice(1, op.index)
  }

  return { name: tokens[0].value, args, redirect }
}

/** Rozdeli argumenty na prepinace (`-la` -> `l`,`a`) a operandy. */
function splitFlags(args: Token[]): { flags: Set<string>; words: Token[]; longFlags: string[] } {
  const flags = new Set<string>()
  const longFlags: string[] = []
  const words: Token[] = []
  for (const a of args) {
    if (!a.quoted && a.value.startsWith('--') && a.value.length > 2) {
      longFlags.push(a.value.slice(2))
    } else if (!a.quoted && a.value.startsWith('-') && a.value.length > 1) {
      for (const ch of a.value.slice(1)) flags.add(ch)
    } else {
      words.push(a)
    }
  }
  return { flags, words, longFlags }
}

// ---------------------------------------------------------------------------
// Hlavni vstupni bod
// ---------------------------------------------------------------------------

export function execute(state: FsState, input: string): ExecResult {
  const parsed = parse(input)
  if (!parsed) return ok(state)

  const result = dispatch(state, parsed)

  // Presmerovani do souboru - vystup se misto na obrazovku zapise do souboru.
  if (parsed.redirect && !result.error) {
    if (!parsed.redirect.target) return fail(state, 'bash: syntax error near unexpected token `newline\'')
    const text = result.lines.map((l) => l.segs.map((s) => s.text).join('')).join('\n')
    const root = cloneRoot(result.state.root)
    const abs = resolvePath(result.state.cwd, parsed.redirect.target)
    const writeErr = writeFile(root, abs, text === '' ? '' : text + '\n', parsed.redirect.append)
    if (writeErr) return fail(state, writeErr)
    return ok({ ...result.state, root })
  }

  return result
}

function dispatch(state: FsState, cmd: ParsedCommand): ExecResult {
  switch (cmd.name) {
    case 'pwd':
      return cmdPwd(state)
    case 'ls':
      return cmdLs(state, cmd.args)
    case 'cd':
      return cmdCd(state, cmd.args)
    case 'mkdir':
      return cmdMkdir(state, cmd.args)
    case 'touch':
      return cmdTouch(state, cmd.args)
    case 'cat':
      return cmdCat(state, cmd.args)
    case 'echo':
      return cmdEcho(state, cmd.args)
    case 'cp':
      return cmdCp(state, cmd.args)
    case 'mv':
      return cmdMv(state, cmd.args)
    case 'rm':
      return cmdRm(state, cmd.args)
    case 'find':
      return cmdFind(state, cmd.args)
    case 'du':
      return cmdDu(state, cmd.args)
    case 'df':
      return ok(state, formatDf().map(out))
    case 'tree':
      return cmdTree(state, cmd.args)
    case 'clear':
      return { state, lines: [], error: false, clear: true, askReset: false }
    case 'help':
      return cmdHelp(state)
    case 'reset':
      return { state, lines: [], error: false, clear: false, askReset: true }
    default:
      return fail(state, `bash: ${cmd.name}: command not found`)
  }
}

// ---------------------------------------------------------------------------
// Jednotlive prikazy
// ---------------------------------------------------------------------------

function cmdPwd(state: FsState): ExecResult {
  return ok(state, [out(state.cwd)])
}

/** Radky vypisu jednoho adresare - kratky nebo dlouhy format. */
function renderDir(state: FsState, node: FsDir, abs: string, all: boolean, long: boolean): OutLine[] {
  const lines: OutLine[] = []
  const names = listNames(node, all)
  if (all) names.unshift('.', '..')

  if (long) {
    const parent = getNode(state.root, parentPath(abs))
    const withDots: FsDir = {
      type: 'dir',
      name: node.name,
      children: { ...node.children, '.': node, '..': isDir(parent) ? parent : node },
    }
    const rows = formatLsLong(all ? withDots : node, names)
    lines.push(out(`total ${Math.max(4, names.length * 4)}`))
    rows.forEach((r) => {
      const cut = r.text.lastIndexOf(' ') + 1
      lines.push({
        segs: [
          { text: r.text.slice(0, cut), kind: 'out' },
          { text: r.text.slice(cut), kind: r.isDir ? 'dir' : 'out' },
        ],
      })
    })
    return lines
  }

  if (names.length > 0) {
    const segs: Seg[] = []
    names.forEach((name, i) => {
      if (i > 0) segs.push({ text: '  ', kind: 'out' })
      const isDirEntry = name === '.' || name === '..' || node.children[name]?.type === 'dir'
      segs.push({ text: name, kind: isDirEntry ? 'dir' : 'out' })
    })
    lines.push({ segs })
  }
  return lines
}

function cmdLs(state: FsState, args: Token[]): ExecResult {
  const { flags, words } = splitFlags(args)
  const all = flags.has('a')
  const long = flags.has('l')
  const recursive = flags.has('R')
  const targets = words.length > 0 ? words.map((w) => w.value) : ['.']
  const lines: OutLine[] = []
  let hadError = false

  targets.forEach((target, idx) => {
    const abs = resolvePath(state.cwd, target)
    const node = getNode(state.root, abs)
    if (!node) {
      lines.push(err(`ls: cannot access '${target}': No such file or directory`))
      hadError = true
      return
    }
    if (targets.length > 1 && !recursive) {
      if (idx > 0) lines.push(out(''))
      lines.push(out(`${target}:`))
    }
    if (node.type === 'file') {
      const pseudo: FsDir = { type: 'dir', name: '', children: { [node.name]: node } }
      const rows = long ? formatLsLong(pseudo, [node.name]) : formatLsShort(pseudo, [node.name])
      rows.forEach((r) => lines.push(out(r.text)))
      return
    }

    if (recursive) {
      // `ls -R` vypise kazdy adresar zvlast, oddelene prazdnym radkem.
      const label = target === '.' ? '.' : displayPath(target).replace(/\/$/, '')
      const walk = (dirNode: FsDir, dirAbs: string, dirLabel: string, first: boolean) => {
        if (!first) lines.push(out(''))
        lines.push(out(`${dirLabel}:`))
        lines.push(...renderDir(state, dirNode, dirAbs, all, long))
        for (const name of listNames(dirNode, all)) {
          const child = dirNode.children[name]
          if (child.type === 'dir') {
            walk(child, `${dirAbs}/${name}`, `${dirLabel}/${name}`, false)
          }
        }
      }
      walk(node, abs, label, idx === 0)
      return
    }

    lines.push(...renderDir(state, node, abs, all, long))
  })

  return { state, lines, error: hadError, clear: false, askReset: false }
}

function cmdCd(state: FsState, args: Token[]): ExecResult {
  const { words } = splitFlags(args)
  const target = words.length === 0 ? '~' : words[0].value

  if (target === '-') {
    const next = state.prevCwd
    return ok({ ...state, cwd: next, prevCwd: state.cwd }, [out(next)])
  }

  const abs = resolvePath(state.cwd, target)
  const node = getNode(state.root, abs)
  if (!node) return fail(state, `bash: cd: ${target}: No such file or directory`)
  if (node.type === 'file') return fail(state, `bash: cd: ${target}: Not a directory`)
  return ok({ ...state, cwd: abs, prevCwd: state.cwd })
}

function cmdMkdir(state: FsState, args: Token[]): ExecResult {
  const { flags, words, longFlags } = splitFlags(args)
  if (words.length === 0) return fail(state, 'mkdir: missing operand')
  const parents = flags.has('p') || longFlags.includes('parents')
  const root = cloneRoot(state.root)
  for (const w of words) {
    const message = makeDir(root, resolvePath(state.cwd, w.value), parents)
    if (message) return fail(state, message.replace(/'\/[^']*'/, `'${w.value}'`))
  }
  return ok({ ...state, root })
}

function cmdTouch(state: FsState, args: Token[]): ExecResult {
  const { words } = splitFlags(args)
  if (words.length === 0) return fail(state, 'touch: missing file operand')
  const root = cloneRoot(state.root)
  for (const w of words) {
    const message = touchFile(root, resolvePath(state.cwd, w.value))
    if (message) return fail(state, `touch: cannot touch '${w.value}': No such file or directory`)
  }
  return ok({ ...state, root })
}

function cmdCat(state: FsState, args: Token[]): ExecResult {
  const { words } = splitFlags(args)
  if (words.length === 0) return fail(state, 'cat: missing operand')
  const lines: OutLine[] = []
  let hadError = false
  for (const w of words) {
    const node = getNode(state.root, resolvePath(state.cwd, w.value))
    if (!node) {
      lines.push(err(`cat: ${w.value}: No such file or directory`))
      hadError = true
    } else if (node.type === 'dir') {
      lines.push(err(`cat: ${w.value}: Is a directory`))
      hadError = true
    } else if (node.content !== '') {
      // Koncovy newline je oddelovac posledniho radku, ne prazdny radek navic.
      node.content.replace(/\n$/, '').split('\n').forEach((l) => lines.push(out(l)))
    }
  }
  return { state, lines, error: hadError, clear: false, askReset: false }
}

function cmdEcho(state: FsState, args: Token[]): ExecResult {
  return ok(state, [out(args.map((a) => a.value).join(' '))])
}

function cmdCp(state: FsState, args: Token[]): ExecResult {
  const { flags, words } = splitFlags(args)
  if (words.length < 2) return fail(state, 'cp: missing destination file operand')
  const recursive = flags.has('r') || flags.has('R')
  const root = cloneRoot(state.root)
  const dst = words[words.length - 1].value
  for (const src of words.slice(0, -1)) {
    const message = copyNode(
      root,
      resolvePath(state.cwd, src.value),
      resolvePath(state.cwd, dst),
      recursive,
    )
    if (message) return fail(state, message.replace(/'\/[^']*'/, `'${src.value}'`))
  }
  return ok({ ...state, root })
}

function cmdMv(state: FsState, args: Token[]): ExecResult {
  const { words } = splitFlags(args)
  if (words.length < 2) return fail(state, 'mv: missing destination file operand')
  const root = cloneRoot(state.root)
  const dst = words[words.length - 1].value
  for (const src of words.slice(0, -1)) {
    const message = moveNode(root, resolvePath(state.cwd, src.value), resolvePath(state.cwd, dst))
    if (message) return fail(state, message.replace(/'\/[^']*'/, `'${src.value}'`))
  }
  return ok({ ...state, root })
}

function cmdRm(state: FsState, args: Token[]): ExecResult {
  const { flags, words } = splitFlags(args)
  const recursive = flags.has('r') || flags.has('R')
  const force = flags.has('f')
  if (words.length === 0) {
    return force ? ok(state) : fail(state, 'rm: missing operand')
  }
  const root = cloneRoot(state.root)
  for (const w of words) {
    const abs = resolvePath(state.cwd, w.value)
    if (abs === '/' || abs === HOME) return fail(state, `rm: refusing to remove '${w.value}'`)
    const message = removeNode(root, abs, recursive)
    if (message) {
      if (force && message.includes('No such file')) continue
      return fail(state, message.replace(/'\/[^']*'/, `'${w.value}'`))
    }
  }
  return ok({ ...state, root })
}

function cmdFind(state: FsState, args: Token[]): ExecResult {
  const plain = args.map((a) => a.value)
  const start = plain.length > 0 && !plain[0].startsWith('-') ? plain[0] : '.'
  let name: string | undefined
  let typeOf: 'f' | 'd' | undefined

  for (let i = 0; i < plain.length; i++) {
    if (plain[i] === '-name' && plain[i + 1] !== undefined) name = plain[++i]
    else if (plain[i] === '-type' && plain[i + 1] !== undefined) {
      const t = plain[++i]
      if (t !== 'f' && t !== 'd') return fail(state, `find: Unknown argument to -type: ${t}`)
      typeOf = t
    }
  }

  const abs = resolvePath(state.cwd, start)
  if (!getNode(state.root, abs)) {
    return fail(state, `find: '${start}': No such file or directory`)
  }

  const prefix = normalize(abs)
  const found = findPaths(state.root, abs, { name, typeOf })
  const label = displayPath(start).replace(/\/$/, '')
  const lines = found.map((p) => {
    const rel = p === prefix ? '' : p.slice(prefix.length)
    return out(label + rel)
  })
  return ok(state, lines)
}

function cmdDu(state: FsState, args: Token[]): ExecResult {
  const { flags, words } = splitFlags(args)
  const summarize = flags.has('s')
  const targets = words.length > 0 ? words.map((w) => w.value) : ['.']
  const lines: OutLine[] = []
  let hadError = false

  for (const target of targets) {
    const abs = resolvePath(state.cwd, target)
    const node = getNode(state.root, abs)
    if (!node) {
      lines.push(err(`du: cannot access '${target}': No such file or directory`))
      hadError = true
      continue
    }
    if (!summarize && node.type === 'dir') {
      // Vypis i pro podadresare, zezdola nahoru.
      const walk = (n: FsDir, label: string) => {
        for (const childName of listNames(n, true)) {
          const child = n.children[childName]
          if (child.type === 'dir') walk(child, `${label}/${childName}`)
        }
        lines.push(out(formatDu(n, label)))
      }
      walk(node, displayPath(target).replace(/\/$/, ''))
    } else {
      lines.push(out(formatDu(node, displayPath(target).replace(/\/$/, ''))))
    }
  }
  return { state, lines, error: hadError, clear: false, askReset: false }
}

function cmdTree(state: FsState, args: Token[]): ExecResult {
  const { flags, words } = splitFlags(args)
  const target = words.length > 0 ? words[0].value : '.'
  const abs = resolvePath(state.cwd, target)
  const node = getNode(state.root, abs)
  if (!node) return fail(state, `${target} [error opening dir]`)
  const label = target === '.' ? '.' : displayPath(target)
  return ok(state, formatTree(node, label, flags.has('a')).map(out))
}

function cmdHelp(state: FsState): ExecResult {
  const rows: string[] = [
    'Dostupne prikazy:',
    '',
    '  pwd                      vypise aktualni adresar',
    '  ls [-l] [-a] [-R] [cesta] vypis obsahu adresare, -R i podadresare',
    '  cd [cesta|..|~|-]        zmena adresare',
    '  mkdir [-p] adresar       vytvoreni adresare',
    '  touch soubor             vytvoreni prazdneho souboru',
    '  cat soubor               vypis obsahu souboru',
    '  echo "text" > soubor     zapis do souboru (>> pripoji)',
    '  cp [-r] zdroj cil        kopirovani',
    '  mv zdroj cil             presun nebo prejmenovani',
    '  rm [-r] [-f] cesta       smazani',
    '  find cesta -name "vzor"  hledani (lze i -type f / -type d)',
    '  du [-s] [-h] cesta       velikost adresare',
    '  df -h                    volne misto na disku',
    '  tree [cesta]             strom adresaru',
    '  clear                    vycisti obrazovku (Ctrl+L)',
    '  reset                    vrati vse do vychoziho stavu',
    '  help                     tento vypis',
    '',
    'Tip: sipky nahoru/dolu prochazi historii, Tab doplnuje nazvy.',
  ]
  return ok(state, rows.map(out))
}

// ---------------------------------------------------------------------------
// Doplnovani tabulatorem
// ---------------------------------------------------------------------------

/** Vrati kandidaty na doplneni posledniho slova radky. */
export function completions(state: FsState, input: string): { prefix: string; matches: string[] } {
  const lastSpace = input.lastIndexOf(' ')
  const word = lastSpace === -1 ? input : input.slice(lastSpace + 1)

  if (lastSpace === -1) {
    return { prefix: word, matches: COMMANDS.filter((c) => c.startsWith(word)).map(String) }
  }

  const slash = word.lastIndexOf('/')
  const dirPart = slash === -1 ? '.' : word.slice(0, slash + 1)
  const namePart = slash === -1 ? word : word.slice(slash + 1)
  const node = getNode(state.root, resolvePath(state.cwd, dirPart))
  if (!isDir(node)) return { prefix: word, matches: [] }

  const matches = listNames(node, namePart.startsWith('.'))
    .filter((n) => n.startsWith(namePart))
    .map((n) => (slash === -1 ? '' : dirPart) + n + (node.children[n].type === 'dir' ? '/' : ''))

  return { prefix: word, matches }
}

/** Retezec promptu pro aktualni adresar. */
export function promptFor(state: FsState): string {
  return `student@zoo:${prettyPath(state.cwd)}$`
}

export { baseName, diskUsage }
