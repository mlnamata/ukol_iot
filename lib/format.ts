// Formatovani vystupu prikazu - ls -l, du -h, tree. Ciste funkce.

import { FsDir, FsNode, MTIME, diskUsage, listNames } from './fs'

/** Prava souboru/adresare - simulace, vzdy stejna. */
export function permissions(node: FsNode): string {
  return node.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--'
}

/** Pocet odkazu jako v `ls -l`: adresar = 2 + pocet podadresaru, soubor = 1. */
function linkCount(node: FsNode): number {
  if (node.type === 'file') return 1
  return 2 + Object.values(node.children).filter((c) => c.type === 'dir').length
}

function displaySize(node: FsNode): number {
  return node.type === 'dir' ? 4096 : node.size
}

export type LsRow = { text: string; isDir: boolean }

/** Dlouhy vypis `ls -l`, zarovnany do sloupcu. */
export function formatLsLong(parent: FsDir, names: string[]): LsRow[] {
  const nodes = names.map((n) => parent.children[n])
  const sizeWidth = Math.max(1, ...nodes.map((n) => String(displaySize(n)).length))
  const linkWidth = Math.max(1, ...nodes.map((n) => String(linkCount(n)).length))
  return names.map((name, i) => {
    const node = nodes[i]
    const size = String(displaySize(node)).padStart(sizeWidth)
    const links = String(linkCount(node)).padStart(linkWidth)
    return {
      text: `${permissions(node)} ${links} student student ${size} ${MTIME} ${name}`,
      isDir: node.type === 'dir',
    }
  })
}

/** Kratky vypis - polozky do sloupcu oddelenych mezerami. */
export function formatLsShort(parent: FsDir, names: string[]): LsRow[] {
  return names.map((name) => ({ text: name, isDir: parent.children[name].type === 'dir' }))
}

/** Bajty do citelneho tvaru jako `du -h` / `df -h`. */
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}`
  const units = ['K', 'M', 'G', 'T']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  const rounded = value >= 10 ? Math.round(value).toString() : value.toFixed(1)
  return `${rounded}${units[unit]}`
}

export function formatDu(node: FsNode, label: string): string {
  return `${humanSize(diskUsage(node))}\t${label}`
}

/** ASCII strom vcetne poctu adresaru a souboru na konci. */
export function formatTree(node: FsNode, label: string, showHidden = false): string[] {
  const lines: string[] = [label]
  let dirs = 0
  let files = 0

  const walk = (current: FsNode, prefix: string) => {
    if (current.type !== 'dir') return
    const names = listNames(current, showHidden)
    names.forEach((name, i) => {
      const child = current.children[name]
      const last = i === names.length - 1
      lines.push(`${prefix}${last ? '└── ' : '├── '}${name}`)
      if (child.type === 'dir') {
        dirs++
        walk(child, prefix + (last ? '    ' : '│   '))
      } else {
        files++
      }
    })
  }

  walk(node, '')
  lines.push('')
  lines.push(`${dirs} directories, ${files} files`)
  return lines
}

/** Staticky smysleny vystup `df -h`. */
export function formatDf(): string[] {
  return [
    'Filesystem      Size  Used Avail Use% Mounted on',
    '/dev/sda1        20G  7,2G   12G  39% /',
    'tmpfs           2,0G     0  2,0G   0% /dev/shm',
    '/dev/sdb1       100G   42G   54G  44% /home',
  ]
}
