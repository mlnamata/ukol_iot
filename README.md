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

`pwd`, `ls` (`-l`, `-a`, `-la`, `-R`), `cd` (`..`, `~`, `-`, absolutní i relativní cesty),
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

## Přeskočení cvičení

Když si student neví rady, může aktuální cvičení tlačítkem **Přeskočit (bez bodů)**
označit jako vyřízené a pokračovat dál. Přeskočené cvičení se do bodů nezapočítá a
v panelu je označené štítkem „přeskočeno, 0 b".

Kontrola ale běží dál — pokud ho student později přesto splní, přeskočení se zruší
a body se mu připíšou.

## Klávesové zkratky v terminálu

| Zkratka | Akce |
| --- | --- |
| `↑` / `↓` | procházení historie příkazů |
| `Tab` | doplnění názvu souboru nebo adresáře |
| `Ctrl+L` | vyčištění obrazovky |
| `Ctrl+C` | zrušení rozepsaného řádku |

## Cvičení

Aplikace kopíruje postup, kterým skupina látku prezentuje. Šest cvičení, každé za 5 bodů:

| # | Cvičení | Příkazy |
| --- | --- | --- |
| 1 | Kde jsme a co tu je | `pwd`, `ls`, `ls -la` |
| 2 | Struktura ZOO jedním příkazem | `mkdir -p zoo/pavilon_selem zoo/pavilon_ptaku`, `ls -R` |
| 3 | Vytvoření, kopírování a přejmenování | `cd zoo/pavilon_selem`, `touch zvirata.txt`, `cp zvirata.txt ../pavilon_ptaku/`, `mv zvirata.txt lev.txt`, `ls -l` |
| 4 | Hledání souboru | `cd ../..`, `find zoo -name "lev.txt"` |
| 5 | Velikost složky a místo na disku | `du -sh zoo`, `df -h` |
| 6 | Mazání souboru a složky | `rm zoo/pavilon_ptaku/zvirata.txt`, `rm -r zoo` |

Příkazy jsou u každého cvičení přímo v panelu, takže se dají při prezentaci rovnou
přepisovat. Tlačítko **Vysvětlení** rozbalí, co jednotlivé příkazy dělají.

Domovský adresář je záměrně skoro prázdný — složku `zoo` si student staví sám ve
cvičení 2, aby `find zoo -name "lev.txt"` našel právě jeden soubor.

## Jak přidat vlastní cvičení

Cvičení jsou obyčejné pole v `lib/tasks.ts`. Nové cvičení = nový objekt v poli `TASKS`.
Celkový počet bodů (`TOTAL_POINTS`) se dopočítá sám, takže počítadlo i progress bar
se přizpůsobí.

```ts
// lib/tasks.ts
{
  id: 'cv7',
  title: 'Přesun celé složky',
  intro: 'Ukážeme si, že mv umí nejen přejmenovat, ale i přesunout celou složku.',
  commands: ['mkdir -p zoo/karantena', 'mv zoo/karantena zoo/pavilon_selem/'],
  explanation: [
    'mkdir vytvoří složku karantena uvnitř zoo.',
    'mv ji přesune pod pavilon šelem — stejný příkaz jako u přejmenování, jen cíl je složka.',
  ],
  points: 5,
  check: (root) => isDir(getNode(root, '/home/student/zoo/pavilon_selem/karantena')),
}
```

### Dvě cesty, jak cvičení ověřit

`check(root, history)` dostane kořen souborového systému **a** historii příkazů:

- **Podle stavu souborového systému** — zajímá tě výsledek. Použij `getNode`, `isDir`,
  `isFile` z `lib/fs.ts`.
- **Podle historie příkazů** — zajímá tě, že student příkaz skutečně *použil*, i když po
  něm nezůstane stopa (`pwd`, `ls`, `find`, `du`, `df`). K tomu slouží pomocné funkce
  `ranOk`, `ranWithFlags` a `ranOnPath` přímo v `lib/tasks.ts`; započítávají se jen
  příkazy, které proběhly bez chyby.

Funkce musí být **čistá a rychlá** — volá se po každém stisku Enter. Jakmile jednou vrátí
`true`, cvičení zůstane splněné natrvalo.

## Přizpůsobení souborového systému

Výchozí obsah je v `initialRoot()` v `lib/fs.ts`, složený z pomocných funkcí
`dir(jmeno, deti)` a `file(jmeno, obsah)`. Velikost souboru se dopočítá sama z délky obsahu.

> Pozn.: Texty uvnitř simulovaného terminálu (obsah souborů, nápovědy `help`, chybové hlášky)
> jsou schválně **bez diakritiky** — chovají se jako reálný Linux. UI okolo terminálu
> je česky s diakritikou.
