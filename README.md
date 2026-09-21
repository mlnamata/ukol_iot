# ZOO Terminál — webový simulátor Linuxového terminálu

Výukový simulátor Linuxového terminálu na téma ZOO. Student plní třídílné zadání
psaním **skutečných Linuxových příkazů**; aplikace si drží virtuální souborový systém
v paměti, příkazy vyhodnocuje a po každém z nich automaticky kontroluje splnění kroků.

Vše běží **výhradně v prohlížeči** — žádný backend, žádná databáze. Po `npm run build`
a `npm start` funguje i bez připojení k internetu.

## Spuštění

```bash
npm install
npm run dev
```

Aplikace poběží na <http://localhost:3000>.

Produkční build:

```bash
npm run build
npm start
```

## Jak to funguje

| Vrstva | Soubor | Popis |
| --- | --- | --- |
| Souborový systém | `lib/fs.ts` | Typy `FsNode`, výchozí strom, `resolvePath`, `mkdir`/`cp`/`mv`/`rm`/`find`/`du` |
| Příkazy | `lib/commands.ts` | Parser (uvozovky, přepínače, `>` a `>>`) + jeden handler na příkaz |
| Zadání | `lib/tasks.ts` | Tři kroky včetně `check(root, history)` |
| Formátování | `lib/format.ts` | `ls -l`, `du -h`, `tree`, `df -h` |
| UI | `app/page.tsx`, `components/*` | Stav přes `useReducer`, terminál, panel zadání, modal se stromem |

`lib/fs.ts`, `lib/commands.ts`, `lib/tasks.ts` a `lib/format.ts` jsou **čisté funkce bez Reactu** —
jdou testovat samostatně bez DOM.

### Uložení postupu

Stav (souborový systém, výpis terminálu, historie, splněné kroky, stopky) se průběžně ukládá
do `localStorage` pod klíčem `zoo-terminal-state`. Po refreshi student pokračuje tam, kde skončil.
`Reset` klíč smaže. Pokud `localStorage` není k dispozici (privátní režim, zakázaná data webu),
aplikace funguje dál — jen bez ukládání.

## Podporované příkazy

`pwd`, `ls` (`-l`, `-a`, `-la`), `cd` (`..`, `~`, `-`, absolutní i relativní cesty),
`mkdir` (`-p`), `touch`, `cat`, `echo` s `>` a `>>`, `cp` (`-r`), `mv`, `rm` (`-r`, `-f`),
`find <cesta> -name "<vzor>"` (`*`, `?`) a `-type f|d`, `du` (`-s`, `-h`), `df -h`,
`tree`, `clear`, `help`, `reset`.

Chybové hlášky kopírují reálný bash, např.:

```
mkdir: cannot create directory 'x/y': No such file or directory
cp: -r not specified; omitting directory 'savci'
rm: cannot remove 'savci': Is a directory
bash: neco: command not found
```

## Klávesové zkratky v terminálu

| Zkratka | Akce |
| --- | --- |
| `↑` / `↓` | procházení historie příkazů |
| `Tab` | doplnění názvu souboru nebo adresáře |
| `Ctrl+L` | vyčištění obrazovky |
| `Ctrl+C` | zrušení rozepsaného řádku |

## Jak přidat vlastní čtvrtý krok

Kroky jsou obyčejné pole v `lib/tasks.ts`. Nový krok = nový objekt v poli `TASKS`.
Body se do celkového součtu (`TOTAL_POINTS`) sečtou samy, progress bar i počítadlo
`X / Y` se přizpůsobí — nikde jinde nic měnit nemusíš.

```ts
// lib/tasks.ts
export const TASKS: Task[] = [
  // ...stávající tři kroky...
  {
    id: 'krok4',
    title: 'Krmivo',
    bullets: [
      'Vytvor adresar ~/zoo/krmivo.',
      'Do nej zkopiruj ~/dokumenty/smlouva.conf.',
    ],
    points: 5,
    // Napoveda navadi na spravny prepinac, neprozradi hotovy prikaz.
    hint: 'Adresar vytvoris pres mkdir, kopirovani souboru zvladne cp bez prepinacu.',
    check: (root) => {
      const krmivo = getNode(root, '/home/student/zoo/krmivo')
      return isDir(krmivo) && isFile(krmivo.children['smlouva.conf'])
    },
  },
]
```

### Dva způsoby kontroly

`check(root, history)` dostane kořen souborového systému **a** historii příkazů:

- **Podle stavu souborového systému** (kroky 1 a 2) — zajímá tě jen výsledek.
  Používej `getNode`, `isDir`, `isFile` z `lib/fs.ts`.
- **Podle historie příkazů** (krok 3) — zajímá tě, že student příkaz skutečně
  *použil*, i když po něm nezůstane stopa (`find`, `du`, `ls`). Každý záznam historie
  má `command`, `cwd` a `error`; příkaz rozebereš funkcí `parse()` z `lib/commands.ts`
  a započítáš jen ty s `error === false`.

Funkce musí být **čistá a rychlá** — volá se po každém stisku Enter. Jakmile jednou vrátí
`true`, krok zůstane odškrtnutý natrvalo.

## Přizpůsobení souborového systému

Výchozí obsah je v `initialRoot()` v `lib/fs.ts`, složený z pomocných funkcí
`dir(jmeno, deti)` a `file(jmeno, obsah)`. Velikost souboru se dopočítá sama z délky obsahu.

> Pozn.: Texty uvnitř simulovaného terminálu (obsah souborů, nápovědy `help`, chybové hlášky)
> jsou schválně **bez diakritiky** — chovají se jako reálný Linux. UI okolo terminálu
> je česky s diakritikou.
